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

// ──────────── RFM SEGMENT LABELS & COLORS ────────────
const SEGMENT_COLORS: Record<string, string> = {
  'Champions': '#10b981',
  'Loyal Customers': '#3b82f6',
  'New Customers': '#8b5cf6',
  'Potential Loyalists': '#f59e0b',
  'At Risk': '#ef4444',
  'Lost': '#6b7280',
  'Hibernating': '#94a3b8',
  'High-Value Active': '#10b981',
  'Growth Potential': '#3b82f6',
  'At-Risk Valuable': '#f59e0b',
  'Dormant': '#6b7280',
};

// ──────────── SUB-COMPONENTS ────────────

function KPICard({ label, value, icon, color = '#3b82f6' }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
      backdropFilter: 'blur(12px)', transition: 'all 0.3s', cursor: 'default',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}22`, fontSize: 22,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
      </div>
    </div>
  );
}

function SegmentBar({ segments }: { segments: any[] }) {
  const total = segments.reduce((a: number, s: any) => a + (s.total_revenue || 0), 0);
  if (!total) return <div style={{ color: '#64748b', padding: 16 }}>No revenue data</div>;
  return (
    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 32, marginBottom: 16 }}>
      {segments.filter((s: any) => s.total_revenue > 0).map((s: any, i: number) => {
        const pct = (s.total_revenue / total) * 100;
        return (
          <div key={i} title={`${s.name}: ₹${s.total_revenue?.toLocaleString()} (${pct.toFixed(1)}%)`}
            style={{
              width: `${Math.max(pct, 2)}%`, background: SEGMENT_COLORS[s.name] || `hsl(${i * 60}, 65%, 55%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: pct > 8 ? 11 : 0, color: '#fff', fontWeight: 600, transition: 'all 0.5s',
            }}>
            {pct > 8 ? `${pct.toFixed(0)}%` : ''}
          </div>
        );
      })}
    </div>
  );
}

function SegmentTable({ data, onSelect }: { data: any[]; onSelect?: (s: any) => void }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
        <thead>
          <tr style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>Segment</th>
            <th style={{ textAlign: 'center', padding: '8px 12px' }}>Type</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>Members</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>Revenue</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>Contribution</th>
            <th style={{ textAlign: 'center', padding: '8px 12px' }}>Trend</th>
            <th style={{ textAlign: 'center', padding: '8px 12px' }}>Risk</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s: any, i: number) => (
            <tr key={i} onClick={() => onSelect?.(s)} style={{
              background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
              transition: 'background 0.2s', borderRadius: 8,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
              <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: SEGMENT_COLORS[s.name] || '#3b82f6', display: 'inline-block',
                }} />
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{s.name}</span>
              </td>
              <td style={{ textAlign: 'center', padding: '12px' }}>
                <span style={{
                  background: s.type === 'rfm' ? '#8b5cf622' : s.type === 'ai_cluster' ? '#10b98122' : '#3b82f622',
                  color: s.type === 'rfm' ? '#a78bfa' : s.type === 'ai_cluster' ? '#34d399' : '#60a5fa',
                  padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                }}>{s.type?.toUpperCase() || 'RULE'}</span>
              </td>
              <td style={{ textAlign: 'right', padding: '12px', color: '#cbd5e1', fontWeight: 600 }}>
                {s.member_count || 0}
              </td>
              <td style={{ textAlign: 'right', padding: '12px', color: '#10b981', fontWeight: 700 }}>
                ₹{(s.total_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td style={{ textAlign: 'right', padding: '12px', color: '#94a3b8' }}>
                {(s.revenue_contribution_pct || 0).toFixed(1)}%
              </td>
              <td style={{ textAlign: 'center', padding: '12px' }}>
                {s.growth_trend === 'up' ? '📈' : s.growth_trend === 'down' ? '📉' : '➡️'}
              </td>
              <td style={{ textAlign: 'center', padding: '12px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: s.risk_level === 'high' ? '#ef444422' : s.risk_level === 'medium' ? '#f59e0b22' : '#10b98122',
                  color: s.risk_level === 'high' ? '#f87171' : s.risk_level === 'medium' ? '#fbbf24' : '#34d399',
                }}>{(s.risk_level || 'low').toUpperCase()}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────── MAIN PAGE ────────────

export default function SegmentAnalysisPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rfm' | 'clusters' | 'builder' | 'triggers'>('overview');
  const [insights, setInsights] = useState<any>(null);
  const [rfmData, setRfmData] = useState<any[]>([]);
  const [clusterData, setClusterData] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);

  // Builder state
  const [newSegName, setNewSegName] = useState('');
  const [newSegRules, setNewSegRules] = useState([{ field: 'total_revenue', operator: '>=', value: '10000' }]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, segRes] = await Promise.all([
        apiFetch('/api/segments/insights').catch(() => ({ total_segments: 0, segments: [], total_customers: 0, total_revenue: 0 })),
        apiFetch('/api/segments').catch(() => ({ segments: [] })),
      ]);
      setInsights(insRes);
      setSegments(segRes.segments || []);
    } catch { /* handled */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runRFM = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/segments/analysis/rfm/create', { method: 'POST' });
      const rfm = await apiFetch('/api/segments/analysis/rfm');
      setRfmData(rfm.rfm_data || []);
      await loadData();
    } catch { /* handled */ }
    setLoading(false);
  };

  const runClustering = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/segments/analysis/clustering', {
        method: 'POST', body: JSON.stringify({ n_clusters: 4 }),
      });
      setClusterData(res);
    } catch { /* handled */ }
    setLoading(false);
  };

  const createSegment = async () => {
    if (!newSegName.trim()) return;
    setLoading(true);
    try {
      await apiFetch('/api/segments', {
        method: 'POST',
        body: JSON.stringify({ name: newSegName, type: 'rule', rules: newSegRules, description: `Custom segment: ${newSegName}` }),
      });
      setNewSegName('');
      await loadData();
    } catch { /* handled */ }
    setLoading(false);
  };

  const autoDetect = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/segments/auto-detect', { method: 'POST' });
      await loadData();
    } catch { /* handled */ }
    setLoading(false);
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'rfm', label: '🎯 RFM Analysis', icon: '🎯' },
    { id: 'clusters', label: '🤖 AI Clusters', icon: '🤖' },
    { id: 'builder', label: '🔧 Segment Builder', icon: '🔧' },
    { id: 'triggers', label: '⚡ Triggers', icon: '⚡' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      color: '#e2e8f0', fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Segment Analysis
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            RFM · AI Clustering · Rule-Based · Real-Time Insights
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={autoDetect} disabled={loading} style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: '#fff',
            padding: '10px 20px', borderRadius: 12, fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.5 : 1, fontSize: 14,
          }}>
            🤖 Auto-Detect Segments
          </button>
          <button onClick={() => window.history.back()} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', padding: '10px 20px', borderRadius: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            ← Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '16px 32px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
            background: activeTab === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
            border: 'none', borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === t.id ? '#a5b4fc' : '#64748b', padding: '12px 20px',
            fontWeight: 600, cursor: 'pointer', fontSize: 14, borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {loading && (
          <div style={{
            textAlign: 'center', padding: 40, color: '#a5b4fc',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            Processing segments...
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && !loading && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
              <KPICard label="Total Segments" value={insights?.total_segments || 0} icon="📊" color="#6366f1" />
              <KPICard label="Total Customers" value={insights?.total_customers || 0} icon="👥" color="#10b981" />
              <KPICard label="Total Revenue" value={`₹${(insights?.total_revenue || 0).toLocaleString()}`} icon="💰" color="#f59e0b" />
              <KPICard label="Top Segment" value={insights?.top_segment || 'N/A'} icon="🏆" color="#8b5cf6" />
            </div>

            {insights?.segments?.length > 0 && (
              <>
                <h3 style={{ color: '#94a3b8', marginBottom: 12, fontWeight: 600 }}>Revenue Distribution</h3>
                <SegmentBar segments={insights.segments} />
                <SegmentTable data={insights.segments} onSelect={setSelectedSegment} />
              </>
            )}

            {insights?.risk_segments?.length > 0 && (
              <div style={{
                marginTop: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12, padding: 20,
              }}>
                <h3 style={{ color: '#f87171', margin: '0 0 8px' }}>⚠️ At-Risk Segments</h3>
                {insights.risk_segments.map((s: any, i: number) => (
                  <div key={i} style={{ color: '#fca5a5', fontSize: 14, padding: '4px 0' }}>
                    {s.name}: {s.member_count} customers, ₹{s.total_revenue?.toLocaleString()} revenue ({s.revenue_contribution_pct}%)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RFM TAB */}
        {activeTab === 'rfm' && !loading && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, color: '#f1f5f9' }}>RFM Segmentation</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                  Analyze customers by Recency, Frequency, and Monetary value
                </p>
              </div>
              <button onClick={runRFM} style={{
                background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff',
                padding: '10px 24px', borderRadius: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                🎯 Run RFM Analysis
              </button>
            </div>

            {rfmData.length > 0 && (
              <>
                {/* RFM Segment Distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {Object.entries(rfmData.reduce((acc: Record<string, number>, d: any) => {
                    acc[d.segment] = (acc[d.segment] || 0) + 1;
                    return acc;
                  }, {})).map(([name, count]) => (
                    <div key={name} style={{
                      background: `${SEGMENT_COLORS[name] || '#3b82f6'}15`,
                      border: `1px solid ${SEGMENT_COLORS[name] || '#3b82f6'}33`,
                      borderRadius: 12, padding: 16, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: SEGMENT_COLORS[name] || '#3b82f6' }}>{count as number}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{name}</div>
                    </div>
                  ))}
                </div>

                {/* Customer Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 3px' }}>
                    <thead>
                      <tr style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' as const }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>Customer</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>R</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>F</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>M</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>RFM Score</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>Revenue</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Segment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfmData.slice(0, 30).map((d: any, i: number) => (
                        <tr key={i} style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: 8, fontWeight: 600, color: '#e2e8f0' }}>{d.customer_id}</td>
                          <td style={{ textAlign: 'center', padding: 8, color: '#60a5fa' }}>{d.r_score}</td>
                          <td style={{ textAlign: 'center', padding: 8, color: '#a78bfa' }}>{d.f_score}</td>
                          <td style={{ textAlign: 'center', padding: 8, color: '#34d399' }}>{d.m_score}</td>
                          <td style={{ textAlign: 'right', padding: 8, fontWeight: 700, color: '#f1f5f9' }}>{d.rfm_score}</td>
                          <td style={{ textAlign: 'right', padding: 8, color: '#10b981' }}>₹{d.monetary?.toLocaleString()}</td>
                          <td style={{ textAlign: 'center', padding: 8 }}>
                            <span style={{
                              background: `${SEGMENT_COLORS[d.segment] || '#3b82f6'}22`,
                              color: SEGMENT_COLORS[d.segment] || '#3b82f6',
                              padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            }}>{d.segment}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* CLUSTERS TAB */}
        {activeTab === 'clusters' && !loading && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, color: '#f1f5f9' }}>AI Clustering</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                  K-Means machine learning clustering for deep customer segmentation
                </p>
              </div>
              <button onClick={runClustering} style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: 'none', color: '#fff',
                padding: '10px 24px', borderRadius: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                🤖 Run AI Clustering
              </button>
            </div>

            {clusterData?.clusters && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {clusterData.clusters.map((c: any, i: number) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16, padding: 24, transition: 'transform 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ margin: 0, color: `hsl(${i * 80}, 70%, 65%)`, fontSize: 16 }}>
                        {c.cluster_name}
                      </h3>
                      <span style={{
                        background: `hsl(${i * 80}, 70%, 65%, 0.15)`, color: `hsl(${i * 80}, 70%, 65%)`,
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      }}>{c.member_count} customers</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Avg Recency</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{c.avg_recency_days?.toFixed(0) || 'N/A'}d</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Avg Frequency</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>{c.avg_frequency?.toFixed(1) || 'N/A'}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Avg Revenue</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>₹{c.avg_monetary?.toLocaleString() || 0}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Revenue</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24' }}>₹{c.total_revenue?.toLocaleString() || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BUILDER TAB */}
        {activeTab === 'builder' && !loading && (
          <div>
            <h2 style={{ color: '#f1f5f9', marginBottom: 20 }}>Dynamic Segment Builder</h2>
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 24, marginBottom: 24,
            }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Segment Name</label>
                <input value={newSegName} onChange={e => setNewSegName(e.target.value)}
                  placeholder="e.g., High-Value Buyers"
                  style={{
                    width: '100%', padding: '10px 16px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0',
                    fontSize: 14, outline: 'none',
                  }} />
              </div>

              <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>Rules</label>
              {newSegRules.map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select value={rule.field} onChange={e => {
                    const updated = [...newSegRules]; updated[i].field = e.target.value; setNewSegRules(updated);
                  }} style={{
                    flex: 1, padding: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                  }}>
                    <option value="total_revenue">Total Revenue</option>
                    <option value="order_count">Order Count</option>
                    <option value="last_order_days">Days Since Last Order</option>
                    <option value="avg_order_value">Avg Order Value</option>
                  </select>
                  <select value={rule.operator} onChange={e => {
                    const updated = [...newSegRules]; updated[i].operator = e.target.value; setNewSegRules(updated);
                  }} style={{
                    width: 80, padding: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                  }}>
                    <option value=">=">≥</option>
                    <option value=">">{'>'}</option>
                    <option value="<=">≤</option>
                    <option value="<">{'<'}</option>
                    <option value="=">=</option>
                  </select>
                  <input value={rule.value} onChange={e => {
                    const updated = [...newSegRules]; updated[i].value = e.target.value; setNewSegRules(updated);
                  }} style={{
                    width: 120, padding: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                  }} />
                  <button onClick={() => setNewSegRules(newSegRules.filter((_, j) => j !== i))} style={{
                    background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171',
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button onClick={() => setNewSegRules([...newSegRules, { field: 'total_revenue', operator: '>=', value: '5000' }])}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  }}>+ Add Rule</button>
                <button onClick={createSegment} disabled={!newSegName.trim()} style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff',
                  padding: '8px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                  opacity: newSegName.trim() ? 1 : 0.5,
                }}>Create Segment</button>
              </div>
            </div>

            {/* Existing Segments */}
            <h3 style={{ color: '#94a3b8', marginBottom: 12 }}>Existing Segments</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {segments.map((s: any) => (
                <div key={s.id} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{s.name}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 8,
                      background: s.type === 'rfm' ? '#8b5cf622' : '#3b82f622',
                      color: s.type === 'rfm' ? '#a78bfa' : '#60a5fa',
                    }}>{s.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{s.member_count || 0} members · ₹{(s.total_revenue || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRIGGERS TAB */}
        {activeTab === 'triggers' && !loading && (
          <div>
            <h2 style={{ color: '#f1f5f9', marginBottom: 8 }}>Segment-Based Triggers</h2>
            <p style={{ color: '#64748b', marginBottom: 24 }}>Automate actions when customers enter or exit segments</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { name: 'Churn Prevention', desc: 'Alert when customer enters "At Risk" segment', icon: '🚨', color: '#ef4444' },
                { name: 'Welcome New VIP', desc: 'Send email when customer becomes "Champion"', icon: '🎉', color: '#10b981' },
                { name: 'Re-engagement', desc: 'Trigger campaign for "Hibernating" customers', icon: '📧', color: '#f59e0b' },
                { name: 'Price Alert', desc: 'Notify on cluster shift for price-sensitive segment', icon: '💰', color: '#8b5cf6' },
              ].map((t, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = t.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{t.icon}</div>
                  <h3 style={{ margin: '0 0 4px', color: '#e2e8f0', fontSize: 16 }}>{t.name}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
