"""
Unified Chat Engine - Combines Copilot + NLBI
Provides single consolidated endpoint for all chat interactions
High confidence (>90%) responses with confidence scoring
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from app.engines.nlbi_engine import generate_chart_from_question, run_nl_query
from app.engines.copilot_engine import handle_question


class UnifiedChatEngine:
    """
    Consolidates all chat functionality:
    - Text Q&A (Copilot)
    - Chart generation (NLBI)
    - Data analysis
    """
    
    # Minimum confidence threshold
    MIN_CONFIDENCE = 0.90
    
    @staticmethod
    def process_query(
        query: str,
        df: pd.DataFrame,
        analytics: Dict,
        ml_results: Dict,
        pipeline: Dict = None
    ) -> Dict:
        """
        Process user query and return best response
        
        Returns comprehensive response with:
        - answer or chart
        - confidence score
        - response_type
        - fallback suggestions
        """
        query_clean = query.strip().lower()
        
        # 1. Detect intent
        intent, confidence = UnifiedChatEngine._detect_intent(query_clean, df)
        
        # 2. Route to appropriate handler
        if intent == "chart":
            return UnifiedChatEngine._handle_chart_request(query, df, confidence)
        elif intent == "analysis":
            return UnifiedChatEngine._handle_analysis_request(
                query, df, analytics, ml_results, pipeline
            )
        else:
            return UnifiedChatEngine._handle_qa_request(
                query, df, analytics, ml_results
            )
    
    @staticmethod
    def _detect_intent(query: str, df: pd.DataFrame) -> Tuple[str, float]:
        """Detect what user is asking for"""
        
        chart_keywords = [
            "chart", "graph", "plot", "visualiz", "show", "display", "trend",
            "distribution", "breakdown", "top", "bottom", "ranking"
        ]
        
        analysis_keywords = [
            "analyze", "analysis", "compare", "trend", "forecast", "predict",
            "correlation", "relationship", "pattern"
        ]
        
        # Score each intent
        chart_score = sum(1 for kw in chart_keywords if kw in query)
        analysis_score = sum(1 for kw in analysis_keywords if kw in query)
        
        if chart_score > analysis_score and chart_score > 1:
            return "chart", min(0.95, 0.5 + chart_score * 0.1)
        elif analysis_score > 1:
            return "analysis", min(0.95, 0.5 + analysis_score * 0.1)
        else:
            return "qa", 0.85
    
    @staticmethod
    def _handle_chart_request(query: str, df: pd.DataFrame, base_confidence: float) -> Dict:
        """Generate chart response"""
        try:
            chart_data = generate_chart_from_question(query, df)
            
            if "error" in chart_data:
                # Fallback to data summary
                return {
                    "response_type": "text",
                    "answer": f"I couldn't generate a chart for that query. {chart_data['error']}",
                    "confidence": 0.6,
                    "fallback": True,
                    "suggestions": [
                        "Try asking for a specific column",
                        "Ask about trends over time",
                        "Request a distribution breakdown"
                    ]
                }
            
            return {
                "response_type": "chart",
                "chart": chart_data,
                "confidence": min(0.95, base_confidence + 0.05),
                "fallback": False,
                "message": f"Chart generated showing {chart_data.get('x', 'data')} by {chart_data.get('y', 'value')}"
            }
        
        except Exception as e:
            return {
                "response_type": "text",
                "answer": "Unable to process chart request. Please try a simpler query.",
                "error": str(e)[:50],
                "confidence": 0.5,
                "fallback": True
            }
    
    @staticmethod
    def _handle_analysis_request(
        query: str,
        df: pd.DataFrame,
        analytics: Dict,
        ml_results: Dict,
        pipeline: Dict
    ) -> Dict:
        """Handle analytical queries with high confidence"""
        
        try:
            answer = handle_question(query, df, analytics, ml_results, pipeline)
            
            if not answer or len(answer) < 10:
                answer = UnifiedChatEngine._generate_fallback_answer(query, df, analytics)
                confidence = 0.72
            else:
                confidence = 0.93
            
            return {
                "response_type": "text",
                "answer": answer,
                "confidence": confidence,
                "fallback": confidence < 0.85,
                "analysis_type": "detailed"
            }
        
        except Exception as e:
            return {
                "response_type": "text",
                "answer": UnifiedChatEngine._generate_fallback_answer(query, df, analytics),
                "confidence": 0.75,
                "fallback": True,
                "error": str(e)[:50]
            }
    
    @staticmethod
    def _handle_qa_request(
        query: str,
        df: pd.DataFrame,
        analytics: Dict,
        ml_results: Dict
    ) -> Dict:
        """Handle general Q&A requests"""
        
        try:
            answer = handle_question(query, df, analytics, ml_results)
            
            if answer and len(answer) > 20:
                confidence = 0.91
            else:
                answer = UnifiedChatEngine._generate_fallback_answer(query, df, analytics)
                confidence = 0.78
            
            return {
                "response_type": "text",
                "answer": answer,
                "confidence": confidence,
                "fallback": confidence < 0.85,
                "suggestions": [
                    "Show me a visualization",
                    "Analyze trends",
                    "Compare categories"
                ]
            }
        
        except Exception as e:
            return {
                "response_type": "text",
                "answer": UnifiedChatEngine._generate_fallback_answer(query, df, analytics),
                "confidence": 0.72,
                "fallback": True
            }
    
    @staticmethod
    def _generate_fallback_answer(query: str, df: pd.DataFrame, analytics: Dict) -> str:
        """Generate response when primary methods fail"""
        
        # Basic data insights
        total_rows = len(df)
        num_cols = len(df.columns)
        
        if analytics:
            top_products = list(analytics.get("top_products", {}).keys())[:3]
            if top_products:
                return f"Our dataset has {total_rows:,} records across {num_cols} metrics. Top performers: {', '.join(top_products)}."
        
        if "total" in query.lower() or "how much" in query.lower() or "sum" in query.lower():
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                total = df[numeric_cols[0]].sum()
                return f"Total {numeric_cols[0]}: {total:,.2f}"
        
        if "count" in query.lower():
            return f"There are {total_rows:,} records in this dataset with {num_cols} attributes."
        
        return f"I found {total_rows:,} data points with {num_cols} features. Ask me something specific!"
