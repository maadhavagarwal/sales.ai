"""
Celery task queue for background processing
"""
import logging
import os
import shutil
import glob
from datetime import datetime, timedelta
from celery import Celery, Task
from kombu import Exchange, Queue

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    "sales_ai_platform",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes hard limit
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    result_expires=3600,  # Results expire after 1 hour
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_compression="gzip",
)

# Task routing
celery_app.conf.task_routes = {
    "app.tasks.*": {"queue": "default"}
}

# Queue definitions
default_exchange = Exchange("default", type="direct")
celery_app.conf.queues = (
    Queue("default", exchange=default_exchange, routing_key="default", queue_arguments={"x-max-priority": 10}),
)

# Periodic tasks (if using Celery Beat)
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "check-message-cleanup": {
        "task": "app.tasks.cleanup.cleanup_old_messages",
        "schedule": crontab(hour=2, minute=0),  # Every day at 2 AM
    },
    "sync-analytics": {
        "task": "app.tasks.analytics.sync_analytics_cache",
        "schedule": timedelta(minutes=15),  # Every 15 minutes
    },
    "health-check": {
        "task": "app.tasks.monitoring.system_health_check",
        "schedule": timedelta(minutes=5),  # Every 5 minutes
    },
}


class CallbackTask(Task):
    """Task base class with callbacks"""
    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3}
    retry_backoff = True


@celery_app.task(bind=True, base=CallbackTask, name="app.tasks.send_email")
def send_email_task(self, to: str, subject: str, body: str):
    """Send email asynchronously"""
    try:
        from app.services.integration_service import IntegrationService
        result = IntegrationService.send_email(to, subject, body)
        if result:
            logger.info(f"📧 Email sent to {to}: {subject}")
            return {"status": "success", "recipient": to}
        else:
            logger.warning(f"📧 Email failed for {to}: {subject}")
            raise Exception("Email service returned False")
    except Exception as exc:
        logger.error(f"📧 Email failed: {exc}")
        raise


@celery_app.task(bind=True, base=CallbackTask, name="app.tasks.process_upload")
def process_csv_upload_task(self, file_path: str, user_id: str):
    """Process CSV upload asynchronously"""
    try:
        import pandas as pd
        from app.core.database_manager import get_db_connection
        
        logger.info(f"📦 Processing upload: {file_path} for user {user_id}")
        
        # Read CSV file
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        df = pd.read_csv(file_path)
        logger.info(f"📦 CSV loaded: {len(df)} rows, {len(df.columns)} columns")
        
        # Validate CSV structure
        if df.empty:
            raise ValueError("CSV file is empty")
        
        # Determine table and validate columns
        file_name = os.path.basename(file_path).lower()
        
        db = get_db_connection()
        cursor = db.cursor()
        
        # Clean data (remove null rows, standardize column names)
        df = df.dropna(how='all')
        df.columns = [col.lower().strip().replace(' ', '_') for col in df.columns]
        
        # Insert rows based on file content
        inserted_count = 0
        
        if 'invoice' in file_name or 'bill' in file_name:
            required_cols = {'invoice_number', 'amount', 'date'}
            if not required_cols.issubset(set(df.columns)):
                raise ValueError(f"Missing required columns: {required_cols}")
            
            for _, row in df.iterrows():
                cursor.execute(
                    "INSERT INTO invoices (invoice_number, amount, invoice_date, company_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
                    (row.get('invoice_number'), row.get('amount'), row.get('date'), user_id)
                )
                inserted_count += 1
        
        elif 'customer' in file_name or 'contact' in file_name:
            required_cols = {'name', 'email'}
            if not required_cols.issubset(set(df.columns)):
                raise ValueError(f"Missing required columns: {required_cols}")
            
            for _, row in df.iterrows():
                cursor.execute(
                    "INSERT INTO customers (name, email, company_id, created_at) VALUES (?, ?, ?, datetime('now'))",
                    (row.get('name'), row.get('email'), user_id)
                )
                inserted_count += 1
        
        elif 'inventory' in file_name or 'stock' in file_name:
            required_cols = {'sku', 'quantity'}
            if not required_cols.issubset(set(df.columns)):
                raise ValueError(f"Missing required columns: {required_cols}")
            
            for _, row in df.iterrows():
                cursor.execute(
                    "INSERT INTO inventory (sku, quantity, company_id, created_at) VALUES (?, ?, ?, datetime('now'))",
                    (row.get('sku'), row.get('quantity'), user_id)
                )
                inserted_count += 1
        
        db.commit()
        cursor.close()
        db.close()
        
        logger.info(f"📦 Inserted {inserted_count} rows from {file_path}")
        return {"status": "success", "file": file_path, "user_id": user_id, "rows_inserted": inserted_count}
    except Exception as exc:
        logger.error(f"📦 Upload processing failed: {exc}")
        raise


@celery_app.task(bind=True, base=CallbackTask, name="app.tasks.generate_report")
def generate_report_task(self, report_type: str, user_id: str, parameters: dict):
    """Generate report asynchronously"""
    try:
        from app.core.database_manager import get_db_connection
        
        logger.info(f"📄 Generating {report_type} report for user {user_id}")
        
        db = get_db_connection()
        cursor = db.cursor()
        
        report_data = {}
        
        if report_type == "invoices":
            cursor.execute(
                "SELECT COUNT(*) as total, SUM(amount) as total_amount FROM invoices WHERE company_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            report_data = {
                "type": "invoices",
                "total_invoices": row[0] if row else 0,
                "total_amount": row[1] if row else 0,
                "generated_at": datetime.utcnow().isoformat()
            }
        
        elif report_type == "customers":
            cursor.execute(
                "SELECT COUNT(*) as total FROM customers WHERE company_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            report_data = {
                "type": "customers",
                "total_customers": row[0] if row else 0,
                "generated_at": datetime.utcnow().isoformat()
            }
        
        elif report_type == "inventory":
            cursor.execute(
                "SELECT COUNT(*) as total, SUM(quantity) as total_quantity FROM inventory WHERE company_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            report_data = {
                "type": "inventory",
                "total_skus": row[0] if row else 0,
                "total_quantity": row[1] if row else 0,
                "generated_at": datetime.utcnow().isoformat()
            }
        
        cursor.close()
        db.close()
        
        logger.info(f"📄 Report generated: {report_data}")
        return {"status": "success", "report_type": report_type, "user_id": user_id, "data": report_data}
    except Exception as exc:
        logger.error(f"📄 Report generation failed: {exc}")
        raise


@celery_app.task(bind=True, base=CallbackTask, name="app.tasks.sync_external_data")
def sync_external_data_task(self, source: str, parameters: dict):
    """Sync data from external sources"""
    try:
        from app.services.integration_service import IntegrationService
        
        logger.info(f"🔄 Syncing data from {source}")
        
        if source == "tally":
            company_id = parameters.get("company_id", "DEFAULT")
            company_name = parameters.get("company_name")
            result = IntegrationService.sync_tally_company(company_id, company_name=company_name)
            logger.info(f"🔄 Tally sync completed: {result}")
            return {"status": "success", "source": source, "result": result, "synced_at": datetime.utcnow().isoformat()}
        
        elif source == "zoho":
            company_id = parameters.get("company_id", "DEFAULT")
            result = IntegrationService.sync_zoho_company(company_id)
            logger.info(f"🔄 Zoho sync completed: {result}")
            return {"status": "success", "source": source, "result": result, "synced_at": datetime.utcnow().isoformat()}
        
        elif source == "analytics":
            # Refresh analytics cache
            from app.services.redis_cache import RedisCache
            cache = RedisCache()
            cache.clear_pattern("stats:*")
            logger.info(f"🔄 Analytics cache cleared")
        
        return {"status": "success", "source": source, "synced_at": datetime.utcnow().isoformat()}
    except Exception as exc:
        logger.error(f"🔄 Data sync failed: {exc}")
        raise


@celery_app.task(bind=True, base=CallbackTask, name="app.tasks.cleanup")
def cleanup_old_data_task(self):
    """Clean up old data periodically"""
    try:
        from app.core.database_manager import get_db_connection
        import shutil
        import glob
        
        logger.info("🧹 Running cleanup of old data")
        
        db = get_db_connection()
        cursor = db.cursor()
        
        # Delete messages older than 90 days
        cursor.execute(
            "DELETE FROM messaging_messages WHERE created_at < datetime('now', '-90 days')"
        )
        deleted_messages = cursor.rowcount
        
        # Archive conversations inactive for 180 days
        cursor.execute(
            "UPDATE messaging_conversations SET archived = 1 WHERE created_at < datetime('now', '-180 days') AND archived = 0"
        )
        archived_convs = cursor.rowcount
        
        db.commit()
        cursor.close()
        db.close()
        
        # Clean temporary files
        temp_dir = "/tmp/sales_ai_uploads"
        if os.path.exists(temp_dir):
            for file in glob.glob(f"{temp_dir}/*"):
                try:
                    if os.path.isfile(file):
                        os.remove(file)
                    elif os.path.isdir(file):
                        shutil.rmtree(file)
                except Exception as e:
                    logger.warning(f"Failed to delete {file}: {e}")
        
        logger.info(f"🧹 Cleanup complete: deleted {deleted_messages} messages, archived {archived_convs} conversations")
        return {"status": "success", "cleaned": {"messages": deleted_messages, "conversations": archived_convs}}
    except Exception as exc:
        logger.error(f"🧹 Cleanup failed: {exc}")
        raise


@celery_app.task(name="app.tasks.monitoring.system_health_check")
def system_health_check_task():
    """Check system health"""
    try:
        from app.core.database_manager import get_db_connection
        from app.services.redis_cache import RedisCache
        
        logger.info("🏥 Running system health check")
        
        health_status = {
            "database": "healthy",
            "redis": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check database connection
        try:
            db = get_db_connection()
            cursor = db.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            db.close()
            health_status["database"] = "healthy"
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            health_status["database"] = f"error: {str(e)[:100]}"
        
        # Check Redis connection
        try:
            cache = RedisCache()
            cache.ping()
            health_status["redis"] = "healthy"
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            health_status["redis"] = f"error: {str(e)[:100]}"
        
        logger.info(f"🏥 Health check complete: {health_status}")
        return {"status": "healthy", "checks": health_status}
    except Exception as exc:
        logger.error(f"🏥 Health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}


@celery_app.task(name="app.tasks.analytics.sync_analytics_cache")
def sync_analytics_cache_task():
    """Sync and update analytics cache"""
    try:
        from app.services.redis_cache import RedisCache
        from app.core.database_manager import get_db_connection
        
        logger.info("📊 Syncing analytics cache")
        
        cache = RedisCache()
        db = get_db_connection()
        cursor = db.cursor()
        
        # Update KPI metrics
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT company_id) as companies,
                COUNT(DISTINCT id) as users,
                SUM(amount) as total_revenue
            FROM invoices
        """)
        row = cursor.fetchone()
        
        kpi_data = {
            "companies": row[0] if row else 0,
            "users": row[1] if row else 0,
            "revenue": row[2] if row else 0,
            "synced_at": datetime.utcnow().isoformat()
        }
        
        cache.set("kpi:summary", kpi_data, ttl=3600)
        logger.info(f"📊 Updated KPI cache: {kpi_data}")
        
        cursor.close()
        db.close()
        
        return {"status": "success", "synced": "analytics", "data": kpi_data}
    except Exception as exc:
        logger.error(f"📊 Analytics sync failed: {exc}")
        raise


def get_task_status(task_id: str) -> dict:
    """Get status of a task"""
    from celery.result import AsyncResult
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
        "progress": result.info if isinstance(result.info, dict) else None
    }
