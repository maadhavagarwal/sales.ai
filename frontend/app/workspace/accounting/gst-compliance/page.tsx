'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Badge, ResponsiveTable } from '@/components/ui';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/Tabs';
import { Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface GSTSummary {
  month_year: string;
  outward_supply: {
    sales: any;
    cgst_output: number;
    sgst_output: number;
    igst_output: number;
    total_output_tax: number;
  };
  inward_supply: {
    purchases: any;
    expenses: any;
    cgst_input: number;
    sgst_input: number;
    igst_input: number;
    total_input_tax: number;
  };
  net_tax_payable: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
}

interface GSTRReport {
  report_type: string;
  month_year: string;
  filing_deadline: string;
  summary?: any;
  sales_details?: any[];
  purchase_details?: any[];
  expense_details?: any[];
  tax_liability?: any;
  outward_supply?: any;
  inward_supply?: any;
  generated_at: string;
}

export default function GSTCompliancePage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [gstSummary, setGstSummary] = useState<GSTSummary | null>(null);
  const [gstr1Report, setGstr1Report] = useState<GSTRReport | null>(null);
  const [gstr2Report, setGstr2Report] = useState<GSTRReport | null>(null);
  const [gstr3bReport, setGstr3bReport] = useState<GSTRReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fetch GST Summary
  const fetchGstSummary = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/gst/summary?month_year=${selectedMonth}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch GST summary');

      const data = await response.json();
      setGstSummary(data.summary);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error fetching summary');
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth]);

  // Fetch GSTR-1
  const fetchGSTR1 = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/gst/gstr1?month_year=${selectedMonth}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch GSTR-1');

      setGstr1Report(data.report);
      setSuccessMessage('✓ GSTR-1 report generated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error generating GSTR-1');
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth]);

  // Fetch GSTR-2
  const fetchGSTR2 = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/gst/gstr2?month_year=${selectedMonth}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch GSTR-2');

      setGstr2Report(data.report);
      setSuccessMessage('✓ GSTR-2 report generated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error generating GSTR-2');
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth]);

  // Fetch GSTR-3B
  const fetchGSTR3B = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/gst/gstr3b?month_year=${selectedMonth}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch GSTR-3B');

      setGstr3bReport(data.report);
      setSuccessMessage('✓ GSTR-3B report generated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error generating GSTR-3B');
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth]);

  // File return
  const handleFileReturn = async (returnType: string, report: any) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/gst/file-return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month_year: selectedMonth,
          return_type: returnType,
          report,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Filing failed');

      setSuccessMessage(`✓ ${returnType} filed successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Filing failed');
    }
  };

  // Download report
  const downloadReport = (report: any, filename: string) => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2)));
    element.setAttribute('download', `${filename}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Load summary on mount/month change
  useEffect(() => {
    fetchGstSummary();
  }, [fetchGstSummary]);

  const formatCurrency = (value: number | undefined) => {
    return `₹${(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">GST Compliance & Filing</h1>
          <p className="text-slate-600 mt-2">Manage GSTR-1, GSTR-2, GSTR-3B returns and tax reconciliation</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Summary Cards */}
      {gstSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-slate-600">Output Tax</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(gstSummary.outward_supply.total_output_tax)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Collected from customers</p>
            </div>
          </Card>

          <Card padding="md">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-slate-600">Input Tax</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(gstSummary.inward_supply.total_input_tax)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Eligible for credit</p>
            </div>
          </Card>

          <Card padding="md">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-slate-600">Net Payable</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(gstSummary.net_tax_payable.total)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Tax to be deposited</p>
            </div>
          </Card>

          <Card padding="md">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-slate-600">Filing Status</h3>
            </div>
            <div>
              <Badge className="mt-2">Pending</Badge>
              <p className="text-xs text-slate-500 mt-2">Not yet submitted</p>
            </div>
          </Card>
        </div>
      )}

      {/* Tax Breakdown */}
      {gstSummary && (
        <Card padding="md">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Tax Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Output Tax */}
              <div className="space-y-4">
                <h3 className="font-semibold text-blue-900">Output Tax (GSTR-1)</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CGST 50%:</span>
                    <span>{formatCurrency(gstSummary.outward_supply.cgst_output)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST 50%:</span>
                    <span>{formatCurrency(gstSummary.outward_supply.sgst_output)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IGST:</span>
                    <span>{formatCurrency(gstSummary.outward_supply.igst_output)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Output:</span>
                    <span>{formatCurrency(gstSummary.outward_supply.total_output_tax)}</span>
                  </div>
                </div>
              </div>

              {/* Input Tax */}
              <div className="space-y-4">
                <h3 className="font-semibold text-green-900">Input Tax (GSTR-2)</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CGST 50%:</span>
                    <span>{formatCurrency(gstSummary.inward_supply.cgst_input)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST 50%:</span>
                    <span>{formatCurrency(gstSummary.inward_supply.sgst_input)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IGST:</span>
                    <span>{formatCurrency(gstSummary.inward_supply.igst_input)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Input:</span>
                    <span>{formatCurrency(gstSummary.inward_supply.total_input_tax)}</span>
                  </div>
                </div>
              </div>
            </div>
        </Card>
      )}
      {/* GST Forms */}
      <Tabs defaultValue="gstr1" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gstr1">GSTR-1 (Outward)</TabsTrigger>
          <TabsTrigger value="gstr2">GSTR-2 (Inward)</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B (Return)</TabsTrigger>
        </TabsList>

        {/* GSTR-1 */}
        <TabsContent value="gstr1" className="space-y-4">
          <Card padding="md">
            <div className="flex flex-row justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">GSTR-1: Outward Supplies</h2>
                <p className="text-sm text-slate-600">All sales and supplies made during the month</p>
              </div>
              <Button
                variant="outline"
                onClick={fetchGSTR1}
                disabled={loading}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </Button>
            </div>
            <div>
              {gstr1Report ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Filing Deadline:</strong> {gstr1Report.filing_deadline}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Total Sales</p>
                      <p className="font-semibold">
                        {formatCurrency(gstr1Report.summary?.total_sales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CGST Total</p>
                      <p className="font-semibold">
                        {formatCurrency(gstr1Report.summary?.cgst_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">SGST Total</p>
                      <p className="font-semibold">
                        {formatCurrency(gstr1Report.summary?.sgst_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">IGST Total</p>
                      <p className="font-semibold">
                        {formatCurrency(gstr1Report.summary?.igst_total)}
                      </p>
                    </div>
                  </div>

                  {gstr1Report.sales_details && gstr1Report.sales_details.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Sales Details ({gstr1Report.sales_details.length})</h4>
                      <div className="overflow-x-auto">
                        <ResponsiveTable
                          headers={['Invoice', 'Customer GSTIN', 'Amount', 'CGST', 'SGST']}
                          rows={gstr1Report.sales_details.slice(0, 5).map((sale) => [
                            sale.invoice_number,
                            sale.customer_gstin,
                            formatCurrency(sale.taxable_amount),
                            formatCurrency(sale.cgst_amount),
                            formatCurrency(sale.sgst_amount),
                          ])}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => downloadReport(gstr1Report, 'GSTR1')}
                      variant="outline"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download JSON
                    </Button>
                    <Button
                      onClick={() => handleFileReturn('GSTR-1', gstr1Report)}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      File GSTR-1
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 py-8">Click "Generate Report" to create GSTR-1</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* GSTR-2 */}
        <TabsContent value="gstr2" className="space-y-4">
          <Card padding="md">
            <div className="flex flex-row justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">GSTR-2: Inward Supplies</h2>
                <p className="text-sm text-slate-600">All purchases and eligible Input Tax Credit</p>
              </div>
              <Button
                variant="outline"
                onClick={fetchGSTR2}
                disabled={loading}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </Button>
            </div>
            <div>
              {gstr2Report ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-900">
                      <strong>Filing Deadline:</strong> {gstr2Report.filing_deadline}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Total Purchases</p>
                      <p className="font-semibold">
                        {formatCurrency(gstr2Report.summary?.purchase_subtotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CGST Eligible</p>
                      <p className="font-semibold">
                        {formatCurrency(gstr2Report.summary?.cgst_input)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">SGST Eligible</p>
                      <p className="font-semibold">
                        {formatCurrency(gstr2Report.summary?.sgst_input)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total ITC</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(gstr2Report.summary?.total_input_tax)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => downloadReport(gstr2Report, 'GSTR2')}
                      variant="outline"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download JSON
                    </Button>
                    <Button
                      onClick={() => handleFileReturn('GSTR-2', gstr2Report)}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      File GSTR-2
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 py-8">Click "Generate Report" to create GSTR-2</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* GSTR-3B */}
        <TabsContent value="gstr3b" className="space-y-4">
          <Card padding="md">
            <div className="flex flex-row justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">GSTR-3B: Monthly Tax Return</h2>
                <p className="text-sm text-slate-500">Most important form showing net tax liability</p>
              </div>
              <Button
                variant="outline"
                onClick={fetchGSTR3B}
                disabled={loading}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </Button>
            </div>
            <div>
              {gstr3bReport ? (
                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-900">
                      <strong>Filing Deadline:</strong> {gstr3bReport.filing_deadline}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-3">Output Tax</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>CGST:</span>
                          <span>{formatCurrency(gstr3bReport.tax_liability?.cgst_payable)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST:</span>
                          <span>{formatCurrency(gstr3bReport.tax_liability?.sgst_payable)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IGST:</span>
                          <span>{formatCurrency(gstr3bReport.tax_liability?.igst_payable)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>{formatCurrency(gstr3bReport.tax_liability?.total_payable)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-3">Input Tax</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>CGST:</span>
                          <span>{formatCurrency(gstSummary?.inward_supply.cgst_input)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST:</span>
                          <span>{formatCurrency(gstSummary?.inward_supply.sgst_input)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IGST:</span>
                          <span>{formatCurrency(gstSummary?.inward_supply.igst_input)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>{formatCurrency(gstSummary?.inward_supply.total_input_tax)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Net Tax Liability</h4>
                    <div className="text-3xl font-bold text-yellow-700">
                      {formatCurrency(gstr3bReport.tax_liability?.total_payable)}
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">Amount to be deposited to Government</p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => downloadReport(gstr3bReport, 'GSTR3B')}
                      variant="outline"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download JSON
                    </Button>
                    <Button
                      onClick={() => handleFileReturn('GSTR-3B', gstr3bReport)}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      File GSTR-3B
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 py-8">Click "Generate Report" to create GSTR-3B</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compliance Checklist */}
      <Card padding="md" className="border-blue-200 bg-blue-50">
        <div className="pb-2">
          <h3 className="text-blue-900 font-semibold">GST Compliance Checklist</h3>
        </div>
        <div className="space-y-2 text-sm text-blue-900">
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked id="doc" className="w-4 h-4" />
              <label htmlFor="doc">Collect seller's invoice and bills for purchases</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked id="ledger" className="w-4 h-4" />
              <label htmlFor="ledger">Item-wise summary in ledger maintained</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked id="reconcile" className="w-4 h-4" />
              <label htmlFor="reconcile">Monthly reconciliation completed</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="file" className="w-4 h-4" />
              <label htmlFor="file">GSTR-1 filed before 11th</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="file3b" className="w-4 h-4" />
              <label htmlFor="file3b">GSTR-3B filed before 20th</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="payment" className="w-4 h-4" />
              <label htmlFor="payment">Tax payment deposited with Government</label>
            </div>
          </div>
      </Card>
    </div>
  );
}
