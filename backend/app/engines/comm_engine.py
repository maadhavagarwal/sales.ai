
import sqlite3
import json
import uuid
import os
from datetime import datetime, timedelta
from app.core.database_manager import DB_PATH, log_activity
from app.engines.llm_engine import ask_llm

class CommEngine:
    """
    Enterprise Communications Engine
    Handles persistent team chat, meeting orchestration, and outbound outreach records.
    Ensures multi-tenant isolation via company_id.
    Integrates AI roadmap Phase 1: Sentiment Analysis and Meeting Summarization.
    """
    
    def get_messages(self, company_id):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM team_chat WHERE company_id = ? ORDER BY timestamp ASC LIMIT 100",
                (company_id,)
            )
            rows = cursor.fetchall()
            conn.close()
            
            messages = []
            for row in rows:
                messages.append({
                    "id": row['id'],
                    "sender": row['sender_name'],
                    "text": row['message_text'],
                    "time": datetime.strptime(row['timestamp'], "%Y-%m-%d %H:%M:%S").strftime("%I:%M %p") if row['timestamp'] else "Now"
                })
            return messages
        except Exception as e:
            print(f"Error fetching messages: {e}")
            return []

    def post_message(self, company_id, sender, text):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "INSERT INTO team_chat (company_id, sender_name, message_text) VALUES (?, ?, ?)",
                (company_id, sender, text)
            )
            conn.commit()
            conn.close()
            return {"status": "success", "message": "Broadcast sent to team relay."}
        except Exception as e:
            print(f"Error posting message: {e}")
            return {"status": "error", "message": str(e)}

    def get_meetings(self, company_id):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM meetings WHERE company_id = ? ORDER BY start_time ASC",
                (company_id,)
            )
            rows = cursor.fetchall()
            conn.close()
            
            meetings = []
            for row in rows:
                meetings.append({
                    "id": row['id'],
                    "title": row['title'],
                    "type": row['type'],
                    "start": row['start_time'],
                    "duration": row['duration'],
                    "link": row['link'],
                    "participants": json.loads(row['participants']) if row['participants'] else []
                })
            return meetings
        except Exception as e:
            print(f"Error fetching meetings: {e}")
            return []

    def create_meeting(self, company_id, data):
        try:
            meet_id = str(uuid.uuid4())
            # Real enterprise meeting links would integrate with Zoom/Meet/Teams
            # Here we provide a secure internal gateway link
            meet_link = f"https://nexus.salesai.io/join/{meet_id[:8]}"
            
            participants = data.get("participants", ["Team Alpha", "Executive Board"])
            
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "INSERT INTO meetings (id, company_id, title, type, start_time, duration, link, participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    meet_id,
                    company_id,
                    data.get("title", "Neural Strategic Sync"),
                    data.get("type", "Team"),
                    data.get("start", datetime.now().strftime("%Y-%m-%d %H:%M")),
                    data.get("duration", "30 min"),
                    meet_link,
                    json.dumps(participants)
                )
            )
            conn.commit()
            conn.close()
            return {"id": meet_id, "link": meet_link}
        except Exception as e:
            print(f"Error creating meeting: {e}")
            return {"status": "error", "message": str(e)}

    def analyze_team_sentiment(self, company_id):
        """Phase 1: Sentiment Analysis using keyword heuristics."""
        messages = self.get_messages(company_id)
        if not messages: return {"score": 0.5, "label": "NEUTRAL"}
        
        pos = ["great", "good", "happy", "success", "won", "achieved", "positive", "thanks"]
        neg = ["bad", "fail", "lost", "frustrated", "error", "issue", "problem", "difficult"]
        
        score = 0.5
        for m in messages:
            txt = m['text'].lower()
            for p in pos: 
                if p in txt: score += 0.05
            for n in neg: 
                if n in txt: score -= 0.05
        
        score = max(0, min(1, score))
        label = "POSITIVE" if score > 0.6 else "NEGATIVE" if score < 0.4 else "NEUTRAL"
        return {"score": round(score, 2), "label": label, "count": len(messages)}

    def summarize_meeting(self, meeting_id, notes):
        """Phase 1: Smart Meeting Summarizer using LLM Gateway."""
        prompt = f"""
        Summarize the following meeting notes for an enterprise leadership board.
        Extract:
        1. Key Decisions
        2. Action Items (with owners if visible)
        3. Strategic Impact on EBITDA or Revenue

        Notes:
        {notes}
        """
        summary = ask_llm(prompt)
        return {"id": meeting_id, "summary": summary, "timestamp": datetime.now().isoformat()}

    def mask_sensitive_pii(self, text: str):
        """Phase 3: Automated PII Masking for security governance."""
        import re
        # Mask PAN (5 letters, 4 digits, 1 letter)
        text = re.sub(r'[A-Z]{5}[0-9]{4}[A-Z]{1}', '[[PAN_MASKED]]', text)
        # Mask GSTIN (2 digits, 10 PAN, 1 digit, Z, 1 digit)
        text = re.sub(r'[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}', '[[GSTIN_MASKED]]', text)
        # Mask Email
        text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[[EMAIL_MASKED]]', text)
        return text

    def record_outreach(self, company_id, recipient, subject, body):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "INSERT INTO outbound_outreach (company_id, recipient, subject, body, status) VALUES (?, ?, ?, ?, ?)",
                (company_id, recipient, subject, body, "SENT")
            )
            conn.commit()
            conn.close()
            return {"status": "success", "audit_log": "Communication logged in outreach vault."}
        except Exception as e:
            print(f"Error recording outreach: {e}")
            return {"status": "error", "message": str(e)}

comm_engine = CommEngine()
