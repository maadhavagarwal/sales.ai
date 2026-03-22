# System-Wide GST Compliance Integration

## Making Your Entire Platform GST-Compliant

This document shows how to integrate GST compliance throughout all system modules.

## 1. Invoice-to-GST Tracking

**Existing**: Invoices table already has GST fields
**Enhancement**: Auto-populate GST returns from invoices

```python
# In GSTService, add method to sync invoices
def sync_sales_from_invoices(self, company_id: str, month_year: str):
    """Automatically record sales from invoices as GST transactions"""
    conn, _ = get_db_connection()
    cursor = conn.cursor()
    
    # Get invoices from this month
    cursor.execute("""
        SELECT invoice_number, customer_gstin, customer_name,
               items_json, subtotal, cgst_total, sgst_total, igst_total
        FROM invoices
        WHERE company_id = ?
        AND strftime('%Y-%m', date) = ?
    """, (company_id, f"{month_year.split('-')[0]}-{month_year.split('-')[1]}"))
    
    for invoice in cursor.fetchall():
        # Parse items and record GST transaction for each line item
        items = json.loads(invoice[3])
        for item in items:
            self.record_gst_transaction(
                company_id=company_id,
                transaction_type='SALE',
                invoice_number=invoice[0],
                customer_gstin=invoice[1],
                customer_name=invoice[2],
                hsn_sac_code=item.get('hsn_code', ''),
                description=item.get('description', ''),
                quantity=item.get('quantity', 1),
                unit_price=item.get('unit_price', 0),
                gst_rate=item.get('gst_rate', 18),
            )
```

## 2. Purchase Order-to-GST Tracking

**Integration**: Link purchase orders to GST transactions

```python
# Route to convert PO to GST transaction
@router.post("/api/v1/po/{po_id}/to-gst")
async def po_to_gst_transaction(
    po_id: str,
    token: str = Depends(verify_token)
):
    """Convert purchase order to GST transaction"""
    user_data = get_user_record(token)
    company_id = user_data[3]
    
    gst_service = GSTService()
    
    # Fetch PO details
    conn, _ = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT supplier_name, items_json, total_amount
        FROM purchase_orders WHERE id = ? AND company_id = ?
    """, (po_id, company_id))
    
    po = cursor.fetchone()
    items = json.loads(po[1])
    
    # Record as GST transaction
    for item in items:
        gst_service.record_gst_transaction(
            company_id=company_id,
            transaction_type='PURCHASE',
            invoice_number=f"PO-{po_id}",
            customer_gstin="",  # To be filled
            customer_name=po[0],
            hsn_sac_code=item.get('hsn_code', ''),
            description=item.get('description', ''),
            quantity=item.get('quantity', 1),
            unit_price=item.get('unit_price', 0),
            gst_rate=item.get('gst_rate', 18),
        )
    
    return {"success": True, "message": "PO converted to GST transaction"}
```

## 3. Dashboard Integration

**Add GST widgets** to Executive Dashboard

```typescript
// In frontend dashboard components
interface GSTWidget {
  title: "GST Summary" | "Tax Liability" | "Compliance Status";
  metrics: {
    outputTax: number;
    inputTax: number;
    netPayable: number;
    filingStatus: "On Track" | "Late" | "Compliant";
  };
}

const GSTSummaryWidget = () => {
  const [gstData, setGstData] = useState<GSTWidget>();
  
  useEffect(() => {
    // Fetch current month GST data
    fetch('/api/v1/gst/summary?month_year=2026-03')
      .then(r => r.json())
      .then(data => setGstData({
        title: "GST Summary",
        metrics: {
          outputTax: data.outward_supply.total_output_tax,
          inputTax: data.inward_supply.total_input_tax,
          netPayable: data.net_tax_payable.total,
          filingStatus: checkDeadline(data.month_year)
        }
      }));
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-red-600">GST Liability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          ₹{gstData?.metrics.netPayable.toLocaleString()}
        </div>
        <Badge className={`mt-2 ${gstData?.metrics.filingStatus === 'Compliant' ? 'bg-green-100' : 'bg-red-100'}`}>
          {gstData?.metrics.filingStatus}
        </Badge>
      </CardContent>
    </Card>
  );
};
```

## 4. Accounting Ledger Integration

**Link GST transactions to ledger entries**

```python
def post_gst_to_ledger(company_id: str, gst_transaction: dict):
    """Post GST transaction to accounting ledger"""
    conn, _ = get_db_connection()
    cursor = conn.cursor()
    
    transaction_type = gst_transaction['transaction_type']
    is_gst_registered = check_gst_registration(company_id)
    
    if not is_gst_registered:
        return  # Not applicable for unregistered entities
    
    # For SALE: Post Output Tax
    if transaction_type == 'SALE':
        posts = [
            {
                'account': 'GST Output Tax Receivable',
                'amount': gst_transaction['total_amount'],
                'type': 'Debit'
            },
            {
                'account': 'Customer Receivable',
                'amount': gst_transaction['total_amount'],
                'type': 'Credit'
            }
        ]
    
    # For PURCHASE: Post Input Tax
    elif transaction_type == 'PURCHASE':
        posts = [
            {
                'account': 'Inventory/Expense',
                'amount': gst_transaction['taxable_amount'],
                'type': 'Debit'
            },
            {
                'account': 'GST Input Tax Receivable',
                'amount': gst_transaction.get('cgst_amount', 0) + 
                         gst_transaction.get('sgst_amount', 0) + 
                         gst_transaction.get('igst_amount', 0),
                'type': 'Debit'
            },
            {
                'account': 'Vendor Payable',
                'amount': gst_transaction['total_amount'],
                'type': 'Credit'
            }
        ]
    
    # Post to ledger
    for post in posts:
        cursor.execute("""
            INSERT INTO ledger (
                company_id, account_name, type, amount,
                description, date, voucher_id, voucher_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            company_id,
            post['account'],
            post['type'],
            post['amount'],
            f"GST {transaction_type}: {gst_transaction.get('description', '')}",
            gst_transaction['transaction_date'],
            gst_transaction['invoice_number'],
            'GST'
        ))
    
    conn.commit()
    conn.close()
```

## 5. Customer Portal GST Compliance

**Enable customers to see GST breakdown**

```typescript
// Customer-facing invoice view
const InvoicePreview = ({ invoiceId }: { invoiceId: string }) => {
  const [invoice, setInvoice] = useState(null);
  
  const GSTBreakdown = () => (
    <div className="mt-6 border-t pt-4">
      <h3 className="font-semibold text-sm">Tax Breakdown (GST)</h3>
      <div className="space-y-1 text-sm mt-2">
        <div className="flex justify-between">
          <span>Subtotal (Taxable)</span>
          <span>₹{invoice?.subtotal}</span>
        </div>
        <div className="flex justify-between text-blue-600">
          <span>CGST ({invoice?.gst_rate}%)</span>
          <span>₹{invoice?.cgst_total}</span>
        </div>
        <div className="flex justify-between text-blue-600">
          <span>SGST ({invoice?.gst_rate}%)</span>
          <span>₹{invoice?.sgst_total}</span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-2 mt-2">
          <span>Total Invoice Amount</span>
          <span>₹{invoice?.grand_total}</span>
        </div>
      </div>
      {invoice?.irn && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
          <p className="text-gray-600">E-Invoicing IRN</p>
          <p className="font-mono">{invoice.irn}</p>
        </div>
      )}
    </div>
  );
  
  return (
    <div>
      {/* Invoice details */}
      <GSTBreakdown />
    </div>
  );
};
```

## 6. Approval Workflow with GST Checks

**Add GST validation to expense approvals**

```python
def validate_gst_compliance(expense: dict) -> list:
    """Validate GST compliance before approval"""
    issues = []
    
    # Check 1: Vendor GSTIN required for high-value purchases
    if expense.get('amount', 0) > 50000 and not expense.get('vendor_gstin'):
        issues.append("Missing vendor GSTIN for high-value purchase")
    
    # Check 2: HSN code required
    if not expense.get('hsn_code'):
        issues.append("HSN/SAC code not provided")
    
    # Check 3: Bill attachment required
    if not expense.get('bill_attached'):
        issues.append("Original bill must be attached for GST credit")
    
    # Check 4: GSTIN format validation
    if expense.get('vendor_gstin'):
        gstin_pattern = r'^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$'
        if not re.match(gstin_pattern, expense['vendor_gstin']):
            issues.append("Invalid vendor GSTIN format")
    
    return issues

# Route for approval with validation
@router.post("/api/v1/expenses/{id}/approve")
async def approve_expense(id: int, token: str = Depends(verify_token)):
    """Approve expense with GST compliance checks"""
    expense = get_expense(id)
    
    # Validate GST compliance
    issues = validate_gst_compliance(expense)
    if issues:
        return {
            "approved": False,
            "issues": issues,
            "message": "Cannot approve - GST compliance issues"
        }
    
    # Calculate impacts
    impact = {
        "input_tax_credit": expense.get('cgst_amount', 0) + expense.get('sgst_amount', 0),
        "itc_eligible": expense.get('itc_eligible', True),
        "net_cost": expense['amount']
    }
    
    # Approve
    approve_expense_db(id)
    
    return {
        "approved": True,
        "message": "Expense approved",
        "gst_impact": impact
    }
```

## 7. Monthly Reconciliation Automation

**Auto-reconcile GST transactions at month-end**

```python
async def auto_reconcile_gst(company_id: str, month_year: str):
    """Auto-reconcile GST for the month"""
    
    gst_service = GSTService()
    
    # Get summary
    summary = gst_service.get_gst_summary(company_id, month_year)
    
    # Check for discrepancies
    discrepancies = []
    
    # Discrepancy 1: GSTR-1 vs actual sales
    gstr1_total = summary['outward_supply']['total_output_tax']
    sales_total = get_actual_sales_total(company_id, month_year)
    if abs(gstr1_total - sales_total) > 100:  # Allow ±100 rounding
        discrepancies.append(f"GSTR-1 vs actual sales mismatch: ₹{abs(gstr1_total - sales_total)}")
    
    # Discrepancy 2: GSTR-2 vs purchased inventory
    gstr2_total = summary['inward_supply']['total_input_tax']
    purchase_total = get_actual_purchase_total(company_id, month_year)
    if abs(gstr2_total - purchase_total) > 100:
        discrepancies.append(f"GSTR-2 vs actual purchases mismatch: ₹{abs(gstr2_total - purchase_total)}")
    
    if discrepancies:
        # Alert for manual review
        send_alert_notification(company_id, {
            "title": f"GST Reconciliation Issues - {month_year}",
            "discrepancies": discrepancies,
            "action": "Review and resolve before filing"
        })
    else:
        # Auto-reconcile
        gst_service.reconcile_expenses(company_id, month_year)
        send_success_notification(company_id, {
            "title": f"GST {month_year} Auto-Reconciled",
            "message": f"Net tax payable: ₹{summary['net_tax_payable']['total']}"
        })
```

## 8. Reporting & MIS

**Add GST metrics to reporting**

```python
def get_gst_mis_dashboard(company_id: str, period: str = "YTD") -> dict:
    """Monthly GST MIS for management review"""
    
    months = get_periods(period)
    
    mis = {
        "period": period,
        "months": [],
        "summary": {
            "total_sales": 0,
            "total_purchases": 0,
            "total_tax_payable": 0,
            "tax_paid": 0,
            "tax_pending": 0,
            "compliance_status": "ON TRACK"
        }
    }
    
    for month in months:
        summary = get_gst_summary(company_id, month)
        
        month_data = {
            "month": month,
            "sales": summary['outward_supply']['sales']['total'],
            "output_tax": summary['outward_supply']['total_output_tax'],
            "purchases": summary['inward_supply']['purchases']['total'],
            "input_tax": summary['inward_supply']['total_input_tax'],
            "net_payable": summary['net_tax_payable']['total'],
            "filing_status": check_filing_status(company_id, month)
        }
        
        mis['months'].append(month_data)
        
        # Aggregate
        mis['summary']['total_sales'] += month_data['sales']
        mis['summary']['total_purchases'] += month_data['purchases']
        mis['summary']['total_tax_payable'] += month_data['net_payable']
    
    return mis
```

## Integration Checklist

- [ ] Link invoices to GST transactions automatically
- [ ] Link purchase orders to GST transactions
- [ ] Add GST widgets to dashboard
- [ ] Post GST transactions to ledger
- [ ] Enable customer GST visibility
- [ ] Add approval workflow validation
- [ ] Implement auto-reconciliation
- [ ] Add GST MIS reporting
- [ ] Set up filing deadline alerts
- [ ] Create audit trail logging

## Next Steps

1. **Implement invoice sync**: Auto-record sales in GST system
2. **Add PO integration**: Track purchases as GST transactions
3. **Enable reconciliation**: Monthly auto-check for discrepancies
4. **Set up alerts**: Notify admins of upcoming filing deadlines
5. **Create audits**: Generate audit-ready compliance reports

This integration ensures your entire platform is GST-compliant from invoicing to reporting.
