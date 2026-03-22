# Expense Management & GST Compliance System

## Overview

The Sales AI Platform now includes comprehensive expense management and GST compliance features enabling businesses to:
- Upload and manage business expenses
- Automatically calculate GST (CGST, SGST, IGST)
- Track Input Tax Credit (ITC) eligibility
- Generate GST returns (GSTR-1, GSTR-2, GSTR-3B)
- Maintain complete tax compliance

## Features

### 1. Expense Management

#### Expense Upload & Integration
- **Supported Formats**: CSV and Excel files
- **Auto-Detection**: System automatically categorizes expenses
- **Drag & Drop**: Upload experience from the Expenses page
- **Bulk Import**: Process multiple expenses at once

#### Expense Tracking
- **Categories**: Automatically mapped to GST rates (Office Supplies, Electricity, Internet, Travel, etc.)
- **GST Calculation**: Auto-calculates CGST, SGST, IGST based on expense category
- **ITC Eligible**: Marks whether expense is eligible for Input Tax Credit
- **Vendor Details**: Capture vendor GSTIN for compliance

#### Expense Fields
```
- Date: Transaction date
- Category: Expense category (auto-mapped to GST rates)
- Amount: Expense amount
- Description: Detailed description
- HSN Code: HSN/SAC code if applicable
- GST Rate: Auto-calculated based on category
- Vendor Name: Supplier/Vendor name
- Vendor GSTIN: Vendor's GST registration number
- Invoice Number: Vendor's invoice reference
- Expense Type: INPUT (ITC eligible) or NON-INPUT
- Bill Attached: Whether original bill is stored
```

### 2. GST Rate Mapping

Auto-calculated GST rates by expense category:
- **5% - INPUT**: Office supplies, electricity, water, travel, fuel, maintenance
- **18% - INPUT**: Internet, consulting, software, marketing, equipment
- **18% - NON-INPUT**: Professional fees, entertainment
- **0% - NON-INPUT**: Rent (unless landlord registered), insurance, salaries
- **28% - INPUT**: Motor vehicle accessories

### 3. GST Transaction Recording

Record both sales and purchases for complete GST reconciliation:
- **Sales Transactions**: Track outward supplies with customer GSTIN
- **Purchase Transactions**: Track inward supplies with vendor GSTIN
- **Place of Supply**: SAME (CGST+SGST) or OTHER (IGST)
- **HSN/SAC Codes**: For proper classification

### 4. GST Return Generation

#### GSTR-1 (Outward Supply)
- **Purpose**: File all supplies made during the month
- **Filing Deadline**: 11th of next month (26th for monthly, quarterly filers)
- **Contents**: 
  - Invoice-wise details of all B2B supplies
  - Total sales, CGST, SGST, IGST
  - Customer GSTIN mapping

#### GSTR-2 (Inward Supply)
- **Purpose**: Record all purchases and Input Tax Credit
- **Filing Deadline**: 15th of next month
- **Contents**:
  - Purchase details from vendors
  - Eligible expenses from company expenditure
  - Total input tax credit claimed

#### GSTR-3B (Monthly Tax Return)
- **Purpose**: Main return showing net tax liability
- **Filing Deadline**: 20th of next month
- **Contents**:
  - Output tax (from GSTR-1)
  - Input tax credit (from GSTR-2)
  - **Net tax payable** (Output - ITC)
  - Most important form for tax deposit

### 5. GST Reconciliation

Monthly reconciliation workflow:
1. **Data Collection**: Gather all sales, purchases, and expenses for the month
2. **Validation**: Reconciliation checks for discrepancies
3. **Finalization**: Mark transactions as reconciled
4. **Report Generation**: Prepare GSTR returns
5. **Filing**: Submit returns through GST portal

## Database Schema

### Expenses Table (Enhanced)
```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY,
    company_id TEXT,
    date TEXT,
    category TEXT,
    amount REAL,
    description TEXT,
    payment_method TEXT,
    hsn_code TEXT,                -- HSN/SAC code
    gst_rate REAL DEFAULT 0.0,    -- 5%, 18%, 28%, etc.
    cgst_amount REAL,             -- Central GST
    sgst_amount REAL,             -- State GST
    igst_amount REAL,             -- Integrated GST
    vendor_name TEXT,             -- Supplier name
    vendor_gstin TEXT,            -- Supplier GSTIN
    invoice_number TEXT,          -- Vendor invoice reference
    expense_type TEXT,            -- 'INPUT' or 'NON-INPUT'
    itc_eligible INTEGER,         -- 1 if eligible for ITC, 0 otherwise
    bill_attached INTEGER,        -- 1 if bill uploaded
    gst_reconciled INTEGER,       -- Marked as reconciled for filing
    created_at TIMESTAMP
)
```

### GST Transactions Table
```sql
CREATE TABLE gst_transactions (
    id INTEGER PRIMARY KEY,
    company_id TEXT,
    transaction_date TEXT,
    transaction_type TEXT,        -- 'SALE' or 'PURCHASE'
    invoice_number TEXT,
    customer_gstin TEXT,
    customer_name TEXT,
    hsn_sac_code TEXT,
    description TEXT,
    quantity REAL,
    unit_price REAL,
    taxable_amount REAL,
    gst_rate REAL,
    cgst_amount REAL,
    sgst_amount REAL,
    igst_amount REAL,
    total_amount REAL,
    place_of_supply TEXT,         -- 'SAME' or 'OTHER'
    irn TEXT,                     -- E-Invoicing IRN
    created_at TIMESTAMP
)
```

### GST Returns Table
```sql
CREATE TABLE gst_returns (
    id INTEGER PRIMARY KEY,
    company_id TEXT,
    return_period TEXT,           -- '03-2026'
    return_type TEXT,             -- 'GSTR-1', 'GSTR-2', 'GSTR-3B'
    filing_date TEXT,
    status TEXT,                  -- 'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'
    total_outward_supply REAL,
    total_tax_payable REAL,
    total_input_tax_credit REAL,
    net_tax_payable REAL,
    notes TEXT,
    created_at TIMESTAMP
)
```

## API Endpoints

### Expense Management

#### POST `/api/v1/expenses/upload`
Upload expense sheet (CSV/Excel)
```json
Request: FormData with file
Response: {
  "success": true,
  "count": 25,
  "expenses": [...]
}
```

#### GET `/api/v1/expenses`
Retrieve expenses with filters
```json
Query Parameters:
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD
- category: string
- only_itc_eligible: boolean

Response: {
  "success": true,
  "count": 10,
  "expenses": [...]
}
```

#### GET `/api/v1/expenses/summary`
Get expense summary for dashboard
```json
Query Parameters:
- month_year: YYYY-MM (e.g., "03-2026")

Response: {
  "total_expenses": 50000,
  "total_gst": 9000,
  "cgst_total": 4500,
  "sgst_total": 4500,
  "itc_eligible_total": 45000,
  "count": 15
}
```

#### POST `/api/v1/expenses/reconcile`
Mark expenses as reconciled
```json
Request: {
  "month_year": "03-2026"
}
Response: {
  "success": true,
  "message": "Expenses for 03-2026 marked as reconciled."
}
```

### GST Management

#### POST `/api/v1/gst/record-transaction`
Record GST transaction (sales or purchases)
```json
Request: {
  "transaction_type": "SALE",
  "invoice_number": "INV-001",
  "customer_gstin": "27AABCT1234H1Z0",
  "customer_name": "ABC Corp",
  "hsn_sac_code": "1001",
  "description": "IT Services",
  "quantity": 1,
  "unit_price": 10000,
  "gst_rate": 18,
  "place_of_supply": "SAME"
}
```

#### GET `/api/v1/gst/summary`
Get GST summary for reconciliation
```json
Query: month_year=03-2026
Response: {
  "outward_supply": {...},
  "inward_supply": {...},
  "net_tax_payable": {
    "cgst": 5000,
    "sgst": 5000,
    "total": 10000
  }
}
```

#### GET `/api/v1/gst/gstr1`
Generate GSTR-1 report
```json
Response: {
  "report_type": "GSTR-1",
  "month_year": "03-2026",
  "filing_deadline": "2026-04-11",
  "summary": {...},
  "sales_details": [...]
}
```

#### GET `/api/v1/gst/gstr2`
Generate GSTR-2 report
```json
Response: {
  "report_type": "GSTR-2",
  "month_year": "03-2026",
  "filing_deadline": "2026-04-15",
  "summary": {...},
  "purchase_details": [...],
  "expense_details": [...]
}
```

#### GET `/api/v1/gst/gstr3b`
Generate GSTR-3B (Main tax return)
```json
Response: {
  "report_type": "GSTR-3B",
  "month_year": "03-2026",
  "filing_deadline": "2026-04-20",
  "outward_supply": {...},
  "inward_supply": {...},
  "tax_liability": {
    "cgst_payable": 1000,
    "sgst_payable": 1000,
    "total_payable": 2000
  }
}
```

#### POST `/api/v1/gst/file-return`
Submit GST return
```json
Request: {
  "month_year": "03-2026",
  "return_type": "GSTR-3B",
  "report": {...}
}
Response: {
  "success": true,
  "return_id": "GSTR-3B-03-2026"
}
```

## Frontend Pages

### 1. Expenses Page (`/workspace/expenses`)
**Features:**
- Drag & drop file upload for CSV/Excel files
- Real-time expense summary (total, GST breakdown, ITC eligible)
- Filterable expense table (date, category, ITC status)
- Monthly reconciliation button
- Detailed breakdown of CGST/SGST/IGST

**Components:**
- File upload zone with drag-drop
- Summary cards showing totals
- Advanced filters section
- Expense transaction table
- Reconciliation panel

### 2. GST Compliance Page (`/workspace/accounting/gst-compliance`)
**Features:**
- Tax breakdown dashboard (Output/Input tax)
- GSTR-1 generation and filing
- GSTR-2 generation for purchases
- GSTR-3B main return with net payable tax
- Compliance checklist
- Download reports in JSON format

**Tabs:**
1. **GSTR-1**: Outward supplies (sales)
2. **GSTR-2**: Inward supplies (purchases + expenses)
3. **GSTR-3B**: Monthly tax return with net liability

## Integration Points

### With Invoices
- Sales invoices automatically create GST transactions
- CGST, SGST, IGST fields tracked in invoices table
- E-Invoicing IRN and QR codes supported

### With Purchase Orders
- Purchase orders can track GST details
- Supplier GSTIN captured for compliance

### With Dashboard
- GST metrics displayed on executive dashboard
- Tax liability forecast charts
- Cash flow impact from GST liability

## GST Compliance Workflow

```
1. Upload Expenses
   ↓
2. System Auto-Categorizes & Calculates GST
   ↓
3. Monthly Reconciliation Review
   ↓
4. Generate GSTR Reports:
   - GSTR-1 (Sales) by 11th
   - GSTR-2 (Purchases) by 15th
   - GSTR-3B (Return) by 20th
   ↓
5. File Returns Online
   ↓
6. Deposit Tax with Government
```

## Configuration

### GST Rate Customization
Edit expense category mappings in `ExpenseService._get_gst_rate_for_category()`:
```python
gst_mapping = {
    "office supplies": (5.0, "INPUT"),
    "internet": (18.0, "INPUT"),
    # Add custom mappings here
}
```

### HSN/SAC Codes
Maintain HSN code mapping for product categories:
- 0-5: Primary
- 5-15: Manufactured goods
- 15-97: Services
- 97-98: Intra-state/Inter-state

## Usage Examples

### Step 1: Upload Expenses
1. Navigate to `/workspace/expenses`
2. Drag & drop CSV file with columns: date, category, amount, description
3. System parses and imports automatically
4. View imported expenses in dashboard

### Step 2: Record Sales
1. Create invoice through system
2. GST automatically captured (CGST/SGST/IGST)
3. Tracked in gst_transactions table

### Step 3: Generate Returns
1. Go to `/workspace/accounting/gst-compliance`
2. Select month_year
3. Click "Generate Report" for GSTR-1/2/3B
4. Review summary and details
5. Download JSON or file directly

### Step 4: Reconciliation
1. Monthly reconciliation in Expenses page
2. Mark all transactions as reconciled
3. Generate GSTR-3B with accurate net payable
4. File with GST Authority

## Security & Compliance

- **Role-Based Access**: Only ADMIN/FINANCE users can view GST reports
- **Audit Trail**: All GST transactions logged
- **Data Encryption**: Sensitive GSTIN data encrypted at rest
- **Bill Attachment**: Original bills stored for audit
- **Reconciliation Lock**: Reconciled months cannot be edited

## Filing Deadlines

- **GSTR-1**: 11th of next month (monthly), 26th (quarterly)
- **GSTR-2**: 15th of next month
- **GSTR-3B**: 20th of next month (most critical)
- **GSTR-4**: 20th (for composition dealers)

## Reports & Exports

All reports can be:
- Downloaded as JSON
- Printed for audit trail
- Exported to accounting software
- Filed online with GST Authority

## Troubleshooting

### Issue: GST not calculated
- Verify expense category is in system mapping
- Check HSN code is correct
- Ensure vendor GSTIN is valid format

### Issue: ITC not showing as eligible
- Confirm bill is attached
- Verify expense type is 'INPUT'
- Check vendor GSTIN is registered

### Issue: Reconciliation discrepancies
- Review transaction list for duplicates
- Check place of supply (SAME vs OTHER)
- Verify date range selection

## Future Enhancements

1. **E-Invoicing Integration**: Auto-generate IRN and QR codes
2. **GST Payments**: Direct tax payment through portal
3. **Advance Ruling**: Track advance ruling applications
4. **ITC Tracking**: Real-time ITC available vs utilized
5. **Audit Reports**: Generate audit-ready compliance reports
6. **Multi-Location**: Support for multiple state warehouses
7. **Reverse Charge**: Track RCM (Reverse Charge Mechanism)
8. **E-Way Bill**: Generate bills for goods movement
