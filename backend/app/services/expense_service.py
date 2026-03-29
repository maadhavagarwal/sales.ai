"""
Expense Management & GST Compliance Service
Handles expense uploads, parsing, categorization, and GST reconciliation
"""

import io
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from app.core.database_manager import get_db_connection


class ExpenseService:
   

    def __init__(self):
        self.db_conn, self.db_type = get_db_connection()

    @staticmethod
    def _get_gst_rate_for_category(category: str) -> Tuple[float, str]:
        """
        Get GST rate and liability type based on expense category.
        Returns (gst_rate, expense_type)
        expense_type: 'INPUT' (eligible for ITC) or 'NON-INPUT'
        """
        gst_mapping = {
            "office supplies": (5.0, "INPUT"),
            "electricity": (5.0, "INPUT"),
            "water": (5.0, "INPUT"),
            "internet": (18.0, "INPUT"),
            "telephone": (18.0, "INPUT"),
            "rent": (0.0, "NON-INPUT"),  # Exempt if landlord not registered
            "insurance": (0.0, "NON-INPUT"),  # Exempt
            "meals": (5.0, "NON-INPUT"),  # ITC restricted for meals
            "travel": (5.0, "INPUT"),
            "fuel": (5.0, "INPUT"),
            "maintenance": (18.0, "INPUT"),
            "repairs": (18.0, "INPUT"),
            "vehicle": (28.0, "INPUT"),  # Motor vehicle parts/accessories
            "equipment": (18.0, "INPUT"),
            "software": (18.0, "INPUT"),
            "consulting": (18.0, "INPUT"),
            "marketing": (18.0, "INPUT"),
            "advertising": (18.0, "INPUT"),
            "professional fees": (18.0, "INPUT"),
            "legal": (18.0, "INPUT"),
            "audit": (18.0, "INPUT"),
            "entertainment": (18.0, "NON-INPUT"),  # ITC not allowed
            "gifts": (0.0, "NON-INPUT"),
            "donations": (0.0, "NON-INPUT"),
            "salaries": (0.0, "NON-INPUT"),
            "wages": (0.0, "NON-INPUT"),
        }
        
        category_lower = category.lower() if category else ""
        for key, (rate, expense_type) in gst_mapping.items():
            if key in category_lower:
                return rate, expense_type
        
        return 18.0, "INPUT"  # Default to 18% INPUT

    @staticmethod
    def _calculate_gst_components(amount: float, gst_rate: float, place_of_supply: str = "SAME") -> Dict[str, float]:
        """
        Calculate CGST, SGST, IGST based on place of supply
        place_of_supply: 'SAME' (CGST+SGST) or 'OTHER' (IGST)
        """
        if gst_rate == 0:
            return {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}
        
        if place_of_supply.upper() == "OTHER":
            igst = amount * (gst_rate / 100)
            return {"cgst": 0.0, "sgst": 0.0, "igst": igst}
        else:
            half_rate = gst_rate / 2
            cgst = amount * (half_rate / 100)
            sgst = amount * (half_rate / 100)
            return {"cgst": cgst, "sgst": sgst, "igst": 0.0}

    def parse_expense_sheet(
        self, file_content: bytes, filename: str, company_id: str
    ) -> Tuple[bool, str, Optional[List[Dict[str, Any]]]]:
        """
        Parse expense sheet (CSV/Excel) and return structured expense data
        Returns (success, message, expense_list)
        """
        try:
            # Load based on file extension
            if filename.lower().endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_content))
            elif filename.lower().endswith((".xlsx", ".xls")):
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                return False, "Unsupported file format. Use CSV or Excel.", None

            if df.empty:
                return False, "File is empty.", None

            # Expected columns
            expected_columns = ["date", "category", "amount", "description"]
            optional_columns = ["vendor_name", "vendor_gstin", "invoice_number", "hsn_code", "place_of_supply"]
            
            # Validate required columns
            for col in expected_columns:
                if col not in df.columns:
                    return False, f"Missing required column: {col}", None

            expenses = []
            for idx, row in df.iterrows():
                try:
                    # Parse date
                    try:
                        expense_date = pd.to_datetime(row["date"]).strftime("%Y-%m-%d")
                    except Exception:
                        expense_date = str(row["date"])

                    # Parse amount
                    amount = float(row["amount"])
                    if amount <= 0:
                        continue

                    category = str(row["category"]).strip()
                    description = str(row["description"]).strip()

                    # Get GST rate and type
                    gst_rate, expense_type = self._get_gst_rate_for_category(category)

                    # Get place of supply (default to SAME)
                    place_of_supply = row.get("place_of_supply", "SAME")

                    # Calculate GST
                    gst_components = self._calculate_gst_components(amount, gst_rate, place_of_supply)

                    expense = {
                        "company_id": company_id,
                        "date": expense_date,
                        "category": category,
                        "amount": amount,
                        "description": description,
                        "payment_method": row.get("payment_method", "Not specified"),
                        "hsn_code": row.get("hsn_code", ""),
                        "gst_rate": gst_rate,
                        "cgst_amount": gst_components["cgst"],
                        "sgst_amount": gst_components["sgst"],
                        "igst_amount": gst_components["igst"],
                        "vendor_name": row.get("vendor_name", ""),
                        "vendor_gstin": row.get("vendor_gstin", ""),
                        "invoice_number": row.get("invoice_number", ""),
                        "expense_type": expense_type,
                        "itc_eligible": 1 if expense_type == "INPUT" else 0,
                        "bill_attached": 1 if row.get("bill_attached", 0) else 0,
                    }
                    expenses.append(expense)
                except Exception as e:
                    print(f"Warning: Skipped row {idx + 1}: {str(e)}")
                    continue

            if not expenses:
                return False, "No valid expenses could be extracted from the file.", None

            return True, f"Successfully parsed {len(expenses)} expenses.", expenses

        except Exception as e:
            return False, f"Error parsing file: {str(e)}", None

    def import_expenses(
        self, expenses: List[Dict[str, Any]], company_id: str, user_id: int
    ) -> Tuple[bool, str, int]:
        """
        Import parsed expenses into database
        Returns (success, message, count_inserted)
        """
        try:
            conn, _ = get_db_connection()
            cursor = conn.cursor()
            
            inserted_count = 0
            for expense in expenses:
                cursor.execute("""
                    INSERT INTO expenses (
                        company_id, date, category, amount, description,
                        payment_method, hsn_code, gst_rate, cgst_amount,
                        sgst_amount, igst_amount, vendor_name, vendor_gstin,
                        invoice_number, expense_type, itc_eligible,
                        bill_attached, gst_reconciled
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    expense["company_id"],
                    expense["date"],
                    expense["category"],
                    expense["amount"],
                    expense["description"],
                    expense.get("payment_method", ""),
                    expense.get("hsn_code", ""),
                    expense.get("gst_rate", 0),
                    expense.get("cgst_amount", 0),
                    expense.get("sgst_amount", 0),
                    expense.get("igst_amount", 0),
                    expense.get("vendor_name", ""),
                    expense.get("vendor_gstin", ""),
                    expense.get("invoice_number", ""),
                    expense.get("expense_type", "INPUT"),
                    expense.get("itc_eligible", 1),
                    expense.get("bill_attached", 0),
                    0,  # gst_reconciled
                ))
                
                # Create Ledger Entries for the expense
                v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
                v_date = expense["date"]
                category = expense["category"]
                desc = expense["description"]
                total_tax = sum([expense.get("cgst_amount", 0), expense.get("sgst_amount", 0), expense.get("igst_amount", 0)])
                base_amount = expense["amount"] - total_tax if expense["amount"] > total_tax else expense["amount"]
                total_payment = base_amount + total_tax
                itc = expense.get("itc_eligible", 1)
                c_id = expense["company_id"]
                
                # Direct Expense
                cursor.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, company_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (f"Direct Expense - {category}", "EXPENSE", base_amount, desc, v_date, v_id, "Payment", c_id))
                
                # GST Input Credit
                if total_tax > 0 and itc:
                    cursor.execute("""
                        INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, company_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, ("GST Input Credit", "ASSET", total_tax, f"ITC for {category}", v_date, v_id, "Payment", c_id))
                elif total_tax > 0 and not itc:
                    cursor.execute("""
                        INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, company_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (f"Direct Expense - {category} (Tax Portion)", "EXPENSE", total_tax, f"Non-ITC for {category}", v_date, v_id, "Payment", c_id))
                    
                # Bank Operations
                cursor.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, company_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, ("Bank Operations Account", "ASSET", -total_payment, f"Payment for {category}", v_date, v_id, "Payment", c_id))

                inserted_count += 1

            conn.commit()
            conn.close()

            return True, f"Imported {inserted_count} expenses successfully.", inserted_count

        except Exception as e:
            conn.rollback()
            conn.close()
            return False, f"Error importing expenses: {str(e)}", 0

    def get_expenses(
        self, company_id: str, filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get expenses with optional filters"""
        try:
            conn, _ = get_db_connection()
            cursor = conn.cursor()

            query = "SELECT * FROM expenses WHERE company_id = ?"
            params = [company_id]

            if filters:
                if filters.get("start_date"):
                    query += " AND date >= ?"
                    params.append(filters["start_date"])
                if filters.get("end_date"):
                    query += " AND date <= ?"
                    params.append(filters["end_date"])
                if filters.get("category"):
                    query += " AND category = ?"
                    params.append(filters["category"])
                if filters.get("only_itc_eligible"):
                    query += " AND itc_eligible = 1"

            query += " ORDER BY date DESC"
            cursor.execute(query, params)
            
            columns = [desc[0] for desc in cursor.description]
            expenses = [dict(zip(columns, row)) for row in cursor.fetchall()]
            conn.close()

            return expenses
        except Exception as e:
            print(f"Error retrieving expenses: {str(e)}")
            return []

    def get_expense_summary(self, company_id: str, month_year: Optional[str] = None) -> Dict[str, Any]:
        """Get expense summary for dashboard"""
        try:
            conn, _ = get_db_connection()
            cursor = conn.cursor()

            query = "SELECT * FROM expenses WHERE company_id = ?"
            params = [company_id]

            if month_year:  # Format: '03-2026'
                year, month = month_year.split("-")
                query += f" AND strftime('%Y-%m', date) = '{year}-{month}'"

            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            expenses = [dict(zip(columns, row)) for row in cursor.fetchall()]
            conn.close()

            if not expenses:
                return {
                    "total_expenses": 0,
                    "total_gst": 0,
                    "cgst_total": 0,
                    "sgst_total": 0,
                    "igst_total": 0,
                    "itc_eligible_total": 0,
                    "non_itc_total": 0,
                    "count": 0,
                }

            total_expenses = sum(e["amount"] for e in expenses)
            total_gst = sum(e.get("cgst_amount", 0) + e.get("sgst_amount", 0) + e.get("igst_amount", 0) for e in expenses)
            cgst_total = sum(e.get("cgst_amount", 0) for e in expenses)
            sgst_total = sum(e.get("sgst_amount", 0) for e in expenses)
            igst_total = sum(e.get("igst_amount", 0) for e in expenses)
            itc_eligible = sum(e["amount"] + sum(e.get(f, 0) for f in ["cgst_amount", "sgst_amount", "igst_amount"]) 
                               for e in expenses if e.get("itc_eligible", 0) == 1)
            non_itc = sum(e["amount"] + sum(e.get(f, 0) for f in ["cgst_amount", "sgst_amount", "igst_amount"]) 
                          for e in expenses if e.get("itc_eligible", 0) == 0)

            return {
                "total_expenses": total_expenses,
                "total_gst": total_gst,
                "cgst_total": cgst_total,
                "sgst_total": sgst_total,
                "igst_total": igst_total,
                "itc_eligible_total": itc_eligible,
                "non_itc_total": non_itc,
                "count": len(expenses),
            }
        except Exception as e:
            print(f"Error calculating summary: {str(e)}")
            return {}

    def reconcile_expenses(self, company_id: str, month_year: str) -> Tuple[bool, str]:
        """Mark expenses as reconciled for GST filing"""
        try:
            conn, _ = get_db_connection()
            cursor = conn.cursor()

            year, month = month_year.split("-")
            cursor.execute("""
                UPDATE expenses
                SET gst_reconciled = 1
                WHERE company_id = ? AND strftime('%Y-%m', date) = ?
            """, (company_id, f"{year}-{month}"))

            conn.commit()
            conn.close()

            return True, f"Expenses for {month_year} marked as reconciled."
        except Exception as e:
            return False, f"Error reconciling expenses: {str(e)}"
