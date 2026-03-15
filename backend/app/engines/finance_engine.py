
import sqlite3
import pandas as pd
from app.core.database_manager import DB_PATH

class FinanceEngine:
    """
    Enterprise Finance & Accounting Engine
    Calculates EBITDA, Net Profit, Health Ratios, and Cash Flow health.
    """
    
    def get_financial_summary(self, company_id: str):
        conn = sqlite3.connect(DB_PATH)
        try:
            # 1. Total Revenue (Invoices)
            rev_query = "SELECT SUM(grand_total) FROM invoices WHERE company_id = ?"
            total_revenue = conn.execute(rev_query, (company_id,)).fetchone()[0] or 0.0
            
            # 2. Total COGS (Inventory consumption estimation)
            # In a real system, this would be calculated per transaction
            cogs_query = "SELECT SUM(cost_price * quantity) FROM inventory WHERE company_id = ?"
            estimated_cogs = conn.execute(cogs_query, (company_id,)).fetchone()[0] or 0.0
            
            # 3. Operating Expenses (Expenses table)
            exp_query = "SELECT SUM(amount) FROM expenses" # Note: expenses table currently missing company_id, using global for now or assuming isolation by context
            total_expenses = conn.execute(exp_query).fetchone()[0] or 0.0
            
            ebitda = total_revenue - estimated_cogs - total_expenses
            net_profit = ebitda * 0.75 # Estimated 25% tax
            
            # 4. Ratios
            gross_margin = ((total_revenue - estimated_cogs) / max(1, total_revenue)) * 100
            net_margin = (net_profit / max(1, total_revenue)) * 100
            
            # 5. Working Capital (Asset vs Liabilities)
            ar_query = "SELECT SUM(grand_total) FROM invoices WHERE company_id = ? AND status != 'PAID'"
            receivables = conn.execute(ar_query, (company_id,)).fetchone()[0] or 0.0
            
            ap_query = "SELECT SUM(total_amount) FROM purchase_orders WHERE status = 'PENDING'"
            payables = conn.execute(ap_query).fetchone()[0] or 0.0
            
            working_capital = receivables - payables
            current_ratio = receivables / max(1, payables)
            
            return {
                "total_revenue": round(total_revenue, 2),
                "total_expenses": round(total_expenses + estimated_cogs, 2),
                "ebitda": round(ebitda, 2),
                "margin": round(net_margin, 2),
                "gross_margin": round(gross_margin, 2),
                "net_profit": round(net_profit, 2),
                "tax_estimate": round(total_revenue * 0.18, 2), # 18% GST estimate
                "receivables": round(receivables, 2),
                "payables": round(payables, 2),
                "working_capital": round(working_capital, 2),
                "current_ratio": round(current_ratio, 2),
                "health_score": "EXCELLENT" if net_margin > 15 else "STABLE" if net_margin > 5 else "CRITICAL"
            }
        finally:
            conn.close()

    def get_budgets(self, company_id: str):
        # Mocking enterprise budgets, could be moved to DB
        return {
            "Marketing": 500000,
            "Engineering": 1200000,
            "Operations": 450000,
            "HR": 200000,
            "Cloud Security": 350000,
            "R&D": 800000
        }

finance_engine = FinanceEngine()
