# 📋 Team Quick Start Guide

## Enterprise Sales AI Platform - Getting Started

**Your Goal This Week**: Complete Phase 1 (Database Integration)

---

## 📊 Current Status

```
✅ COMPLETED (95%)
├── Frontend UI (3 modules) - Done
├── Backend APIs (17 endpoints) - Done
├── Navigation integration - Done
└── Documentation - Done

⏳ TODO (5%)
├── Database setup - This week
├── API integration - Next week
├── Testing & QA - Week 3
└── Production deploy - Week 4
```

---

## 🎯 Your Assignment This Week

### Database Setup Tasks

**Task 1: PostgreSQL Installation**
- [ ] Install PostgreSQL 14+
- [ ] Verify: `psql --version`
- [ ] Create database: `createdb sales_ai_db`
- [ ] Create user: `createuser sales_user`
- [ ] Test connection

**Task 2: Run Migrations**
- [ ] Execute `001_create_messaging_tables.sql`
- [ ] Execute `002_create_meetings_tables.sql`
- [ ] Execute `003_create_indexes.sql`
- [ ] Verify tables exist: `\dt` in psql

**Task 3: Backend Integration**
- [ ] Create SQLAlchemy models (see DATABASE_INTEGRATION_GUIDE.md)
- [ ] Update API routes with database queries
- [ ] Test endpoints return real data
- [ ] Run 10 unit tests successfully

**Task 4: Data Seeding**
- [ ] Insert sample users
- [ ] Insert sample conversations
- [ ] Insert sample messages
- [ ] Insert sample meetings
- [ ] Verify data with SELECT queries

**Task 5: Testing & Validation**
- [ ] Run test_database_integration.py
- [ ] All 5 test cases passing
- [ ] API response time < 200ms
- [ ] Ready for week 2 handoff

---

## 📁 Files You'll Need

```
For Database Setup:
📄 DATABASE_INTEGRATION_GUIDE.md - Your main reference
📄 backend/app/migrations/001_*.sql
📄 backend/app/migrations/002_*.sql
📄 backend/app/migrations/003_*.sql

For Development:
📄 LAUNCH_EXECUTION_PLAN.md - Week-by-week breakdown
📄 DEPLOYMENT_READINESS.md - Quality checklist
📄 ENTERPRISE_DEPLOYMENT_GUIDE.md - Docker setup

For Backend Code:
📁 backend/app/models/
📁 backend/app/routes/
📁 backend/tests/
```

---

## 🚀 Getting Started (Copy/Paste Commands)

### Step 1: PostgreSQL Setup
```bash
# Check if PostgreSQL is installed
psql --version

# Create database and user
createdb sales_ai_db
createuser sales_user
psql -u postgres

# In psql prompt:
ALTER USER sales_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sales_ai_db TO sales_user;
\q
```

### Step 2: Run Migrations
```bash
# Connect to the database
psql -U sales_user -d sales_ai_db

# Copy/paste each migration script
\i backend/app/migrations/001_create_messaging_tables.sql
\i backend/app/migrations/002_create_meetings_tables.sql
\i backend/app/migrations/003_create_indexes.sql

# Verify tables created
\dt

# List indexes
\di

# Exit
\q
```

### Step 3: Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variable
export DATABASE_URL="postgresql://sales_user:password@localhost:5432/sales_ai_db"

# Run tests
pytest tests/
```

### Step 4: Run Application
```bash
# Backend
uvicorn app.main:app --reload

# Frontend (in another terminal)
cd frontend
npm run dev
```

---

## 🧪 Daily Testing Checklist

### Morning (Before Standup)
- [ ] Backend API starts without errors
- [ ] Database connection successful
- [ ] 10+ unit tests passing
- [ ] No TypeScript errors
- [ ] No console errors

### Afternoon (Mid-Day Check)
- [ ] All CRUD operations working
- [ ] Database queries return correct data
- [ ] API response time logged
- [ ] No memory leaks detected

### Evening (Before You Leave)
- [ ] Push code to branch
- [ ] All tests still passing
- [ ] Document progress
- [ ] Note any blockers

---

## 📞 Common Questions & Answers

**Q: Where do I start?**  
A: Read DATABASE_INTEGRATION_GUIDE.md first (20 mins), then run the PostgreSQL setup commands above.

**Q: I'm getting a database connection error**  
A: Check your DATABASE_URL environment variable and verify PostgreSQL is running: `psql -U sales_user`

**Q: What if a migration fails?**  
A: Check the error message, verify your SQL syntax, and review the migration script. Use `-U sales_user` flag with psql.

**Q: How do I know if the backend is connected?**  
A: Make a GET request to `http://localhost:8000/api/messaging/conversations`. If you get JSON back, it's working!

**Q: Should I modify the database schema?**  
A: Only as approved by the technical lead. All schema changes need database review first.

---

## 🎓 Learning Resources

### If You're New to...

**PostgreSQL**
- PostgreSQL docs: https://www.postgresql.org/docs/14/
- Quick tutorial: https://www.postgresql.org/docs/14/tutorial.html
- Our schema: See DATABASE_INTEGRATION_GUIDE.md

**SQLAlchemy**
- FastAPI + SQLAlchemy: https://fastapi.tiangolo.com/sql-databases/
- SQLAlchemy ORM: https://docs.sqlalchemy.org/
- Our models: See backend/app/models/

**FastAPI**
- FastAPI tutorial: https://fastapi.tiangolo.com/tutorial/
- Database integration: https://fastapi.tiangolo.com/sql-databases/
- Our routes: See backend/app/routes/

**Docker**
- Docker setup guide: https://docs.docker.com/get-started/
- Docker Compose: https://docs.docker.com/compose/
- Our config: See ENTERPRISE_DEPLOYMENT_GUIDE.md

---

## 🐛 Debugging Tips

### Database Connection Issues
```bash
# Test connection
psql -U sales_user -d sales_ai_db -c "SELECT 1;"

# Check environment variable
echo $DATABASE_URL

# Verify password
psql -U sales_user -h localhost -d sales_ai_db
```

### API Not Responding
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check logs
tail -f logs/app.log

# Verify database in logs
grep -i "database" logs/app.log
```

### Tests Not Passing
```bash
# Run with verbose output
pytest -v tests/

# Run single test
pytest tests/test_messaging.py::test_create_conversation -v

# See what's failing
pytest --tb=short
```

---

## ✅ Week 1 Completion Criteria

You've completed Week 1 when:

- [x] PostgreSQL database created and verified
- [x] All 3 migration scripts executed successfully
- [x] 8 tables exist in database
- [x] 15+ indexes created
- [x] SQLAlchemy models created and working
- [x] Backend API routes connected to database
- [x] Sample data inserted (100+ records)
- [x] All 10+ unit tests passing
- [x] API response time < 200ms measured
- [x] Documentation updated with results
- [x] Code pushed to main branch
- [x] Code review approved
- [x] Ready to hand off to frontend team

---

## 🚨 Red Flags (Stop and Ask for Help)

🛑 **Stop here and ask for help if:**
- Database connection fails after 30 minutes
- Migrations don't execute without SQL errors
- API returns 500 errors consistently
- Tests fail with permissions errors
- You can't push code to the repository

---

## 📞 Who to Ask For Help

| Problem | Contact | Time |
|---------|---------|------|
| Database issue | Database Admin | Anytime |
| Code review needed | Backend Lead | After task |
| Environment setup | DevOps Engineer | First day |
| Test failure | QA Engineer | After implementation |
| Timeline question | Project Manager | Daily standup |

---

## 🏆 Success Looks Like

You'll know Week 1 went well when:

✅ Database is running with real data  
✅ Backend APIs return data from database  
✅ Tests show API response time < 200ms  
✅ Team can see conversations and messages in database  
✅ No console errors or warnings  
✅ Code is clean and documented  
✅ Team ready for Week 2 frontend integration  

---

## 📅 Daily Timeline

### Monday - Kickoff & Setup
- 9:00 AM - Team standup
- 10:00 AM - Start PostgreSQL setup
- 12:00 PM - Lunch + debug database issues
- 2:00 PM - Run migrations
- 4:00 PM - Daily standup update

### Tuesday & Wednesday - Implementation
- Start: Create SQLAlchemy models + update routes
- Mid-day: Integration testing
- End-of-day: Code review + commit

### Thursday - Testing
- Run full test suite
- Performance benchmarking
- Bug fixes if needed

### Friday - Completion & Handoff
- Final testing
- Documentation
- Code review
- Ready for Week 2!

---

## 🎁 Bonus Tips

### Pro Tips
1. **Use git branches** - Create `feature/database-integration` branch
2. **Test frequently** - Don't wait until end of day to test
3. **Document as you go** - Update comments and docstrings
4. **Ask questions early** - Don't wait until stuck for 2 hours
5. **Celebrate wins** - Migrations working? Migrations passing? Tell the team!

### Tools That Help
- DBeaver or pgAdmin for database visualization
- Postman or Insomnia for API testing
- VS Code SQL extension for query writing
- SQLAlchemy-utils for utility functions

---

## 🎯 Remember

You're not just building a database—you're building the foundation for a professional, enterprise-grade platform. Take pride in your work, ask questions, and help teammates when they're stuck.

**You've got this! 💪**

---

**For detailed information, always refer to:**
- DATABASE_INTEGRATION_GUIDE.md
- LAUNCH_EXECUTION_PLAN.md
- DEPLOYMENT_READINESS.md

Good luck! 🚀

*Last Updated: March 19, 2026*
