"""
GST Compliance Service
Handles GST calculations, reconciliation, and reporting for tax compliance
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.core.database_manager import get_db_connection


class GSTService:
    """Service for managing GST compliance across the platform"""

    def __init__(self):
        self.db_conn, self.db_type = get_db_connection()

    def record_gst_transaction(
        self,
        company_id: str,
        transaction_type: str,  # 'SALE' or 'PURCHASE'
        invoice_number: str,
        customer_gstin: str,
        customer_name: str,
        hsn_sac_code: str,
        description: str,
        quantity: float,
        unit_price: float,
        gst_rate: float,
        place_of_supply: str = "SAME",
        irn: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Record a GST transaction (sales or purchases)
        """
        try:
            taxable_amount = quantity * unit_price
            
            # Calculate GST components
            if place_of_supply.upper() == "OTHER":
                cgst = 0.0
                sgst = 0.0
                igst = taxable_amount * (gst_rate / 100)
            else:
                cgst = taxable_amount * (gst_rate / 2 / 100)
                sgst = taxable_amount * (gst_rate / 2 / 100)
                igst = 0.0

            total_tax = cgst + sgst + igst
            total_amount = taxable_amount + total_tax

            conn, _ = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO gst_transactions (
                    company_id, transaction_date, transaction_type, invoice_number,
                    customer_gstin, customer_name, hsn_sac_code, description,
                    quantity, unit_price, taxable_amount, gst_rate,
                    cgst_amount, sgst_amount, igst_amount, total_amount,
                    place_of_supply, irn
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id,
                datetime.now().strftime("%Y-%m-%d"),
                transaction_type,
                invoice_number,
                customer_gstin,
                customer_name,
                hsn_sac_code,
                description,
                quantity,
                unit_price,
                taxable_amount,
                gst_rate,
                cgst,
                sgst,
                igst,
                total_amount,
                place_of_supply,
                irn,
            ))

            conn.commit()
            conn.close()

            return True, "GST transaction recorded successfully."
        except Exception as e:
            return False, f"Error recording GST transaction: {str(e)}"

    def get_gst_summary(
        self, company_id: str, month_year: str
    ) -> Dict[str, Any]:
        """
        Get GST summary for a specific month
        Returns sales tax, input tax, and net tax payable
        """
        try:
            conn, _ = get_db_connection()
            cursor = conn.cursor()

            year, month = month_year.split("-")
            date_filter = f"{year}-{month}-%"

            # Get sales transactions
            cursor.execute("""
                SELECT 
                    SUM(cgst_amount) as cgst_sales,
                    SUM(sgst_amount) as sgst_sales,
                    SUM(igst_amount) as igst_sales,
                    SUM(total_amount) as total_sales
                FROM gst_transactions
                WHERE company_id = ? 
                AND transaction_type = 'SALE'
                AND transaction_date LIKE ?
            """, (company_id, date_filter))

            sales_row = cursor.fetchone()
            sales_data = {
                "cgst": sales_row[0] or 0.0,
                "sgst": sales_row[1] or 0.0,
                "igst": sales_row[2] or 0.0,
                "total": sales_row[3] or 0.0,
            }

            # Get purchase transactions
            cursor.execute("""
                SELECT 
                    SUM(cgst_amount) as cgst_purchases,
                    SUM(sgst_amount) as sgst_purchases,
                    SUM(igst_amount) as igst_purchases,
                    SUM(total_amount) as total_purchases
                FROM gst_transactions
                WHERE company_id = ?
                AND transaction_type = 'PURCHASE'
                AND transaction_date LIKE ?
            """, (company_id, date_filter))

            purchase_row = cursor.fetchone()
            purchase_data = {
                "cgst": purchase_row[0] or 0.0,
                "sgst": purchase_row[1] or 0.0,
                "igst": purchase_row[2] or 0.0,
                "total": purchase_row[3] or 0.0,
            }

            # Get expenses (Input Tax Credit eligible)
            cursor.execute("""
                SELECT
                    SUM(cgst_amount) as cgst_expenses,
                    SUM(sgst_amount) as sgst_expenses,
                    SUM(igst_amount) as igst_expenses
                FROM expenses
                WHERE company_id = ?
                AND itc_eligible = 1
                AND strftime('%Y-%m', date) = ?
            """, (company_id, f"{year}-{month}"))

            expense_row = cursor.fetchone()
            expense_data = {
                "cgst": expense_row[0] or 0.0,
                "sgst": expense_row[1] or 0.0,
                "igst": expense_row[2] or 0.0,
            }

            conn.close()

            # Calculate net tax payable
            cgst_payable = max(
                0, (sales_data["cgst"] + expense_data["cgst"]) - 
                (purchase_data["cgst"] + expense_data["cgst"])
            )
            sgst_payable = max(
                0, (sales_data["sgst"] + expense_data["sgst"]) - 
                (purchase_data["sgst"] + expense_data["sgst"])
            )
            igst_payable = max(
                0, (sales_data["igst"] + expense_data["igst"]) - 
                (purchase_data["igst"] + expense_data["igst"])
            )

            return {
                "month_year": month_year,
                "outward_supply": {
                    "sales": sales_data,
                    "cgst_output": sales_data["cgst"],
                    "sgst_output": sales_data["sgst"],
                    "igst_output": sales_data["igst"],
                    "total_output_tax": sales_data["cgst"] + sales_data["sgst"] + sales_data["igst"],
                },
                "inward_supply": {
                    "purchases": purchase_data,
                    "expenses": expense_data,
                    "cgst_input": purchase_data["cgst"] + expense_data["cgst"],
                    "sgst_input": purchase_data["sgst"] + expense_data["sgst"],
                    "igst_input": purchase_data["igst"] + expense_data["igst"],
                    "total_input_tax": (purchase_data["cgst"] + purchase_data["sgst"] + purchase_data["igst"] +
                                       expense_data["cgst"] + expense_data["sgst"] + expense_data["igst"]),
                },
                "net_tax_payable": {
                    "cgst": cgst_payable,
                    "sgst": sgst_payable,
                    "igst": igst_payable,
                    "total": cgst_payable + sgst_payable + igst_payable,
                },
            }
        except Exception as e:
            print(f"Error calculating GST summary: {str(e)}")
            return {}

    def create_gstr1_report(
        self, company_id: str, month_year: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create GSTR-1 (Outward Supply) report
        GSTR-1 is filed by suppliers showing all supplies made
        """
        try:
            conn, _ = get_db_connection()
            cursor = conn.cursor()

            year, month = month_year.split("-")
            date_filter = f"{year}-{month}-%"

            # Get all sales transactions
            cursor.execute("""
                SELECT 
                    invoice_number, customer_gstin, customer_name,
                    hsn_sac_code, description, quantity, unit_price,
                    taxable_amount, gst_rate, cgst_amount, sgst_amount,
                    igst_amount, total_amount, place_of_supply
                FROM gst_transactions
                WHERE company_id = ?
                AND transaction_type = 'SALE'
                AND transaction_date LIKE ?
                ORDER BY transaction_date
            """, (company_id, date_filter))

            columns = [desc[0] for desc in cursor.description]
            sales = [dict(zip(columns, row)) for row in cursor.fetchall()]

            # Calculate summary
            cursor.execute("""
                SELECT 
                    SUM(taxable_amount) as subtotal,
                    SUM(cgst_amount) as cgst_total,
                    SUM(sgst_amount) as sgst_total,
                    SUM(igst_amount) as igst_total,
                    SUM(total_amount) as total
                FROM gst_transactions
                WHERE company_id = ?
                AND transaction_type = 'SALE'
                AND transaction_date LIKE ?
            """, (company_id, date_filter))

            summary_row = cursor.fetchone()
            conn.close()

            report = {
                "report_type": "GSTR-1",
                "month_year": month_year,
                "filing_deadline": self._get_gst_filing_deadline(year, month, "GSTR-1"),
                "summary": {
                    "subtotal": summary_row[0] or 0.0,
                    "cgst_total": summary_row[1] or 0.0,
                    "sgst_total": summary_row[2] or 0.0,
                    "igst_total": summary_row[3] or 0.0,
                    "total_sales": summary_row[4] or 0.0,
                },
                "sales_details": sales,
                "generated_at": datetime.now().isoformat(),
            }

            return True, "GSTR-1 report generated successfully.", report

        except Exception as e:
            return False, f"Error generating GSTR-1 report: {str(e)}", None

    def create_gstr2_report(
        self, company_id: str, month_year: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create GSTR-2 (Inward Supply) report
        GSTR-2 shows all purchases and eligible Input Tax Credit
        """
        try:
            conn, _ = get_db_connection()
            cursor = conn.cursor()

            year, month = month_year.split("-")
            date_filter = f"{year}-{month}-%"

            # Get all purchase transactions
            cursor.execute("""
                SELECT 
                    invoice_number, customer_gstin, customer_name,
                    hsn_sac_code, description, quantity, unit_price,
                    taxable_amount, gst_rate, cgst_amount, sgst_amount,
                    igst_amount, total_amount
                FROM gst_transactions
                WHERE company_id = ?
                AND transaction_type = 'PURCHASE'
                AND transaction_date LIKE ?
                ORDER BY transaction_date
            """, (company_id, date_filter))

            columns = [desc[0] for desc in cursor.description]
            purchases = [dict(zip(columns, row)) for row in cursor.fetchall()]

            # Get eligible expenses
            cursor.execute("""
                SELECT 
                    id, invoice_number, vendor_name, vendor_gstin,
                    hsn_code, description, amount, cgst_amount, sgst_amount,
                    igst_amount, expense_type, itc_eligible
                FROM expenses
                WHERE company_id = ?
                AND itc_eligible = 1
                AND strftime('%Y-%m', date) = ?
            """, (company_id, f"{year}-{month}"))

            expense_cols = [desc[0] for desc in cursor.description]
            expenses = [dict(zip(expense_cols, row)) for row in cursor.fetchall()]

            # Calculate summary
            cursor.execute("""
                SELECT 
                    SUM(taxable_amount) as purchase_subtotal,
                    SUM(cgst_amount) as cgst_total,
                    SUM(sgst_amount) as sgst_total,
                    SUM(igst_amount) as igst_total
                FROM gst_transactions
                WHERE company_id = ?
                AND transaction_type = 'PURCHASE'
                AND transaction_date LIKE ?
            """, (company_id, date_filter))

            summary_row = cursor.fetchone()

            expense_cgst = sum(e.get("cgst_amount", 0) for e in expenses)
            expense_sgst = sum(e.get("sgst_amount", 0) for e in expenses)
            expense_igst = sum(e.get("igst_amount", 0) for e in expenses)

            conn.close()

            report = {
                "report_type": "GSTR-2",
                "month_year": month_year,
                "filing_deadline": self._get_gst_filing_deadline(year, month, "GSTR-2"),
                "summary": {
                    "purchase_subtotal": summary_row[0] or 0.0,
                    "cgst_purchases": summary_row[1] or 0.0,
                    "sgst_purchases": summary_row[2] or 0.0,
                    "igst_purchases": summary_row[3] or 0.0,
                    "cgst_expenses": expense_cgst,
                    "sgst_expenses": expense_sgst,
                    "igst_expenses": expense_igst,
                    "total_input_tax": (summary_row[1] or 0.0) + (summary_row[2] or 0.0) + 
                                      (summary_row[3] or 0.0) + expense_cgst + expense_sgst + expense_igst,
                },
                "purchase_details": purchases,
                "expense_details": expenses,
                "generated_at": datetime.now().isoformat(),
            }

            return True, "GSTR-2 report generated successfully.", report

        except Exception as e:
            return False, f"Error generating GSTR-2 report: {str(e)}", None

    def create_gstr3b_report(
        self, company_id: str, month_year: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create GSTR-3B (Monthly Tax Return) report
        Most important form - shows output tax, input tax, and net tax payable
        """
        try:
            gst_summary = self.get_gst_summary(company_id, month_year)
            
            if not gst_summary:
                return False, "Unable to generate GSTR-3B report.", None

            year, month = month_year.split("-")
            
            report = {
                "report_type": "GSTR-3B",
                "month_year": month_year,
                "filing_deadline": self._get_gst_filing_deadline(year, month, "GSTR-3B"),
                "outward_supply": gst_summary.get("outward_supply", {}),
                "inward_supply": gst_summary.get("inward_supply", {}),
                "tax_liability": {
                    "cgst_payable": gst_summary.get("net_tax_payable", {}).get("cgst", 0),
                    "sgst_payable": gst_summary.get("net_tax_payable", {}).get("sgst", 0),
                    "igst_payable": gst_summary.get("net_tax_payable", {}).get("igst", 0),
                    "total_payable": gst_summary.get("net_tax_payable", {}).get("total", 0),
                },
                "generated_at": datetime.now().isoformat(),
            }

            return True, "GSTR-3B report generated successfully.", report

        except Exception as e:
            return False, f"Error generating GSTR-3B report: {str(e)}", None

    @staticmethod
    def _get_gst_filing_deadline(year: str, month: str, report_type: str) -> str:
        """
        Get GST filing deadline based on report type and month
        GSTR-1: 11th of next month (monthly), 13th (quarterly)
        GSTR-3B: 20th of next month
        GSTR-2: 15th of next month
        """
        from calendar import monthrange
        
        next_month = int(month) + 1
        next_year = year
        if next_month > 12:
            next_month = 1
            next_year = str(int(year) + 1)

        if report_type == "GSTR-1":
            return f"{next_year}-{next_month:02d}-11"
        elif report_type == "GSTR-3B":
            return f"{next_year}-{next_month:02d}-20"
        elif report_type == "GSTR-2":
            return f"{next_year}-{next_month:02d}-15"
        else:
            return f"{next_year}-{next_month:02d}-10"

    def store_gst_return(
        self,
        company_id: str,
        month_year: str,
        return_type: str,
        report_data: Dict[str, Any],
    ) -> Tuple[bool, str]:
        """Store GST return filing in database"""
        try:
            summary = report_data.get("summary", {})
            
            outward = summary.get("cgst_total", 0) + summary.get("sgst_total", 0) + summary.get("igst_total", 0)
            inward = report_data.get("inward_supply", {}).get("total_input_tax", 0)
            
            conn, _ = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO gst_returns (
                    company_id, return_period, return_type, filing_date,
                    status, total_outward_supply, total_tax_payable,
                    total_input_tax_credit, net_tax_payable
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id,
                month_year,
                return_type,
                datetime.now().strftime("%Y-%m-%d"),
                "DRAFT",
                summary.get("total_sales", 0) if return_type == "GSTR-1" else 
                summary.get("purchase_subtotal", 0),
                outward,
                inward,
                max(0, outward - inward),
            ))

            conn.commit()
            conn.close()

            return True, f"{return_type} return stored successfully."
        except Exception as e:
            return False, f"Error storing GST return: {str(e)}"
