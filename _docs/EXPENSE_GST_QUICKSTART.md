# Quick Start: Expense & GST Compliance

## 5-Minute Setup Guide

### 1. Upload Your First Expense Sheet

**Required CSV Columns:**
```
date,category,amount,description,payment_method
2026-03-15,Office supplies,500,Printer ink and paper,Credit Card
2026-03-16,Internet,1500,Monthly internet bill,Bank Transfer
2026-03-17,Travel,2000,Client meeting travel,Cash
```

**Steps:**
1. Go to **Workspace → Expenses**
2. Drag & drop your CSV/Excel file
3. System auto-calculates GST
4. View summary in dashboard

### 2. Generate Your First GST Return

**GSTR-3B (Most Important):**
1. Go to **Finance & Compliance → GST Compliance**
2. Select month (e.g., March 2026)
3. Click **"Generate Report"** under GSTR-3B tab
4. Review:
   - Output Tax (from sales)
   - Input Tax Credit (from purchases + expenses)
   - **Net Tax Payable** (amount to deposit)
5. Click **"File GSTR-3B"** to submit

### 3. Track Your GST Liability

**Dashboard View:**
- **Output Tax**: ₹50,000 (collected from customers)
- **Input Tax**: ₹9,000 (eligible from purchases)
- **Net Payable**: ₹41,000 (to be paid to government)

### 4. Monthly Reconciliation

**Before filing returns:**
1. In Expenses page, select month
2. Click **"Reconcile [Month] Expenses"**
3. Review all transactions for accuracy
4. Confirm reconciliation status

## Sample Expense File Template

```csv
date,category,amount,description,vendor_name,vendor_gstin,invoice_number,payment_method
2026-03-01,Office supplies,1500,Printer ink cartridges,Printer Mart,27AABBC1234H1Z0,PM-001,Credit Card
2026-03-02,Electricity,3500,Electricity bill,Power Corp,27AABCD1111H1Z0,PWR-2026-03,Bank Transfer
2026-03-03,Internet,2000,ISP monthly charge,Telecom Ltd,27AABCEL222H1Z0,TEL-001,Bank Transfer
2026-03-04,Travel,5000,Airfare to Delhi,Travel Agency,27AABCEF333H1Z0,TRV-001,Cash
2026-03-05,Office supplies,800,Stationery,Office Mart,27AABCEG444H1Z0,OM-002,Credit Card
```

## GST Rates for Common Expenses

| Category | Rate | ITC Eligible | Examples |
|----------|------|-------------|----------|
| Office Supplies | 5% | ✓ Yes | Paper, pens, folders |
| Electricity | 5% | ✓ Yes | Power bills |
| Internet | 18% | ✓ Yes | ISP charges |
| Travel | 5% | ✓ Yes | Flights, hotels, taxi |
| Consulting | 18% | ✓ Yes | Professional services |
| Rent | 0% | ✗ No | Building rent |
| Salaries | 0% | ✗ No | Employee wages |
| Entertainment | 18% | ✗ No | Client entertainment |

## GST Filing Deadlines

| Return | Deadline | What It Contains |
|--------|----------|------------------|
| **GSTR-1** | 11th of next month | All **sales** made |
| **GSTR-2** | 15th of next month | All **purchases** & eligible ITC |
| **GSTR-3B** | **20th of next month** | **Net tax payable** (MOST IMPORTANT) |

## Common Questions

### Q: Do I need to upload every expense?
**A:** For compliance, yes. Uploading ensures proper GST tracking and ITC eligibility for deductions.

### Q: What's ITC eligibility?
**A:** Input Tax Credit is the GST you paid on business purchases. It reduces your tax liability. Non-INPUT expenses don't qualify.

### Q: How often do I file returns?
**A:** Monthly (20th of next month) unless you qualify for quarterly filing.

### Q: What happens if I miss the GSTR-3B deadline?
**A:** Late filing penalties and interest charges. Always file by 20th.

### Q: Can I edit expenses after reconciliation?
**A:** Not recommended. For audit trail, create new entries instead.

## Troubleshooting

### "GST not calculated"
- ✓ Verify category is recognized (Office supplies, Internet, etc.)
- ✓ Check vendor GSTIN format (15 digits)

### "ITC showing as not eligible"
- ✓ Confirm expense type is INPUT
- ✓ Verify bill_attached flag is set
- ✓ Check category is eligible (meals, entertainment are often not eligible)

### "GSTR report shows 0 figures"
- ✓ Check month_year format (YYYY-MM)
- ✓ Ensure transactions exist for that period
- ✓ Verify company_id is set

## Next Steps

1. ✓ Upload your first expense file
2. ✓ Generate GSTR-3B for current month
3. ✓ Set up monthly expense tracking
4. ✓ Configure GST filing calendar
5. ✓ Automate expense approvals

## Support

For detailed documentation, see: [GST Compliance & Expenses Guide](_docs/GST_COMPLIANCE_AND_EXPENSES_GUIDE.md)

Questions? Contact your Finance Administrator or check the compliance checklist in the GST page.
