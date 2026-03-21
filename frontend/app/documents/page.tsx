'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  FileChartColumn,
  FileText,
  FolderOpen,
  HandCoins,
  Library,
  LayoutTemplate,
  ReceiptText,
  ScrollText,
  Sparkles,
  Trash2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('token') || '';
  return '';
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

async function apiFetch(path: string, opts: any = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...authHeaders(), ...opts.headers } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ──────────── DOC TYPE CONFIG ────────────
const DOC_TYPES = [
  {
    id: 'sales_report',
    name: 'Sales Report',
    icon: FileChartColumn,
    desc: 'Revenue, top customers, monthly trends',
    tone: 'text-[--accent-cyan] border-[--accent-cyan]/30 bg-[--accent-cyan]/10',
  },
  {
    id: 'financial_report',
    name: 'Financial Report',
    icon: HandCoins,
    desc: 'P&L, balance sheet, CFO insights',
    tone: 'text-[--accent-emerald] border-[--accent-emerald]/30 bg-[--accent-emerald]/10',
  },
  {
    id: 'gst_invoice',
    name: 'GST Invoice',
    icon: ReceiptText,
    desc: 'Tax invoice with CGST/SGST/IGST',
    tone: 'text-[--accent-amber] border-[--accent-amber]/30 bg-[--accent-amber]/10',
  },
  {
    id: 'proposal',
    name: 'Business Proposal',
    icon: FileText,
    desc: 'Professional proposal with pricing',
    tone: 'text-[--secondary] border-[--secondary]/30 bg-[--secondary]/10',
  },
  {
    id: 'contract',
    name: 'Service Agreement',
    icon: ScrollText,
    desc: 'Legal service agreement template',
    tone: 'text-[--accent-rose] border-[--accent-rose]/30 bg-[--accent-rose]/10',
  },
] as const;

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'info' | 'outline'> = {
  generated: 'success',
  draft: 'warning',
  sent: 'info',
  archived: 'outline',
};

// ──────────── MAIN PAGE ────────────

export default function DocumentGenerationPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'templates' | 'scheduled'>('generate');
  const [documents, setDocuments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  // Generation form state
  const [selectedDocType, setSelectedDocType] = useState('sales_report');
  const [docTitle, setDocTitle] = useState('');
  const [docFormat, setDocFormat] = useState<'pdf' | 'docx'>('pdf');
  const [invoiceId, setInvoiceId] = useState('');

  // Schedule form state
  const [schedFreq, setSchedFreq] = useState('weekly');
  const [schedType, setSchedType] = useState('sales_report');
  const [schedEmails, setSchedEmails] = useState('');

  const showNotification = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, tplRes, schedRes] = await Promise.all([
        apiFetch('/api/documents').catch(() => ({ documents: [] })),
        apiFetch('/api/documents/templates/list').catch(() => ({ templates: [] })),
        apiFetch('/api/documents/scheduled').catch(() => ({ scheduled_reports: [] })),
      ]);
      setDocuments(docsRes.documents || []);
      setTemplates(tplRes.templates || []);
      setScheduledReports(schedRes.scheduled_reports || []);
    } catch { /* handled */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const generateDocument = async () => {
    setGenerating(true);
    try {
      const data: any = {};
      if (selectedDocType === 'gst_invoice' && invoiceId) data.invoice_id = invoiceId;

      const result = await apiFetch('/api/documents/generate', {
        method: 'POST',
        body: JSON.stringify({
          doc_type: selectedDocType,
          title: docTitle || undefined,
          format: docFormat,
          data,
        }),
      });

      if (result.file_base64) {
        // Download the file
        const byteString = atob(result.file_base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: result.mime_type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.title || 'document'}.${result.format}`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('success', `✅ ${result.title} generated & downloaded!`);
      }
      await loadLibrary();
    } catch (e: any) {
      showNotification('error', `❌ Generation failed: ${e.message}`);
    }
    setGenerating(false);
  };

  const scheduleReport = async () => {
    try {
      const emails = schedEmails.split(',').map(e => e.trim()).filter(Boolean);
      await apiFetch('/api/documents/schedule', {
        method: 'POST',
        body: JSON.stringify({ report_type: schedType, frequency: schedFreq, emails }),
      });
      showNotification('success', '✅ Report scheduled successfully!');
      await loadLibrary();
    } catch { showNotification('error', '❌ Failed to schedule report'); }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
      showNotification('success', 'Document archived');
      await loadLibrary();
    } catch { /* handled */ }
  };

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Sparkles },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'scheduled', label: 'Scheduled', icon: CalendarClock },
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-[--radius-sm] border px-4 py-3 text-sm font-semibold shadow-[--shadow-md] backdrop-blur-xl ${
            notification.type === 'success'
              ? 'border-[--accent-emerald]/40 bg-[--accent-emerald]/15 text-[--accent-emerald]'
              : 'border-[--accent-rose]/40 bg-[--accent-rose]/15 text-[--accent-rose]'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <Card variant="glass" padding="md" className="rounded-[--radius-xl]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-rhythm-label">Document Operations</p>
            <h1 className="text-rhythm-h1 text-white">Document Generation</h1>
            <p className="text-sm text-[--text-secondary]">AI reports, templates, export, and scheduled delivery</p>
          </div>
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => window.history.back()}>
            Back
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-[--radius-md] border border-[--border-default] bg-[--surface-1] p-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`inline-flex items-center gap-2 rounded-[--radius-sm] px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-[--primary]/15 text-[--primary] border border-[--primary]/30'
                : 'text-[--text-secondary] border border-transparent hover:text-[--text-primary] hover:bg-white/4'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-7xl">

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-rhythm-h2">Generate New Document</h2>
              <p className="text-sm text-[--text-secondary]">
              Select a document type and format to generate from your live business data
              </p>
            </div>

            {/* Doc Type Selection */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {DOC_TYPES.map(dt => (
                <button
                  key={dt.id}
                  onClick={() => setSelectedDocType(dt.id)}
                  className={`rounded-[--radius-md] border p-5 text-left transition-all ${
                    selectedDocType === dt.id
                      ? `${dt.tone} shadow-[--shadow-glow]`
                      : 'border-[--border-default] bg-[--surface-1] hover:border-[--border-accent]'
                  }`}
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[--radius-sm] border border-current/25">
                    <dt.icon size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-[--text-primary]">{dt.name}</h3>
                  <p className="mt-1 text-xs text-[--text-secondary]">{dt.desc}</p>
                </button>
              ))}
            </div>

            {/* Generation Form */}
            <Card variant="elevated" padding="md">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Document Title (Optional)"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-[--text-secondary]">Output Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['pdf', 'docx'].map(f => (
                      <button
                        key={f}
                        onClick={() => setDocFormat(f as any)}
                        className={`rounded-[--radius-sm] border px-3 py-2 text-sm font-semibold uppercase transition-all ${
                          docFormat === f
                            ? 'border-[--primary]/35 bg-[--primary]/15 text-[--primary]'
                            : 'border-[--border-default] bg-[--surface-1] text-[--text-secondary] hover:text-[--text-primary]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedDocType === 'gst_invoice' && (
                <div className="mt-4">
                  <Input
                    label="Invoice ID"
                    value={invoiceId}
                    onChange={e => setInvoiceId(e.target.value)}
                    placeholder="Enter invoice ID to generate GST invoice"
                  />
                </div>
              )}

              <Button loading={generating} variant="pro" fullWidth className="mt-5" onClick={generateDocument}>
                {generating
                  ? 'Generating...'
                  : `Generate ${DOC_TYPES.find(d => d.id === selectedDocType)?.name || 'Document'}`}
              </Button>
            </Card>
          </div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-rhythm-h2">Document Library</h2>
                <p className="text-sm text-[--text-secondary]">{documents.length} documents</p>
              </div>
            </div>

            {documents.length === 0 ? (
              <Card variant="default" padding="lg" className="text-center">
                <FolderOpen className="mx-auto mb-3 h-10 w-10 text-[--text-muted]" />
                <p className="text-[--text-secondary]">No documents yet. Generate your first document.</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc: any) => {
                  const statusVariant = STATUS_VARIANTS[doc.status] || 'warning';
                  const dt = DOC_TYPES.find(d => d.id === doc.doc_type);
                  const Icon = dt?.icon || FileText;
                  return (
                    <div
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-[--radius-md] border border-[--border-default] bg-[--surface-1] p-4 transition-colors hover:bg-[--surface-2]"
                    >
                      <div className="flex min-w-60 items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[--radius-sm] border border-[--border-default] bg-[--surface-2] text-[--text-secondary]">
                          <Icon size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-[--text-primary]">{doc.title}</div>
                          <div className="text-xs text-[--text-secondary]">
                            {doc.format?.toUpperCase()} · {doc.doc_type?.replace('_', ' ')} · v{doc.version} · {doc.created_at?.slice(0, 10)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={statusVariant} size="md">{doc.status}</Badge>
                        <span className="text-xs text-[--text-secondary]">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)}KB` : ''}
                        </span>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="rounded-[--radius-xs] border border-[--border-default] p-2 text-[--text-muted] hover:text-[--accent-rose]"
                          title="Archive"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-rhythm-h2">Document Templates</h2>
              <p className="text-sm text-[--text-secondary]">
              Pre-built and custom templates for document generation
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((tpl: any) => {
                const dt = DOC_TYPES.find(d => d.id === tpl.doc_type);
                const Icon = dt?.icon || FileText;
                return (
                  <Card key={tpl.id} variant="default" padding="md" className="hover:border-[--border-accent]">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-sm] border border-[--border-default] bg-[--surface-2] text-[--text-secondary]">
                        <Icon size={18} />
                      </div>
                      {tpl.is_default ? (
                        <Badge variant="success" size="sm">Default</Badge>
                      ) : (
                        <Badge variant="info" size="sm">Custom</Badge>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-[--text-primary]">{tpl.name}</h3>
                    <p className="text-sm text-[--text-secondary]">
                      Type: {tpl.doc_type?.replace('_', ' ')} · ID: {tpl.id}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* SCHEDULED TAB */}
        {activeTab === 'scheduled' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-rhythm-h2">Scheduled Reports</h2>
              <p className="text-sm text-[--text-secondary]">
              Configure automated report generation and delivery
              </p>
            </div>

            {/* Schedule Form */}
            <Card variant="elevated" padding="md" className="mb-4">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[--text-primary]">
                <CalendarClock size={18} className="text-[--primary]" />
                Schedule New Report
              </h3>
              <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[--text-secondary]">Report Type</label>
                  <select
                    value={schedType}
                    onChange={e => setSchedType(e.target.value)}
                    className="w-full rounded-[--radius-sm] border border-[--border-default] bg-[--surface-1] px-3 py-2 text-sm text-[--text-primary] outline-none focus:border-[--border-accent]"
                  >
                    {DOC_TYPES.map(dt => (
                      <option key={dt.id} value={dt.id}>{dt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[--text-secondary]">Frequency</label>
                  <select
                    value={schedFreq}
                    onChange={e => setSchedFreq(e.target.value)}
                    className="w-full rounded-[--radius-sm] border border-[--border-default] bg-[--surface-1] px-3 py-2 text-sm text-[--text-primary] outline-none focus:border-[--border-accent]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <Input
                    label="Recipient Emails"
                    value={schedEmails}
                    onChange={e => setSchedEmails(e.target.value)}
                    placeholder="email1@co.com, email2@co.com"
                  />
                </div>
              </div>
              <Button variant="primary" onClick={scheduleReport}>Schedule Report</Button>
            </Card>

            {/* Existing Schedules */}
            {scheduledReports.length > 0 ? (
              <div className="grid gap-3">
                {scheduledReports.map((sr: any) => (
                  <div
                    key={sr.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[--radius-md] border border-[--border-default] bg-[--surface-1] p-4"
                  >
                    <div>
                      <div className="font-semibold text-[--text-primary]">
                        {sr.report_type?.replace('_', ' ').replace(/(^|\s)\S/g, (t: string) => t.toUpperCase())}
                      </div>
                      <div className="text-xs text-[--text-secondary]">
                        {sr.frequency} · Next: {sr.next_run?.slice(0, 10)} · ID: {sr.id}
                      </div>
                    </div>
                    <Badge variant={sr.enabled ? 'success' : 'danger'} size="md">
                      {sr.enabled ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Card variant="default" padding="lg" className="text-center">
                <CalendarClock className="mx-auto mb-2 h-9 w-9 text-[--text-muted]" />
                <p className="text-[--text-secondary]">No scheduled reports yet</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
