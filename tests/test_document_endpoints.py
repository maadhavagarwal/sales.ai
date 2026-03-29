"""Test document endpoints with newly added database tables."""
import sys
import os
import json
import sqlite3
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.database_manager import init_workspace_db
from app.engines.document_engine import DocumentEngine

def test_documents_table_exists():
    """Verify documents table was created in database schema."""
    # Initialize database (creates tables)
    init_workspace_db()
    
    # Get the correct DB path from database_manager
    from app.core.database_manager import DB_PATH
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check documents table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
    assert cursor.fetchone() is not None, "documents table not created"
    
    # Check document_versions table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='document_versions'")
    assert cursor.fetchone() is not None, "document_versions table not created"
    
    # Check documents table has required columns
    cursor.execute("PRAGMA table_info(documents)")
    columns = [col[1] for col in cursor.fetchall()]
    required_cols = ['id', 'company_id', 'title', 'doc_type', 'template_id', 'content_json', 
                     'format', 'status', 'file_size', 'created_by', 'generated_at', 
                     'segment_id', 'recipient_email']
    for col in required_cols:
        assert col in columns, f"documents table missing column: {col}"
    
    # Check document_versions table has required columns
    cursor.execute("PRAGMA table_info(document_versions)")
    columns = [col[1] for col in cursor.fetchall()]
    required_cols = ['id', 'document_id', 'version', 'content_json', 'change_summary', 'created_by', 'created_at']
    for col in required_cols:
        assert col in columns, f"document_versions table missing column: {col}"
    
    conn.close()
    print("✅ documents and document_versions tables created successfully")

def test_document_engine_operations():
    """Verify DocumentEngine can perform CRUD operations with new tables."""
    # Get the correct DB path from database_manager
    from app.core.database_manager import DB_PATH
    
    # Initialize database
    init_workspace_db()
    
    try:
        # Test generate_document
        doc_result = DocumentEngine.generate_document(
            company_id="test_company",
            title="Test Report",
            doc_type="sales_report",
            data={"sales": 100000, "revenue": 500000},
            created_by=1,
            segment_id="high_value"
        )
        
        print(f"DEBUG: generate_document returned: {doc_result}")
        assert "document_id" in doc_result or "id" in doc_result, f"generate_document should return document_id or id, got: {doc_result}"
        doc_id = doc_result.get("document_id") or doc_result.get("id", doc_result.get("id"))
        print(f"✅ Document generated successfully: {doc_id}")
        
        # Test list_documents
        docs = DocumentEngine.list_documents("test_company")
        assert len(docs) > 0, "Should find generated document"
        print(f"✅ list_documents works: found {len(docs)} document(s)")
        
        # Test get_document
        doc = DocumentEngine.get_document(doc_id, "test_company")
        assert "error" not in doc, f"get_document failed: {doc}"
        assert doc["title"] == "Test Report", "Document title mismatch"
        assert "versions" in doc, "Document should have versions list"
        print(f"✅ get_document works: {doc['title']}")
        
        # Verify data in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check documents table
        cursor.execute("SELECT id, title, status FROM documents WHERE id=?", (doc_id,))
        row = cursor.fetchone()
        assert row is not None, "Document not found in database"
        assert row[1] == "Test Report", f"Document title mismatch in DB: {row[1]}"
        assert row[2] == "generated", f"Document status should be 'generated': {row[2]}"
        print(f"✅ Document data verified in database")
        
        # Check document_versions table
        cursor.execute("SELECT COUNT(*) FROM document_versions WHERE document_id=?", (doc_id,))
        version_count = cursor.fetchone()[0]
        assert version_count > 0, "No versions found for document"
        print(f"✅ Document versions created: {version_count}")
        
        conn.close()
        
        print("\n✅ ALL DOCUMENT TESTS PASSED - Tables and DocumentEngine working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Document engine test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("TESTING DOCUMENT DATABASE SCHEMA")
    print("=" * 60)
    
    try:
        test_documents_table_exists()
        print()
        test_document_engine_operations()
    except AssertionError as e:
        print(f"❌ TEST FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
