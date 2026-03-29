# NeuralBI - System Flowcharts & Architecture Diagrams

## COMPLETE FLOWCHART COLLECTION FOR SAAVISHKAR 2026 SUBMISSION

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

```mermaid
graph TB
    subgraph "User Layer"
        A["Web Dashboard<br/>Next.js 15 + React"]
        B["Mobile App<br/>iOS/Android"]
        C["API Consumers<br/>Third-party integrations"]
    end

    subgraph "API Gateway"
        D["FastAPI<br/>Rate Limiting<br/>JWT Auth<br/>Prompt Injection Detection"]
    end

    subgraph "Intelligence Layer"
        E1["NLBI Engine<br/>Text-to-SQL"]
        E2["RAG Framework<br/>Dense + Sparse Retrieval"]
        E3["Ledger Sync<br/>Double-Entry Auto-Journal"]
        E4["AI/ML Analysis<br/>Anomaly Detection<br/>Forecasting<br/>RFM Scoring"]
    end

    subgraph "Data Layer"
        F1["SQLite<br/>Multi-Tenant"]
        F2["ChromaDB/FAISS<br/>Vector Embeddings"]
        F3["Redis Cache<br/>Real-time KPIs"]
    end

    subgraph "External Integrations"
        G1["Razorpay<br/>Payment Links"]
        G2["WhatsApp<br/>Notifications"]
        G3["E-Invoicing<br/>IRN/GST"]
        G4["Tally/Zoho<br/>Sync"]
    end

    A --> D
    B --> D
    C --> D
    
    D --> E1
    D --> E2
    D --> E3
    D --> E4
    
    E1 --> F1
    E1 --> F2
    E2 --> F1
    E2 --> F2
    E3 --> F1
    E4 --> F1
    
    D -.-> F3
    
    E3 -.-> G1
    E3 -.-> G2
    E3 -.-> G3
    F1 -.-> G4
```

---

## 2. USER REGISTRATION & AUTHENTICATION FLOW

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend<br/>register/page.tsx
    participant Backend as Backend<br/>FastAPI
    participant DB as SQLite<br/>users table
    participant JWT as JWT<br/>Token Generator

    User->>Frontend: Enter email, password
    Frontend->>Frontend: Validate (email format, pwd strength)
    Frontend->>Backend: POST /register
    Backend->>Backend: Sanitize inputs
    Backend->>DB: Check if email exists
    DB-->>Backend: ✅ Not found (unique)
    Backend->>Backend: Hash password with bcrypt
    Backend->>DB: INSERT user record
    DB-->>Backend: ✓ Success (user_id=abc123)
    Backend->>JWT: Generate JWT token
    JWT-->>Backend: Token (exp: +86400s)
    Backend-->>Frontend: {"status": "success", "token": "..."}
    Frontend->>Frontend: Store token in localStorage
    Frontend-->>User: Redirect to /login
```

---

## 3. INVOICE CREATION & AUTO-JOURNALIZATION

```mermaid
graph LR
    A["Invoice Created<br/>Customer: ABC Corp<br/>Amount: ₹10,000<br/>GST: 18%"] 
    B["Validation<br/>✓ Amount > 0<br/>✓ Customer exists<br/>✓ GST rate valid"]
    C["Store Invoice<br/>→ invoices table<br/>status=DRAFT"]
    D["Publish Event<br/>INVOICE_CREATED"]
    E["Journalize Entry<br/>Debit: AR ₹11,800<br/>Credit: Revenue ₹10,000<br/>Credit: GST ₹1,800"]
    F["Validate Balance<br/>Debit=Credit?<br/>✓ YES"]
    G["Update GL<br/>Accounts Balances"]
    H["Audit Log<br/>Who, What, When"]
    I["Response to User<br/>✓ Invoice Created<br/>✓ Auto-Journalized"]
    
    A --> B --> C --> D --> E
    E --> F --> G --> H --> I
    
    F -->|FAIL| J["🚨 REJECT<br/>Log Error"]
    
    style F fill:#90EE90
    style G fill:#87CEEB
    style I fill:#FFD700
    style J fill:#FF6B6B
```

---

## 4. NATURAL LANGUAGE BUSINESS INTELLIGENCE (NLBI) FLOW

```mermaid
sequenceDiagram
    participant User as User<br/>Frontend
    participant NLBI as NLBI Engine<br/>Backend
    participant Parser as NLP Parser
    participant RAG as Hybrid RAG
    participant DB as SQLite
    participant Analyzer as Analysis<br/>Engine
    participant Generator as Response<br/>Generator

    User->>NLBI: "Why did revenue drop 15% this month?"
    NLBI->>Parser: Process query
    Parser-->>NLBI: {"intent": "why", "entities": ["revenue", "drop"]}
    
    NLBI->>RAG: Retrieve context
    RAG->>RAG: Dense retrieval (FAISS)
    RAG->>RAG: Sparse retrieval (BM25)
    RAG->>RAG: Cross-encoder fusion
    RAG-->>NLBI: Top-5 relevant docs + tables
    
    NLBI->>NLBI: Generate SQL query
    NLBI->>DB: Execute query
    DB-->>NLBI: Query results (e.g., daily revenue data)
    
    NLBI->>Analyzer: Statistical analysis I
    Analyzer-->>NLBI: Trend, anomalies, comparisons
    
    NLBI->>Generator: Generate response
    Generator-->>NLBI: {"explanation": "...", "table": {...}, "chart": {...}}
    
    NLBI-->>User: Multi-modal response<br/>- Explanation<br/>- Data table<br/>- Chart (auto-selected)<br/>- Confidence score
```

---

## 5. ANOMALY DETECTION PIPELINE

```mermaid
graph TD
    A["Transaction Feed<br/>- Invoices<br/>- Expenses<br/>- Adjustments"] 
    B["Feature Engineering<br/>- Transaction Amount<br/>- Time-of-day<br/>- Day-of-week<br/>- Customer ID<br/>- 30-day Mean<br/>- Z-score"]
    C["Isolation Forest<br/>Model<br/>100 trees<br/>max_depth=10"]
    D["Anomaly Score<br/>(0.0 - 1.0)"]
    E{"Score > Dynamic<br/>Threshold?"}
    
    F["🚨 ANOMALY<br/>Alert User<br/>WebSocket Notification<br/>Flag for Review<br/>Hold from Auto-Journal"]
    G["✓ NORMAL<br/>Auto-Journal<br/>Continue"]
    
    H["User Feedback<br/>- True Positive<br/>- False Positive<br/>- False Negative"]
    
    I["Retrain Model<br/>Weekly<br/>Improve Accuracy"]
    
    A --> B --> C --> D --> E
    E -->|YES| F
    E -->|NO| G
    
    F --> H
    G --> H
    H --> I
    I -.-> C
    
    style F fill:#FF6B6B
    style G fill:#90EE90
    style I fill:#87CEEB
```

---

## 6. REVENUE FORECASTING (ARIMA + PROPHET)

```mermaid
graph LR
    A["Historical Data<br/>Jan 2024 → Mar 2026<br/>Daily Revenue"]
    
    B["Time-Series<br/>Decomposition<br/>Trend +<br/>Seasonality +<br/>Residual"]
    
    C["Stationarity Test<br/>ADF Test<br/>p-value < 0.05?"]
    
    D1["Prophet Model<br/>Additive Seasonality<br/>Auto Changepoints"]
    
    D2["ARIMA Model<br/>Auto-parameter selection<br/>p,d,q optimization"]
    
    E["Generate Forecasts<br/>30/60/90 days"]
    
    F["Ensemble Prediction<br/>60% Prophet<br/>+ 40% ARIMA"]
    
    G["Calculate Confidence<br/>Intervals<br/>80%, 95%"]
    
    H["Output to User<br/>Point Forecast +<br/>Bounds +<br/>Scenarios<br/>Base/Bull/Bear"]
    
    A --> B --> C
    C -->|YES| D1
    C -->|NO| B
    
    D1 --> E
    D2 --> E
    
    E --> F --> G --> H
    
    style H fill:#FFD700
```

---

## 7. GENERAL LEDGER BALANCE VALIDATION

```mermaid
graph TD
    A["New Transaction<br/>Invoice/Expense/<br/>Inventory"]
    
    B["Generate Journal<br/>Entry<br/>Debit rows<br/>Credit rows"]
    
    C["Sum Debits<br/>Sum Credits"]
    
    D{"Debits =<br/>Credits?"}
    
    E["✅ BALANCED<br/>Post to GL<br/>Update Balances<br/>Audit Log"]
    
    F["🚨 IMBALANCED<br/>REJECT<br/>Log Error<br/>Alert Finance<br/>Return to user"]
    
    G["Trial Balance<br/>All accounts"]
    
    H{"Overall Balance =<br/>0?"}
    
    I["✅ GL PERFECT<br/>RECONCILED"]
    
    J["🚨 GL OUT OF<br/>BALANCE<br/>Emergency Alert"]
    
    A --> B --> C --> D
    D -->|YES| E --> G
    D -->|NO| F
    
    G --> H
    H -->|YES| I
    H -->|NO| J
    
    I --> K["KPI Dashboard<br/>Update"]
    
    style E fill:#90EE90
    style I fill:#90EE90
    style F fill:#FF6B6B
    style J fill:#FF6B6B
```

---

## 8. DATA INGESTION & ML PIPELINE

```mermaid
graph LR
    A["User Uploads<br/>CSV/Excel<br/>Max 50MB"]
    
    B["File Validation<br/>✓ Type check<br/>✓ Size limit<br/>✓ Malware scan"]
    
    C["Data Parsing<br/>- Detect encoding<br/>- Infer data types<br/>- Handle missing values<br/>- Normalize columns"]
    
    D["Schema Mapping<br/>Auto-categorize:<br/>INVOICE/CUSTOMER/<br/>INVENTORY/EXPENSE"]
    
    E["Transform<br/>- Deduplicate<br/>- Encrypt sensitive<br/>- Limit to 20K rows"]
    
    F["Background ML Job<br/>- Clustering<br/>- Normalization<br/>- Feature extraction<br/>- Statistical profiling"]
    
    G["Index & Search<br/>- ChromaDB vectors<br/>- SQLite FTS<br/>- Semantic index"]
    
    H["User Dashboard<br/>- Row count<br/>- Column analysis<br/>- Quality score<br/>- Visualization preview"]
    
    A --> B --> C --> D --> E
    
    E --> F
    F --> G --> H
    
    I["Data Ready for<br/>NLBI Queries"]
    H --> I
    
    style I fill:#FFD700
```

---

## 9. MULTI-TENANT ISOLATION ARCHITECTURE

```mermaid
graph TB
    subgraph "Frontend"
        FE["Next.js SPA<br/>Workspace Switch<br/>Company Context"]
    end
    
    subgraph "API Gateway"
        AUTH["JWT Middleware<br/>Extract company_id<br/>Validate permissions"]
    end
    
    subgraph "Database Layer"
        D1["Company A<br/>- Users<br/>- Invoices<br/>- Customers<br/>- GL Entries"]
        
        D2["Company B<br/>- Users<br/>- Invoices<br/>- Customers<br/>- GL Entries"]
        
        D3["Company C<br/>- Users<br/>- Invoices<br/>- Customers<br/>- GL Entries"]
        
        AUDIT["Audit Logs<br/>(central)<br/>Track access"]
    end
    
    subgraph "Query Isolation"
        Q1["SELECT * FROM invoices<br/>WHERE company_id = A"]
        Q2["SELECT * FROM invoices<br/>WHERE company_id = B"]
    end
    
    FE --> AUTH
    AUTH -->|company_id=A| Q1 --> D1
    AUTH -->|company_id=B| Q2 --> D2
    
    AUTH --> AUDIT
    D1 --> AUDIT
    D2 --> AUDIT
    
    style D1 fill:#FFE4B5
    style D2 fill:#FFE4B5
    style D3 fill:#FFE4B5
    style AUDIT fill:#87CEEB
```

---

## 10. GST COMPLIANCE FLOW

```mermaid
graph TD
    A["Invoice Created<br/>Amount: ₹10,000<br/>GST Rate: 18%"]
    
    B["Calculate GST<br/>CGST: 9% = ₹900<br/>SGST: 9% = ₹900<br/>Total: ₹11,800"]
    
    C["Supply Type<br/>Intra-state or<br/>Inter-state?"]
    
    D1["Intra-State<br/>CGST + SGST"]
    D2["Inter-State<br/>IGST (18%)"]
    
    E["Record in<br/>GSTR Database<br/>gst_transactions"]
    
    F["Monthly Report<br/>Generation"]
    
    G1["GSTR-1<br/>Outward Supplies<br/>Customer-wise"]
    
    G2["GSTR-2<br/>Inward Supplies<br/>Vendor-wise"]
    
    G3["GSTR-3B<br/>Tax Return<br/>Output - Input"]
    
    H["Export as<br/>JSON/XML<br/>For GST Portal"]
    
    A --> B --> C
    C -->|Intra| D1
    C -->|Inter| D2
    D1 --> E
    D2 --> E
    
    E --> F
    F --> G1
    F --> G2
    F --> G3
    
    G1 --> H
    G2 --> H
    G3 --> H
    
    I["Upload to<br/>GST Portal<br/>gst.gov.in"]
    
    H --> I
    
    style G1 fill:#B0E0E6
    style G2 fill:#B0E0E6
    style G3 fill:#B0E0E6
    style I fill:#FFD700
```

---

## 11. CUSTOMER CHURN PREDICTION

```mermaid
graph TD
    A["Customer Transaction<br/>History<br/>12+ months"]
    
    B["Feature Extraction<br/>- Recency (days since last purchase)<br/>- Frequency (purchase count)<br/>- Monetary (total spend)<br/>- AOV (Average Order Value)<br/>- Days Active<br/>- Email engagement<br/>- Support tickets"]
    
    C["RFM Segmentation<br/>R=Recency Score<br/>F=Frequency Score<br/>M=Monetary Score"]
    
    D["Train ML Model<br/>Isolation Forest or<br/>Gradient Boosting"]
    
    E["Churn Score<br/>0.0-1.0"]
    
    F{"Score ><br/>0.7?"}
    
    G["🚨 HIGH RISK<br/>CHURN_ALERT<br/>Notify Sales Team<br/>Suggest retention offer"]
    
    H["✓ LOW RISK<br/>Continue monitoring"]
    
    I["Feedback Loop<br/>- Did customer churn?<br/>- Was intervention<br/>successful?"]
    
    J["Retrain Monthly<br/>Improve Accuracy"]
    
    A --> B --> C --> D --> E --> F
    F -->|YES| G
    F -->|NO| H
    
    G --> I
    H --> I
    I --> J
    J -.-> D
    
    style G fill:#FF6B6B
    style H fill:#90EE90
    style J fill:#87CEEB
```

---

## 12. REAL-TIME KPI DASHBOARD (WebSocket Flow)

```mermaid
sequenceDiagram
    participant User as User<br/>Browser
    participant Dashboard as Dashboard<br/>Frontend
    participant WS as WebSocket<br/>Server
    participant Engine as KPI<br/>Calculation
    participant Cache as Redis<br/>Cache
    participant DB as SQLite<br/>Database

    User->>Dashboard: Open Dashboard
    Dashboard->>WS: Connect WebSocket<br/>ws://api/ws/kpi-stream
    WS-->>Dashboard: ✓ Connected
    
    Dashboard->>WS: Subscribe to KPI updates<br/>["revenue", "profit", "orders"]

    loop Every 5 seconds
        WS->>Cache: Get cached KPIs
        Cache-->>WS: Return values
        
        alt Cache miss or stale
            WS->>Engine: Trigger KPI calc
            Engine->>DB: Query latest data
            DB-->>Engine: Results
            Engine->>Cache: Store results
            Engine-->>WS: KPI values
        end
        
        WS-->>Dashboard: Push update<br/>{"revenue": "₹50L", "profit": "₹12L"}
        Dashboard->>Dashboard: Re-render charts
        Dashboard-->>User: Live update (smooth animation)
    end

    User->>Dashboard: Close/Logout
    Dashboard->>WS: Disconnect WebSocket
```

---

## 13. PAYMENT LINK & RECONCILIATION FLOW

```mermaid
graph LR
    A["Invoice Sent<br/>to Customer<br/>with Razorpay<br/>Payment Link"]
    
    B["Customer<br/>Clicks Link<br/>Razorpay UI"]
    
    C["Customer<br/>Completes<br/>Payment"]
    
    D["Razorpay<br/>Webhook<br/>POST /payment-webhook"]
    
    E["Verify Webhook<br/>Signature<br/>SHA256"]
    
    F{"Signature<br/>Valid?"}
    
    G["Update Invoice<br/>Status = PAID<br/>Payment Date"]
    
    H["Auto-Journalize<br/>Debit: Bank/Cash<br/>Credit: AR"]
    
    I["Update Customer<br/>Payment History<br/>AR balance"]
    
    J["Send Receipt<br/>WhatsApp +<br/>Email"]
    
    K["Dashboard<br/>Updates<br/>Cash inflow KPI"]
    
    F -->|REJECT| L["🚨 VERIFY FAILED<br/>Log & Alert"]
    F -->|ACCEPT| G
    
    A --> B --> C --> D --> E --> F
    F -->|YES| G --> H --> I --> J --> K
    
    style K fill:#FFD700
    style L fill:#FF6B6B
```

---

## 14. INVENTORY VALUATION & COGS FLOW

```mermaid
graph TD
    A["Purchase Order<br/>100 units @ ₹100<br/>= ₹10,000"]
    
    B["Goods Receipt<br/>Inventory +100<br/>Freight: ₹500"]
    
    C["Landed Cost<br/>Unit Cost = (10,000+500) / 100<br/>= ₹105/unit"]
    
    D["Stock In GL<br/>Debit: Inventory ₹10,500<br/>Credit: Payable ₹10,500"]
    
    E["Sale: 50 units<br/>@ ₹200/unit"]
    
    F["COGS Calculation<br/>Valuation Method:"]
    
    F1["FIFO<br/>50 units @ ₹105<br/>= ₹5,250"]
    
    F2["LIFO<br/>50 units @ ₹105<br/>= ₹5,250"]
    
    F3["Weighted Avg<br/>50 units @ avg cost<br/>= ₹5,250"]
    
    G["GL Entries<br/>Debit: COGS ₹5,250<br/>Credit: Inventory ₹5,250"]
    
    H["Inventory Balance<br/>50 units remaining<br/>Book value: ₹5,250"]
    
    I["Valuation Report<br/>Current GL Inventory<br/>= ₹5,250"]
    
    A --> B --> C --> D
    D --> E --> F
    F --> F1
    F --> F2
    F --> F3
    
    F1 --> G
    F2 --> G
    F3 --> G
    
    G --> H --> I
    
    style G fill:#B0E0E6
    style I fill:#FFD700
```

---

## 15. SYSTEM ERROR RECOVERY & ROLLBACK

```mermaid
graph TD
    A["Transaction Initiated<br/>Invoice → GL Journal"]
    
    B["Begin SQL<br/>Transaction"]
    
    C["Execute Steps<br/>1. Insert invoice<br/>2. Generate GL entries<br/>3. Update balances"]
    
    D{"All Steps<br/>Successful?"}
    
    E["COMMIT<br/>Transaction<br/>✓ Data persisted"]
    
    F["🚨 ERROR<br/>Detected<br/>e.g., GL imbalance"]
    
    G["ROLLBACK<br/>Transaction<br/>Undo all changes"]
    
    H["Alert Engineering<br/>Log error details<br/>Notify user"]
    
    I["Retry Logic<br/>Auto-retry 3x<br/>with exponential backoff"]
    
    J["Manual Review<br/>Finance team<br/>investigates"]
    
    A --> B --> C --> D
    D -->|YES| E
    D -->|NO| F --> G --> H
    
    H --> I
    I -->|Still Failing| J
    
    E --> K["Notification<br/>Success ✓"]
    J --> L["Resolution<br/>Fix & retry"]
    
    style E fill:#90EE90
    style K fill:#90EE90
    style F fill:#FF6B6B
    style G fill:#FF6B6B
```

---

## 16. ROLE-BASED ACCESS CONTROL (RBAC)

```mermaid
graph TD
    A["User Login<br/>JWT Token Generated<br/>with role claim"]
    
    B{"User Role?"}
    
    ADMIN["👤 ADMIN<br/>✓ All features<br/>✓ User management<br/>✓ Settings<br/>✓ Reports<br/>✓ Audit logs"]
    
    SALES["💼 SALES<br/>✓ View invoices<br/>✓ Manage customers<br/>✓ View forecasts<br/>✗ GL access<br/>✗ User mgmt"]
    
    FINANCE["💰 FINANCE<br/>✓ View/Create invoices<br/>✓ Expenses<br/>✓ GL + Reconciliation<br/>✓ GST reports<br/>✗ Delete invoices<br/>✗ User settings"]
    
    WAREHOUSE["📦 WAREHOUSE<br/>✓ View inventory<br/>✓ Adjust stock<br/>✓ Goods receipt<br/>✗ View invoices<br/>✗ GL access"]
    
    B -->|Admin| ADMIN
    B -->|Sales| SALES
    B -->|Finance| FINANCE
    B -->|Warehouse| WAREHOUSE
    
    ADMIN --> C["Full System<br/>Access"]
    SALES --> D["Sales Workspace"]
    FINANCE --> E["Accounting<br/>Workspace"]
    WAREHOUSE --> F["Inventory<br/>Workspace"]
```

---

## 17. END-OF-MONTH CLOSE PROCESS

```mermaid
graph TD
    A["Month End<br/>Last day of month"]
    
    B["Cutoff<br/>Stop new transactions<br/>for previous month"]
    
    C["GL Reconciliation<br/>Trial balance<br/>Debit = Credit?"]
    
    C1["✓ BALANCED"]
    C2["🚨 IMBALANCED<br/>Investigate"]
    
    D["Sub-ledger<br/>Reconciliation<br/>- AR aging<br/>- AP aging<br/>- Inventory"]
    
    E["Bank<br/>Reconciliation<br/>GL Cash vs<br/>Bank statement"]
    
    F["Adjust entries<br/>Any required<br/>timing differences"]
    
    G["GST<br/>Reconciliation<br/>GSTR vs GL"]
    
    H["Generate<br/>Financial<br/>Statements<br/>- P&L<br/>- Balance Sheet<br/>- Cash Flow"]
    
    I["Audit Review<br/>Finance team<br/>sign-off"]
    
    J["Close Month<br/>Lock period<br/>No more edits"]
    
    K["Reports<br/>Published<br/>Dashboard updates"]
    
    A --> B --> C
    C -->|YES| C1
    C -->|NO| C2
    
    C1 --> D --> E --> F --> G --> H --> I --> J --> K
    C2 -.-> F
    
    style K fill:#FFD700
    style J fill:#87CEEB
```

---

## 18. DISASTER RECOVERY & BACKUP

```mermaid
graph LR
    A["Daily Transactions<br/>Invoices, Expenses<br/>GL updates"]
    
    B["Continuous Replication<br/>Primary DB →<br/>Standby DB<br/>6-second lag"]
    
    C["Automated Backups<br/>Daily @ 2 AM<br/>Full backup<br/>7-day retention"]
    
    D["Backup Storage<br/>Cloud Storage<br/>S3 / Azure Blob<br/>Geo-replicated"]
    
    E["Disaster<br/>Detection<br/>Primary fails"]
    
    F["Failover<br/>Standby → Primary<br/>RTO: <1 hour<br/>RPO: <15 min"]
    
    G["Data Restored<br/>From last backup<br/>+ replication logs"]
    
    H["System Online<br/>Operations resume"]
    
    I["Root Cause<br/>Analysis<br/>Investigation"]
    
    J["Recovery<br/>Plan<br/>Fix & prevention"]
    
    A --> B --> C --> D
    
    D --> E --> F --> G --> H
    
    E --> I --> J
    
    style H fill:#90EE90
    style D fill:#87CEEB
```

---

## KEY METRICS DASHBOARD

```mermaid
graph TB
    subgraph "Real-Time KPIs"
        K1["💰 Revenue YTD<br/>₹2.5 Crores<br/>📈 +15% vs LY"]
        K2["💵 Gross Profit<br/>₹75 Lakhs<br/>📉 -2% vs target"]
        K3["📦 Avg Order Value<br/>₹8,750<br/>📈 +8% vs avg"]
        K4["🛒 Units Sold<br/>28,571<br/>status: on-track"]
    end
    
    subgraph "Operational Health"
        O1["🔴 Overdue Invoices<br/>₹12 Lakhs<br/>🕐 50 days avg"]
        O2["📊 Inventory Turns<br/>6.2x/year<br/>status: healthy"]
        O3["⚠️ Anomalies Detected<br/>3 this week<br/>2 resolved"]
        O4["✅ GL Balance<br/>Perfect<br/>Reconciled"]
    end
    
    subgraph "Financial Health"
        F1["💳 Cash Position<br/>₹50 Lakhs<br/>📈 inflow"]
        F2["🎯 Forecast (30d)<br/>₹90 Lakhs revenue<br/>confidence: 92%"]
        F3["📈 Churn Risk<br/>5 customers<br/>alert: medium"]
        F4["✅ Compliance<br/>GST returns filed<br/>100% compliant"]
    end
    
    style K1 fill:#FFE4B5
    style K2 fill:#FFE4B5
    style K3 fill:#FFE4B5
    style K4 fill:#FFE4B5
    
    style O1 fill:#FFB6C1
    style O2 fill:#B0E0E6
    style O3 fill:#FFD700
    style O4 fill:#90EE90
    
    style F1 fill:#B0E0E6
    style F2 fill:#FFD700
    style F3 fill:#FFD700
    style F4 fill:#90EE90
```

---

## DEPLOYMENT PIPELINE

```mermaid
graph LR
    A["GitHub Commit<br/>Code push"]
    
    B["CI Pipeline<br/>Run tests<br/>Code review<br/>Build checks"]
    
    B1["✓ Tests Pass"]
    B2["🚨 Fails"]
    
    C["Build Docker<br/>Image<br/>Backend container<br/>Frontend container"]
    
    D["Push to Registry<br/>GitHub Container<br/>Registry"]
    
    E["Deploy to<br/>Staging<br/>Render/AWS<br/>Smoke tests"]
    
    F["🧪 QA Testing<br/>Feature validation<br/>Performance test<br/>Security scan"]
    
    G["Manual Approval<br/>Release manager<br/>approval"]
    
    H["Deploy to<br/>Production<br/>Blue-green<br/>deployment<br/>Zero-downtime"]
    
    I["Monitor<br/>Error rates<br/>Performance<br/>User experience"]
    
    A --> B
    B -->|YES| B1
    B -->|NO| B2
    
    B1 --> C --> D --> E --> F --> G --> H --> I
    
    B2 -.-> A
    
    style H fill:#FFD700
    style I fill:#87CEEB
```

---

**END OF FLOWCHART DOCUMENTATION**

All diagrams are production-ready Mermaid syntax and can be stored in markdown files or rendered in documentation tools.

