'use client';

import React, { useState, useEffect, useCallback } from 'react';

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
  { id: 'sales_report', name: 'Sales Report', icon: '📊', color: '#3b82f6', desc: 'Revenue, top customers, monthly trends' },
  { id: 'financial_report', name: 'Financial Report', icon: '💰', color: '#10b981', desc: 'P&L, balance sheet, CFO insights' },
  { id: 'gst_invoice', name: 'GST Invoice', icon: '🧾', color: '#f59e0b', desc: 'Tax invoice with CGST/SGST/IGST' },
  { id: 'proposal', name: 'Business Proposal', icon: '📋', color: '#8b5cf6', desc: 'Professional proposal with pricing' },
  { id: 'contract', name: 'Service Agreement', icon: '📝', color: '#ef4444', desc: 'Legal service agreement template' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'generated': { bg: '#10b98122', text: '#34d399' },
  'draft': { bg: '#f59e0b22', text: '#fbbf24' },
  'sent': { bg: '#3b82f622', text: '#60a5fa' },
  'archived': { bg: '#6b728022', text: '#94a3b8' },
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
    { id: 'generate', label: '🚀 Generate', icon: '🚀' },
    { id: 'library', label: '📁 Library', icon: '📁' },
    { id: 'templates', label: '📋 Templates', icon: '📋' },
    { id: 'scheduled', label: '⏰ Scheduled', icon: '⏰' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1a1a2e 50%, #0f172a 100%)',
      color: '#e2e8f0', fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          background: notification.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
          border: `1px solid ${notification.type === 'success' ? '#10b981' : '#ef4444'}`,
          borderRadius: 12, padding: '12px 20px', color: '#fff', fontWeight: 600,
          backdropFilter: 'blur(12px)', animation: 'slideInRight 0.3s ease',
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 800,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Document Generation
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            AI-Powered Reports · PDF/DOCX · Templates · Scheduled Generation
          </p>
        </div>
        <button onClick={() => window.history.back()} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#94a3b8', padding: '10px 20px', borderRadius: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          ← Back
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '16px 32px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
            background: activeTab === t.id ? 'rgba(245,158,11,0.12)' : 'transparent',
            border: 'none', borderBottom: activeTab === t.id ? '2px solid #f59e0b' : '2px solid transparent',
            color: activeTab === t.id ? '#fbbf24' : '#64748b', padding: '12px 20px',
            fontWeight: 600, cursor: 'pointer', fontSize: 14, borderRadius: '8px 8px 0 0',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div>
            <h2 style={{ color: '#f1f5f9', marginBottom: 4 }}>Generate New Document</h2>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
              Select a document type and format to generate from your live business data
            </p>

            {/* Doc Type Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
              {DOC_TYPES.map(dt => (
                <div key={dt.id} onClick={() => setSelectedDocType(dt.id)} style={{
                  background: selectedDocType === dt.id ? `${dt.color}15` : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${selectedDocType === dt.id ? dt.color : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{dt.icon}</div>
                  <h3 style={{ margin: '0 0 4px', color: selectedDocType === dt.id ? dt.color : '#e2e8f0', fontSize: 16 }}>{dt.name}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>{dt.desc}</p>
                </div>
              ))}
            </div>

            {/* Generation Form */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Document Title (optional)</label>
                  <input value={docTitle} onChange={e => setDocTitle(e.target.value)}
                    placeholder="Auto-generated if empty"
                    style={{
                      width: '100%', padding: '10px 16px', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0',
                      fontSize: 14, outline: 'none',
                    }} />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Output Format</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['pdf', 'docx'].map(f => (
                      <button key={f} onClick={() => setDocFormat(f as any)} style={{
                        flex: 1, padding: '10px', background: docFormat === f ? '#f59e0b22' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${docFormat === f ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 10, color: docFormat === f ? '#fbbf24' : '#94a3b8',
                        fontWeight: 600, cursor: 'pointer', fontSize: 14, textTransform: 'uppercase' as const,
                      }}>{f === 'pdf' ? '📄 PDF' : '📝 DOCX'}</button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedDocType === 'gst_invoice' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Invoice ID</label>
                  <input value={invoiceId} onChange={e => setInvoiceId(e.target.value)}
                    placeholder="Enter invoice ID to generate GST invoice"
                    style={{
                      width: '100%', padding: '10px 16px', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0',
                      fontSize: 14, outline: 'none',
                    }} />
                </div>
              )}

              <button onClick={generateDocument} disabled={generating} style={{
                background: generating
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                border: 'none', color: '#fff', padding: '14px 32px', borderRadius: 12,
                fontWeight: 700, cursor: generating ? 'default' : 'pointer', fontSize: 16,
                width: '100%', transition: 'all 0.3s',
              }}>
                {generating ? '⏳ Generating...' : `🚀 Generate ${DOC_TYPES.find(d => d.id === selectedDocType)?.name || 'Document'}`}
              </button>
            </div>
          </div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, color: '#f1f5f9' }}>Document Library</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{documents.length} documents</p>
              </div>
            </div>

            {documents.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 60, color: '#64748b',
                background: 'rgba(255,255,255,0.02)', borderRadius: 16,
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                <p>No documents yet. Generate your first document!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {documents.map((doc: any) => {
                  const st = STATUS_COLORS[doc.status] || STATUS_COLORS['draft'];
                  const dt = DOC_TYPES.find(d => d.id === doc.doc_type);
                  return (
                    <div key={doc.id} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', transition: 'background 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 22, background: `${dt?.color || '#3b82f6'}15`,
                        }}>{dt?.icon || '📄'}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{doc.title}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {doc.format?.toUpperCase()} · {doc.doc_type?.replace('_', ' ')} · v{doc.version} · {doc.created_at?.slice(0, 10)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          background: st.bg, color: st.text, padding: '3px 10px', borderRadius: 8,
                          fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const,
                        }}>{doc.status}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)}KB` : ''}
                        </span>
                        <button onClick={() => deleteDocument(doc.id)} style={{
                          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                          fontSize: 16, padding: 4,
                        }} title="Archive">🗑️</button>
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
          <div>
            <h2 style={{ color: '#f1f5f9', marginBottom: 4 }}>Document Templates</h2>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
              Pre-built and custom templates for document generation
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {templates.map((tpl: any) => {
                const dt = DOC_TYPES.find(d => d.id === tpl.doc_type);
                return (
                  <div key={tpl.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16, padding: 24, transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = dt?.color || '#3b82f6')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 28 }}>{dt?.icon || '📄'}</span>
                      {tpl.is_default ? (
                        <span style={{
                          background: '#10b98122', color: '#34d399', padding: '2px 10px', borderRadius: 12,
                          fontSize: 11, fontWeight: 600,
                        }}>DEFAULT</span>
                      ) : (
                        <span style={{
                          background: '#3b82f622', color: '#60a5fa', padding: '2px 10px', borderRadius: 12,
                          fontSize: 11, fontWeight: 600,
                        }}>CUSTOM</span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 4px', color: '#e2e8f0' }}>{tpl.name}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                      Type: {tpl.doc_type?.replace('_', ' ')} · ID: {tpl.id}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCHEDULED TAB */}
        {activeTab === 'scheduled' && (
          <div>
            <h2 style={{ color: '#f1f5f9', marginBottom: 4 }}>Scheduled Reports</h2>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
              Configure automated report generation and delivery
            </p>

            {/* Schedule Form */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 24, marginBottom: 24,
            }}>
              <h3 style={{ margin: '0 0 16px', color: '#fbbf24' }}>📅 Schedule New Report</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Report Type</label>
                  <select value={schedType} onChange={e => setSchedType(e.target.value)} style={{
                    width: '100%', padding: 10, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                  }}>
                    {DOC_TYPES.map(dt => (
                      <option key={dt.id} value={dt.id}>{dt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Frequency</label>
                  <select value={schedFreq} onChange={e => setSchedFreq(e.target.value)} style={{
                    width: '100%', padding: 10, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                  }}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Recipient Emails</label>
                  <input value={schedEmails} onChange={e => setSchedEmails(e.target.value)}
                    placeholder="email1@co.com, email2@co.com"
                    style={{
                      width: '100%', padding: '10px 16px', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0',
                      fontSize: 13, outline: 'none',
                    }} />
                </div>
              </div>
              <button onClick={scheduleReport} style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: '#fff',
                padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
              }}>📅 Schedule Report</button>
            </div>

            {/* Existing Schedules */}
            {scheduledReports.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {scheduledReports.map((sr: any) => (
                  <div key={sr.id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {sr.report_type?.replace('_', ' ').replace(/(^|\s)\S/g, (t: string) => t.toUpperCase())}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {sr.frequency} · Next: {sr.next_run?.slice(0, 10)} · ID: {sr.id}
                      </div>
                    </div>
                    <span style={{
                      background: sr.enabled ? '#10b98122' : '#ef444422',
                      color: sr.enabled ? '#34d399' : '#f87171',
                      padding: '3px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    }}>{sr.enabled ? 'ACTIVE' : 'PAUSED'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: 40, color: '#64748b',
                background: 'rgba(255,255,255,0.02)', borderRadius: 16,
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⏰</div>
                No scheduled reports yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
