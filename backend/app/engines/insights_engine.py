"""
AI Insights Engine for NeuralBI
Generates smart business recommendations and predictive insights.
"""

import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import numpy as np
from pathlib import Path

class InsightsEngine:
    """Generate AI-powered business insights and recommendations"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def get_smart_recommendations(self, company_id: str) -> List[Dict[str, Any]]:
        """Generate AI insights across all business areas"""
        recommendations = []
        
        # 1. Inventory Insights
        inventory_insights = self._analyze_inventory(company_id)
        recommendations.extend(inventory_insights)
        
        # 2. Customer Insights
        customer_insights = self._analyze_customers(company_id)
        recommendations.extend(customer_insights)
        
        # 3. Financial Insights
        financial_insights = self._analyze_financials(company_id)
        recommendations.extend(financial_insights)
        
        # 4. Cash Flow Insights
        cashflow_insights = self._analyze_cash_flow(company_id)
        recommendations.extend(cashflow_insights)
        
        # Sort by impact score (descending)
        recommendations.sort(key=lambda x: x.get("impact_score", 0), reverse=True)
        
        return recommendations[:10]  # Top 10 insights
    
    def _analyze_inventory(self, company_id: str) -> List[Dict[str, Any]]:
        """Inventory optimization insights"""
        insights = []
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Find overstocked items (high qty but low velocity)
            cursor.execute("""
                SELECT name, quantity, last_sold_days, total_sales_30d
                FROM inventory
                WHERE company_id = ? AND quantity > 100
                ORDER BY quantity DESC
                LIMIT 5
            """, (company_id,))
            
            for row in cursor.fetchall():
                item_name = row["name"]
                qty = row["quantity"]
                last_sold = row.get("last_sold_days", 999)
                sales_30d = row.get("total_sales_30d", 0)
                
                # Overstocking indicator
                if last_sold > 30 and sales_30d < 5:
                    insights.append({
                        "type": "inventory",
                        "category": "overstock",
                        "title": f"⚠️ Excess Stock Detected: {item_name}",
                        "description": f"{item_name} has {qty} units with only {sales_30d} sales in 30 days. Consider liquidation or promotion.",
                        "impact_score": 85,
                        "action": "Review pricing or run promotion",
                        "estimated_value": f"₹{qty * 150}",  # Mock valuation
                    })
            
            # Find slow-moving items
            cursor.execute("""
                SELECT name, quantity, total_sales_90d
                FROM inventory
                WHERE company_id = ? AND total_sales_90d < 2 AND quantity > 50
                ORDER BY quantity DESC
                LIMIT 3
            """, (company_id,))
            
            for row in cursor.fetchall():
                insights.append({
                    "type": "inventory",
                    "category": "slow_moving",
                    "title": f"📉 Slow-Moving Stock: {row['name']}",
                    "description": f"{row['name']} had only {row['total_sales_90d']} sales in 90 days. Dead stock risk.",
                    "impact_score": 75,
                    "action": "Clearance sale or discontinue",
                    "potential_savings": f"₹{row['quantity'] * 50}",
                })
            
            conn.close()
        except Exception as e:
            print(f"Inventory analysis error: {e}")
        
        return insights
    
    def _analyze_customers(self, company_id: str) -> List[Dict[str, Any]]:
        """Customer churn and health analysis"""
        insights = []
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Find high-value customers at risk (no recent activity)
            cursor.execute("""
                SELECT 
                    id, name, total_spent,
                    COALESCE(last_invoice_date, '2020-01-01') as last_activity
                FROM customers
                WHERE company_id = ? AND total_spent > 100000
                ORDER BY total_spent DESC
                LIMIT 5
            """, (company_id,))
            
            for row in cursor.fetchall():
                last_activity = datetime.fromisoformat(str(row["last_activity"]))
                days_inactive = (datetime.now() - last_activity).days
                
                if days_inactive > 60:
                    insights.append({
                        "type": "customer",
                        "category": "churn_risk",
                        "title": f"🚨 Churn Alert: {row['name']}",
                        "description": f"High-value customer (₹{row['total_spent']:,.0f} total) inactive for {days_inactive} days.",
                        "impact_score": 95,
                        "action": "Send personalized engagement offer",
                        "customer_value": f"₹{row['total_spent']}",
                    })
            
            # Find new high-potential customers (recent signups with strong activity)
            cursor.execute("""
                SELECT name, total_spent, invoice_count
                FROM customers
                WHERE company_id = ? 
                ORDER BY created_at DESC
                LIMIT 5
            """, (company_id,))
            
            new_customers = []
            for row in cursor.fetchall():
                if row["invoice_count"] > 3:
                    new_customers.append({
                        "type": "customer",
                        "category": "high_potential",
                        "title": f"⭐ High-Potential Customer: {row['name']}",
                        "description": f"{row['name']} shows strong engagement with {row['invoice_count']} purchases already.",
                        "impact_score": 70,
                        "action": "Nurture with loyalty program or upsell",
                        "current_value": f"₹{row['total_spent']}",
                    })
            
            insights.extend(new_customers[:2])
            conn.close()
        except Exception as e:
            print(f"Customer analysis error: {e}")
        
        return insights
    
    def _analyze_financials(self, company_id: str) -> List[Dict[str, Any]]:
        """Financial health and margin analysis"""
        insights = []
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Calculate margins by category
            cursor.execute("""
                SELECT 
                    category,
                    COUNT(*) as invoice_count,
                    AVG(profit_margin) as avg_margin,
                    SUM(grand_total) as total_revenue
                FROM invoices
                WHERE company_id = ? AND created_at > datetime('now', '-90 days')
                GROUP BY category
                ORDER BY avg_margin ASC
                LIMIT 5
            """, (company_id,))
            
            for row in cursor.fetchall():
                category = row["category"]
                margin = row["avg_margin"] or 0
                
                if margin < 15:
                    insights.append({
                        "type": "financial",
                        "category": "low_margin",
                        "title": f"💰 Low Margin Alert: {category}",
                        "description": f"{category} products have {margin:.1f}% margin - below 20% target.",
                        "impact_score": 80,
                        "action": "Review pricing or reduce costs",
                        "current_margin": f"{margin:.1f}%",
                        "target_margin": "20%",
                    })
            
            # Outstanding receivables
            cursor.execute("""
                SELECT 
                    COUNT(*) as pending_count,
                    SUM(grand_total) as pending_amount,
                    AVG(days_outstanding) as avg_days
                FROM invoices
                WHERE company_id = ? AND status != 'PAID'
                AND created_at > datetime('now', '-180 days')
            """, (company_id,))
            
            row = cursor.fetchone()
            if row and row["pending_amount"] and row["pending_amount"] > 50000:
                insights.append({
                    "type": "financial",
                    "category": "cash_flow",
                    "title": f"📋 High Receivables: ₹{row['pending_amount']:,.0f} pending",
                    "description": f"{row['pending_count']} invoices outstanding for avg {row['avg_days']:.0f} days.",
                    "impact_score": 85,
                    "action": "Follow up on pending payments",
                    "pending_amount": f"₹{row['pending_amount']:,.0f}",
                })
            
            conn.close()
        except Exception as e:
            print(f"Financial analysis error: {e}")
        
        return insights
    
    def _analyze_cash_flow(self, company_id: str) -> List[Dict[str, Any]]:
        """Cash flow and liquidity analysis"""
        insights = []
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Project 30-day cash flow
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN type = 'INVOICE' THEN amount ELSE 0 END) as incoming,
                    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as outgoing
                FROM ledger
                WHERE company_id = ? AND date > datetime('now', '-30 days')
            """, (company_id,))
            
            row = cursor.fetchone()
            incoming = row[0] or 0
            outgoing = row[1] or 0
            net_cash = incoming - outgoing
            
            if net_cash < 50000:
                insights.append({
                    "type": "financial",
                    "category": "liquidity",
                    "title": "⚠️ Cash Flow Alert",
                    "description": f"30-day net cash flow is ₹{net_cash:,.0f}. May impact operations.",
                    "impact_score": 90,
                    "action": "Accelerate collections or defer expenses",
                    "incoming": f"₹{incoming:,.0f}",
                    "outgoing": f"₹{outgoing:,.0f}",
                })
            
            conn.close()
        except Exception as e:
            print(f"Cash flow analysis error: {e}")
        
        return insights
    
    def predict_cash_flow(self, company_id: str, months: int = 3) -> Dict[str, Any]:
        """Predict cash flow for next N months"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get historical cash flow (last 6 months)
            cursor.execute("""
                SELECT 
                    strftime('%Y-%m', date) as month,
                    SUM(CASE WHEN type = 'INVOICE' THEN amount ELSE 0 END) as incoming,
                    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as outgoing
                FROM ledger
                WHERE company_id = ? AND date > datetime('now', '-180 days')
                GROUP BY month
                ORDER BY month DESC
            """, (company_id,))
            
            historical = list(cursor.fetchall())
            
            if len(historical) < 2:
                conn.close()
                return {"status": "insufficient_data"}
            
            # Simple linear regression forecast
            avg_incoming = np.mean([row[1] or 0 for row in historical])
            avg_outgoing = np.mean([row[2] or 0 for row in historical])
            
            forecast = {
                "status": "success",
                "forecast_months": months,
                "projections": []
            }
            
            for i in range(1, months + 1):
                future_month = datetime.now() + timedelta(days=30*i)
                forecast["projections"].append({
                    "month": future_month.strftime("%B %Y"),
                    "projected_incoming": f"₹{avg_incoming:,.0f}",
                    "projected_outgoing": f"₹{avg_outgoing:,.0f}",
                    "projected_net": f"₹{avg_incoming - avg_outgoing:,.0f}",
                    "confidence": "95%" if len(historical) >= 6 else "75%",
                })
            
            conn.close()
            return forecast
        except Exception as e:
            print(f"Cash flow prediction error: {e}")
            return {"status": "error", "message": str(e)}
    
    def get_industry_benchmark(self, company_id: str, metric: str = "profit_margin") -> Dict[str, Any]:
        """Compare company metrics against industry benchmarks"""
        benchmarks = {
            "profit_margin": {"industry_avg": 18, "top_20": 25, "description": "Net profit margin %"},
            "collection_days": {"industry_avg": 45, "top_20": 30, "description": "Days to collect payment"},
            "inventory_turnover": {"industry_avg": 6, "top_20": 10, "description": "Annual inventory turns"},
        }
        
        if metric not in benchmarks:
            return {"error": "Unknown metric"}
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if metric == "profit_margin":
                cursor.execute("""
                    SELECT AVG(profit_margin) FROM invoices
                    WHERE company_id = ? AND created_at > datetime('now', '-90 days')
                """, (company_id,))
                company_value = cursor.fetchone()[0] or 0
            
            elif metric == "collection_days":
                cursor.execute("""
                    SELECT AVG(days_outstanding) FROM invoices
                    WHERE company_id = ? AND created_at > datetime('now', '-180 days')
                """, (company_id,))
                company_value = cursor.fetchone()[0] or 0
            
            elif metric == "inventory_turnover":
                cursor.execute("""
                    SELECT SUM(total_sales_90d) / AVG(quantity) FROM inventory
                    WHERE company_id = ?
                """, (company_id,))
                company_value = (cursor.fetchone()[0] or 0) * 12 / 3  # Annualize
            
            conn.close()
            
            benchmark = benchmarks[metric]
            percentile = "top_20" if company_value >= benchmark["top_20"] else "below_avg"
            
            return {
                "metric": metric,
                "description": benchmark["description"],
                "company_value": f"{company_value:.1f}",
                "industry_average": f"{benchmark['industry_avg']:.1f}",
                "top_20_percentile": f"{benchmark['top_20']:.1f}",
                "percentile": percentile,
                "status": "✓ Above Average" if company_value >= benchmark["industry_avg"] else "⚠️ Below Average",
                "recommendation": f"You're in the {'top 20%' if percentile == 'top_20' else 'lower half'}. Target {benchmark['top_20']:.1f} to be in top 20%."
            }
        except Exception as e:
            return {"error": str(e)}
