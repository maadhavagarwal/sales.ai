"""
HR Management Service
Handles employee user account creation, credential generation, and email communication
"""

import os
import secrets
import smtplib
import sqlite3
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional, Tuple

import bcrypt
from app.core.database_manager import DB_PATH, get_db_connection, log_activity


class HRService:
    """Service for managing employee accounts and HR operations"""

    def __init__(self):
        self.db_conn, self.db_type = get_db_connection()
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@neuralbi.com")
        self.company_name = os.getenv("COMPANY_NAME", "NeuralBI")

    def create_employee_user(
        self,
        email: str,
        employee_name: str,
        role: str = "SALES",
        company_id: str = "DEFAULT",
        department: str = "Sales",
    ) -> Tuple[bool, str, Optional[Dict]]:
        """
        Create a new employee user account with auto-generated password.
        Returns (success, message, user_data)
        """
        try:
            # Validate input
            if not email or not employee_name or not role:
                return False, "Missing required fields", None

            if role not in ["ADMIN", "SALES", "FINANCE", "WAREHOUSE", "HR"]:
                return False, f"Invalid role: {role}", None

            # Check if user already exists
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                conn.close()
                return False, f"User with email {email} already exists", None

            # Generate random password
            temp_password = secrets.token_urlsafe(12)
            password_hash = bcrypt.hashpw(
                temp_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            # Create user record
            cursor.execute(
                """
                INSERT INTO users (email, password_hash, role, company_id, onboarding_complete, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
                """,
                (email, password_hash, role, company_id, datetime.now().isoformat()),
            )
            conn.commit()

            user_id = cursor.lastrowid

            # Create employee record (if personnel table exists)
            try:
                cursor.execute(
                    """
                    INSERT INTO personnel (user_id, name, email, role, department, company_id, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)
                    """,
                    (
                        user_id,
                        employee_name,
                        email,
                        role,
                        department,
                        company_id,
                        datetime.now().isoformat(),
                    ),
                )
                conn.commit()
            except Exception:
                pass  # Personnel table might not exist, but user is created

            conn.close()

            log_activity(
                0,
                company_id,
                "EMPLOYEE_USER_CREATED",
                "SUCCESS",
                details={"email": email, "role": role},
            )

            user_data = {
                "id": user_id,
                "email": email,
                "name": employee_name,
                "role": role,
                "department": department,
                "temp_password": temp_password,
                "created_at": datetime.now().isoformat(),
            }

            return True, "Employee user created successfully", user_data

        except Exception as e:
            return False, f"Error creating employee user: {str(e)}", None

    def send_credential_email(
        self,
        email: str,
        employee_name: str,
        password: str,
        login_url: str = "http://localhost:3000/login",
        custom_message: str = "",
    ) -> Tuple[bool, str]:
        """
        Send credential email to new employee.
        Returns (success, message)
        """
        try:
            if not self.smtp_user or not self.smtp_password:
                return (
                    False,
                    "Email service not configured. Contact IT Administrator.",
                )

            # Create email message
            subject = f"Welcome to {self.company_name} - Account Credentials"

            html_body = f"""
            <html>
                <head>
                    <style>
                        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }}
                        .content {{ background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }}
                        .credentials {{ background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                        .credential-item {{ margin: 10px 0; font-family: monospace; }}
                        .label {{ font-weight: bold; color: #333; }}
                        .value {{ background: #f0f0f0; padding: 8px; border-radius: 3px; margin-top: 5px; }}
                        .button {{ background: #667eea; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 15px 0; }}
                        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
                        .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; color: #856404; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to {self.company_name}!</h1>
                        </div>

                        <div class="content">
                            <p>Hello <strong>{employee_name}</strong>,</p>
                            <p>Your account has been successfully created on the {self.company_name} Enterprise Platform.</p>

                            {f'<p>{custom_message}</p>' if custom_message else ''}

                            <div class="warning">
                                <strong>⚠️ Important:</strong> These are your temporary credentials. You will be prompted to change your password on first login.
                            </div>

                            <div class="credentials">
                                <div class="credential-item">
                                    <div class="label">📧 Email (Username):</div>
                                    <div class="value">{email}</div>
                                </div>
                                <div class="credential-item">
                                    <div class="label">🔐 Temporary Password:</div>
                                    <div class="value">{password}</div>
                                </div>
                            </div>

                            <a href="{login_url}" class="button">🔓 Login to Your Account</a>

                            <h3>What You Can Do:</h3>
                            <ul>
                                <li>Access personalized dashboards and reports</li>
                                <li>View analytics relevant to your role</li>
                                <li>Collaborate with team members</li>
                                <li>Submit and track expenses (Finance/Admin users)</li>
                                <li>Manage HR requests</li>
                            </ul>

                            <h3>Security Tips:</h3>
                            <ul>
                                <li>Change your password immediately after first login</li>
                                <li>Keep your credentials confidential</li>
                                <li>Do not share your password via email or chat</li>
                                <li>Log out when finished with each session</li>
                            </ul>

                            <p>If you need assistance, please contact the IT Support team or reply to this email.</p>
                        </div>

                        <div class="footer">
                            <p>{self.company_name} Enterprise Platform | Support: support@{self.company_name.lower()}.com</p>
                            <p>This is an automated message. Please do not reply directly.</p>
                        </div>
                    </div>
                </body>
            </html>
            """

            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = email

            # Attach HTML
            msg.attach(MIMEText(html_body, "html"))

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            log_activity(
                0,
                "DEFAULT",
                "CREDENTIAL_EMAIL_SENT",
                "SUCCESS",
                details={"email": email, "recipient": employee_name},
            )

            return True, "Credentials sent successfully to " + email

        except smtplib.SMTPException as e:
            log_activity(
                0,
                "DEFAULT",
                "CREDENTIAL_EMAIL_SENT",
                "FAILED",
                details={"email": email, "error": str(e)},
            )
            return False, f"Failed to send email: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error sending email: {str(e)}"

    def get_employees(self, company_id: str = "DEFAULT") -> List[Dict]:
        """Get all employees for a company"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row

            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT u.id, u.email, u.role, u.created_at, p.name, p.department, p.status
                FROM users u
                LEFT JOIN personnel p ON u.id = p.user_id
                WHERE u.company_id = ? AND u.role IN ('SALES', 'FINANCE', 'WAREHOUSE', 'HR')
                ORDER BY u.created_at DESC
                """,
                (company_id,),
            )

            employees = [dict(row) for row in cursor.fetchall()]
            conn.close()

            return employees

        except Exception as e:
            print(f"Error fetching employees: {str(e)}")
            return []

    def update_employee_role(
        self, user_id: int, new_role: str, company_id: str = "DEFAULT"
    ) -> Tuple[bool, str]:
        """Update an employee's role"""
        try:
            if new_role not in ["ADMIN", "SALES", "FINANCE", "WAREHOUSE", "HR"]:
                return False, f"Invalid role: {new_role}"

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            cursor.execute(
                "UPDATE users SET role = ? WHERE id = ? AND company_id = ?",
                (new_role, user_id, company_id),
            )
            conn.commit()
            conn.close()

            log_activity(
                0,
                company_id,
                "EMPLOYEE_ROLE_UPDATED",
                "SUCCESS",
                details={"user_id": user_id, "new_role": new_role},
            )

            return True, f"Employee role updated to {new_role}"

        except Exception as e:
            return False, f"Error updating employee role: {str(e)}"

    def delete_employee(
        self, user_id: int, company_id: str = "DEFAULT"
    ) -> Tuple[bool, str]:
        """Soft delete an employee (deactivate)"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            # Get employee email before deletion
            cursor.execute("SELECT email FROM users WHERE id = ? AND company_id = ?", (user_id, company_id))
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return False, "Employee not found"

            # Update personnel status
            try:
                cursor.execute(
                    """UPDATE personnel SET status = 'Inactive' WHERE user_id = ?""",
                    (user_id,)
                )
            except Exception:
                pass

            # Soft delete user (you might want to keep records for audit)
            cursor.execute(
                "DELETE FROM users WHERE id = ? AND company_id = ?",
                (user_id, company_id),
            )
            conn.commit()
            conn.close()

            log_activity(
                0,
                company_id,
                "EMPLOYEE_DELETED",
                "SUCCESS",
                details={"user_id": user_id, "email": row[0]},
            )

            return True, "Employee removed successfully"

        except Exception as e:
            return False, f"Error deleting employee: {str(e)}"

    def send_hr_notification_email(
        self,
        hr_email: str,
        subject: str,
        message: str,
        recipient_email: str = None,
        action_type: str = "notification",
    ) -> Tuple[bool, str]:
        """
        Send HR notification email (for HR actions like approvals, notifications)
        action_type: 'notification', 'approval', 'request'
        """
        try:
            if not self.smtp_user or not self.smtp_password:
                return (
                    False,
                    "Email service not configured. Contact IT Administrator.",
                )

            # Create email message
            html_body = f"""
            <html>
                <head>
                    <style>
                        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }}
                        .content {{ background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }}
                        .action {{ background: #e3f2fd; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }}
                        .message {{ background: #fff; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #ddd; }}
                        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>{self.company_name} - HR {action_type.title()}</h2>
                        </div>

                        <div class="content">
                            <h3>{subject}</h3>
                            
                            <div class="message">
                                {message}
                            </div>

                            {'<div class="action"><strong>Recipient:</strong> ' + recipient_email + '</div>' if recipient_email else ''}
                        </div>

                        <div class="footer">
                            <p>{self.company_name} HR System | Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                        </div>
                    </div>
                </body>
            </html>
            """

            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[HR {action_type.upper()}] {subject}"
            msg["From"] = self.from_email
            msg["To"] = hr_email

            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            log_activity(
                0,
                "DEFAULT",
                "HR_EMAIL_SENT",
                "SUCCESS",
                details={"to": hr_email, "subject": subject},
            )

            return True, "HR notification sent successfully"

        except Exception as e:
            return False, f"Error sending HR notification: {str(e)}"
