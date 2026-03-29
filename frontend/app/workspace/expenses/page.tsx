'use client';

import { useState, useCallback, useEffect, type DragEvent } from 'react';
import { Card, Button, Input, Badge, ResponsiveTable } from '@/components/ui';
import { Upload, Filter, ReceiptText } from 'lucide-react';
import { getAuthToken } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

interface Expense {
  id: number;
  date: string;
  category: string;
  amount: number;
  description: string;
  vendor_name?: string;
  vendor_gstin?: string;
  invoice_number?: string;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  expense_type: string;
  itc_eligible: number;
}

interface Summary {
  total_expenses: number;
  total_gst: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  itc_eligible_total: number;
  non_itc_total: number;
  count: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
    showOnlyITC: false,
  });

  const token = getAuthToken();

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.showOnlyITC) params.append('only_itc_eligible', 'true');

      const response = await fetch(`${API_URL}/api/v1/expenses?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch expenses');

      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error fetching expenses');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/expenses/summary${selectedMonth ? `?month_year=${selectedMonth.replace('-', '-')}` : ''}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch summary');

      const data = await response.json();
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [token, selectedMonth]);

  // Upload file
  const handleFileUpload = async (file: File) => {
    if (!token) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/v1/expenses/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Upload failed');

      setSuccessMessage(`Successfully imported ${data.count} expenses.`);
      setErrorMessage('');
      await fetchExpenses();
      await fetchSummary();

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setSuccessMessage('');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setUploadDragActive(true);
  };

  const handleDragLeave = () => {
    setUploadDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setUploadDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Reconcile expenses
  const handleReconcile = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/expenses/reconcile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month_year: selectedMonth }),
      });

      if (!response.ok) throw new Error('Reconciliation failed');

      setSuccessMessage('Expenses reconciled successfully.');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Reconciliation failed');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [fetchExpenses, fetchSummary]);

  const totalTax = summary ? (summary.cgst_total + summary.sgst_total + summary.igst_total) : 0;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[--surface-0] text-[--text-primary]">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-[--text-primary]">Expense Management</h1>
          <p className="text-[--text-secondary] mt-2">Track, manage & reconcile business expenses with GST compliance</p>
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-[--border-default] bg-[--surface-1] text-[--text-primary] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
          />
        </div>
      </div>

      <div className="showcase-panel rounded-3xl p-6 aurora-ring">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[--text-muted] font-black">FINANCIAL OPERATIONS</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[--text-primary] mt-2">Expense Intelligence Console</h2>
            <p className="text-sm text-[--text-muted] mt-2 max-w-3xl">
              Upload, reconcile, and classify expenses with ITC-ready tax visibility for fast filing workflows.
            </p>
          </div>
          <Badge variant="pro"><ReceiptText className="h-3.5 w-3.5 mr-1" /> ACCOUNTING LIVE</Badge>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-emerald-700 dark:text-emerald-300">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4">
          <p className="text-rose-700 dark:text-rose-300">{errorMessage}</p>
        </div>
      )}

      {/* Upload Area */}
      <Card padding="lg" className="border-2 border-dashed border-[--border-default] bg-[--surface-1] cursor-pointer hover:border-[--primary]/50 transition"
            onClick={() => document.getElementById('fileInput')?.click()}>
        <div className={`text-center ${uploadDragActive ? 'bg-[--surface-2]' : ''} p-8 rounded-lg`}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}>
          <Upload className="w-12 h-12 mx-auto mb-4 text-[--text-dim]" />
          <h3 className="font-semibold text-[--text-primary]">Upload Expense Sheet</h3>
          <p className="text-sm text-[--text-secondary] mt-2">
            Drag & drop CSV or Excel file here or click to browse
          </p>
          <input
            id="fileInput"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="pb-2">
            <h3 className="text-sm font-medium text-[--text-secondary]">Total Expenses</h3>
          </div>
          <div>
            <div className="text-2xl font-bold">INR {summary?.total_expenses?.toLocaleString() || '0'}</div>
            <p className="text-xs text-[--text-dim] mt-1">{summary?.count || 0} transactions</p>
          </div>
        </Card>

        <Card padding="md">
          <div className="pb-2">
            <h3 className="text-sm font-medium text-[--text-secondary]">GST Liability</h3>
          </div>
          <div>
            <div className="text-2xl font-bold">INR {totalTax?.toLocaleString() || '0'}</div>
            <div className="text-xs text-[--text-dim] mt-1 space-y-1">
              <p>CGST: INR {summary?.cgst_total?.toLocaleString() || '0'}</p>
              <p>SGST: INR {summary?.sgst_total?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="pb-2">
            <h3 className="text-sm font-medium text-[--text-secondary]">ITC Eligible</h3>
          </div>
          <div>
            <div className="text-2xl font-bold">INR {summary?.itc_eligible_total?.toLocaleString() || '0'}</div>
            <p className="text-xs text-[--text-dim] mt-1">Input Tax Credit available</p>
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Filter by category..."
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="w-40"
        />
        <Input
          type="date"
          placeholder="Start date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="w-40"
        />
        <Input
          type="date"
          placeholder="End date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="w-40"
        />
        <Button
          variant={filters.showOnlyITC ? 'primary' : 'outline'}
          onClick={() => setFilters({ ...filters, showOnlyITC: !filters.showOnlyITC })}
        >
          ITC Eligible Only
        </Button>
        <Button onClick={fetchExpenses} disabled={loading} className="ml-auto">
          <Filter className="w-4 h-4 mr-2" />
          Apply Filters
        </Button>
      </div>

      {/* Expenses Table */}
      <Card padding="md">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[--text-primary]">Expense Transactions</h2>
          <p className="text-sm text-[--text-secondary]">Detailed list of all recorded expenses with GST breakdown</p>
        </div>
        <div className="overflow-x-auto">
          {expenses.length === 0 ? (
            <div className="text-center text-[--text-dim] py-8">
              <p>No expenses found. Upload a file to get started.</p>
            </div>
          ) : (
            <ResponsiveTable
              headers={['Date', 'Category', 'Description', 'Amount', 'GST Rate', 'CGST/SGST', 'ITC', 'Vendor']}
              rows={expenses.map((expense) => [
                expense.date,
                <Badge key={`badge-${expense.id}`}>{expense.category}</Badge>,
                <span key={`desc-${expense.id}`} className="text-sm text-[--text-secondary]">
                  {expense.description}
                </span>,
                <span key={`amt-${expense.id}`} className="font-medium">
                  INR {expense.amount?.toLocaleString()}
                </span>,
                `${expense.gst_rate}%`,
                `INR ${((expense.cgst_amount || 0) + (expense.sgst_amount || 0))?.toLocaleString()}`,
                <Badge key={`itc-${expense.id}`} variant={expense.itc_eligible ? 'success' : 'outline'}>
                  {expense.itc_eligible ? 'Eligible' : 'Not Eligible'}
                </Badge>,
                expense.vendor_name || '-',
              ])}
            />
          )}
        </div>
      </Card>

      {/* Reconciliation */}
      <Card padding="md" className="bg-[--surface-2] border-[--border-default]">
        <div className="mb-4">
          <h2 className="text-[--text-primary] font-semibold">Monthly Reconciliation</h2>
          <p className="text-sm text-[--text-secondary]">
            Finalize expenses for GST filing
          </p>
        </div>
        <Button onClick={handleReconcile} className="w-full md:w-auto">
          Reconcile {selectedMonth} Expenses
        </Button>
      </Card>
    </div>
  );
}
