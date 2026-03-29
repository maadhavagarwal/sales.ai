'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { getAuthToken } from '@/lib/session';
import {
  Sparkles,
  Radar,
  Bot,
  Wrench,
  Zap,
  Users,
  Layers,
  CircleDollarSign,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TriangleAlert,
  RefreshCcw,
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

type SegmentTab = 'overview' | 'rfm' | 'clusters' | 'builder' | 'triggers';

type SegmentRule = { field: string; operator: string; value: string };

function getToken() {
  return getAuthToken() || '';
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

async function apiFetch(path: string, opts: any = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...authHeaders(), ...opts.headers } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#10b981',
  'Loyal Customers': '#3b82f6',
  'New Customers': '#8b5cf6',
  'Potential Loyalists': '#f59e0b',
  'At Risk': '#ef4444',
  Lost: '#64748b',
  Hibernating: '#94a3b8',
  'High-Value Active': '#0ea5e9',
  'Growth Potential': '#6366f1',
  'At-Risk Valuable': '#f97316',
  Dormant: '#64748b',
};

function formatInr(value: number | undefined) {
  return `INR ${(value || 0).toLocaleString()}`;
}

function KPI({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-[--text-muted] font-black">{label}</p>
        <div className="text-[--primary]">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-black text-[--text-primary] tracking-tight">{value}</p>
    </Card>
  );
}

export default function SegmentAnalysisPage() {
  const [activeTab, setActiveTab] = useState<SegmentTab>('overview');
  const [insights, setInsights] = useState<any>(null);
  const [rfmData, setRfmData] = useState<any[]>([]);
  const [clusterData, setClusterData] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSegName, setNewSegName] = useState('');
  const [newSegRules, setNewSegRules] = useState<SegmentRule[]>([{ field: 'total_revenue', operator: '>=', value: '10000' }]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, segRes] = await Promise.all([
        apiFetch('/api/segments/insights/dashboard').catch(() => ({ total_segments: 0, segments: [], total_customers: 0, total_revenue: 0 })),
        apiFetch('/api/segments').catch(() => ({ segments: [] })),
      ]);
      setInsights(insRes);
      setSegments(segRes.segments || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runRFM = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/segments/rfm/auto-create', { method: 'POST' });
      const rfm = await apiFetch('/api/segments/rfm/compute');
      setRfmData(rfm.rfm_data || []);
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const runClustering = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/segments/ai/cluster', {
        method: 'POST',
        body: JSON.stringify({ n_clusters: 4 }),
      });
      setClusterData(res);
    } finally {
      setLoading(false);
    }
  };

  const autoDetect = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/segments/auto-detect', { method: 'POST' });
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const createSegment = async () => {
    if (!newSegName.trim()) return;
    setLoading(true);
    try {
      await apiFetch('/api/segments', {
        method: 'POST',
        body: JSON.stringify({
          name: newSegName,
          type: 'rule',
          rules: newSegRules,
          description: `Custom segment: ${newSegName}`,
        }),
      });
      setNewSegName('');
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: SegmentTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Radar className="h-4 w-4" /> },
    { id: 'rfm', label: 'RFM', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'clusters', label: 'AI Clusters', icon: <Bot className="h-4 w-4" /> },
    { id: 'builder', label: 'Builder', icon: <Wrench className="h-4 w-4" /> },
    { id: 'triggers', label: 'Triggers', icon: <Zap className="h-4 w-4" /> },
  ];

  const riskSegments = insights?.risk_segments || [];

  return (
    <div className="min-h-screen bg-[--surface-0] text-[--text-primary] p-6">
      <div className="max-w-[1500px] mx-auto page-rhythm">
        <div className="showcase-panel rounded-3xl p-6 aurora-ring">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[--text-muted] font-black">CUSTOMER INTELLIGENCE</p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[--text-primary] mt-2">Segmentation Command Studio</h1>
              <p className="text-sm text-[--text-muted] mt-2 max-w-3xl">RFM analysis, ML clustering, and rule-based orchestration in one workspace.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="pro" onClick={autoDetect} disabled={loading}><Sparkles className="h-4 w-4 mr-2" />Auto-Detect</Button>
              <Button variant="outline" onClick={() => window.history.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={activeTab === t.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(t.id)}
              className="text-xs font-bold tracking-wide"
            >
              {t.icon}
              <span className="ml-2">{t.label}</span>
            </Button>
          ))}
        </div>

        {loading && (
          <Card variant="glass" padding="lg" className="text-center bg-[--surface-1] border-[--border-subtle]">
            <RefreshCcw className="h-8 w-8 text-[--primary] mx-auto animate-spin" />
            <p className="mt-3 text-sm text-[--text-secondary]">Refreshing segment intelligence...</p>
          </Card>
        )}

        {!loading && activeTab === 'overview' && (
          <div className="page-stack">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <KPI label="Total Segments" value={insights?.total_segments || 0} icon={<Layers className="h-5 w-5" />} />
              <KPI label="Total Customers" value={insights?.total_customers || 0} icon={<Users className="h-5 w-5" />} />
              <KPI label="Total Revenue" value={formatInr(insights?.total_revenue || 0)} icon={<CircleDollarSign className="h-5 w-5" />} />
              <KPI label="Top Segment" value={insights?.top_segment || 'N/A'} icon={<Trophy className="h-5 w-5" />} />
            </div>

            <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-[--text-muted] mb-4">Segment Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[--text-muted] border-b border-[--border-subtle]">
                      <th className="text-left py-2">Segment</th>
                      <th className="text-right py-2">Members</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Contribution</th>
                      <th className="text-center py-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(insights?.segments || []).map((s: any, i: number) => (
                      <tr key={`${s.name}-${i}`} className="border-b border-[--border-subtle]/50">
                        <td className="py-3 font-semibold">{s.name}</td>
                        <td className="py-3 text-right">{s.member_count || 0}</td>
                        <td className="py-3 text-right font-semibold">{formatInr(s.total_revenue || 0)}</td>
                        <td className="py-3 text-right">{(s.revenue_contribution_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 text-center">
                          {s.growth_trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-500 mx-auto" />}
                          {s.growth_trend === 'down' && <ArrowDownRight className="h-4 w-4 text-rose-500 mx-auto" />}
                          {!['up', 'down'].includes(String(s.growth_trend)) && <Minus className="h-4 w-4 text-[--text-dim] mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {riskSegments.length > 0 && (
              <Card variant="outlined" padding="md" className="border-amber-500/40 bg-amber-500/10">
                <div className="flex items-center gap-2 mb-3"><TriangleAlert className="h-4 w-4 text-amber-500" /><p className="text-sm font-black uppercase tracking-[0.12em]">At-Risk Segments</p></div>
                <div className="space-y-2 text-sm">
                  {riskSegments.map((s: any, i: number) => (
                    <p key={`${s.name}-${i}`} className="text-[--text-secondary]">{s.name}: {s.member_count} customers, {formatInr(s.total_revenue || 0)} ({s.revenue_contribution_pct}% contribution)</p>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {!loading && activeTab === 'rfm' && (
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-black">RFM Segmentation</h2>
                <p className="text-sm text-[--text-muted]">Recency, frequency, and monetary scoring.</p>
              </div>
              <Button variant="pro" onClick={runRFM} disabled={loading}><Sparkles className="h-4 w-4 mr-2" />Run RFM</Button>
            </div>
            {rfmData.length === 0 ? (
              <p className="text-sm text-[--text-muted]">Run RFM to generate customer groups.</p>
            ) : (
              <p className="text-sm text-[--text-secondary]">Generated {rfmData.length} customer rows for segmentation.</p>
            )}
          </Card>
        )}

        {!loading && activeTab === 'clusters' && (
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-black">AI Clustering</h2>
                <p className="text-sm text-[--text-muted]">K-means profile generation for behavioral cohorts.</p>
              </div>
              <Button variant="pro" onClick={runClustering} disabled={loading}><Bot className="h-4 w-4 mr-2" />Run Clustering</Button>
            </div>
            {clusterData?.clusters?.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {clusterData.clusters.map((c: any, i: number) => (
                  <Card key={`${c.cluster_name}-${i}`} variant="outlined" padding="md" className="bg-[--surface-2] border-[--border-subtle]">
                    <p className="text-sm font-black text-[--text-primary]">{c.cluster_name}</p>
                    <p className="text-xs text-[--text-muted] mt-1">Members: {c.member_count}</p>
                    <p className="text-xs text-[--text-secondary] mt-2">Avg Revenue: {formatInr(c.avg_monetary || 0)}</p>
                    <p className="text-xs text-[--text-secondary]">Total Revenue: {formatInr(c.total_revenue || 0)}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[--text-muted]">Run clustering to view ML groups.</p>
            )}
          </Card>
        )}

        {!loading && activeTab === 'builder' && (
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <h2 className="text-xl font-black mb-4">Rule Builder</h2>
            <div className="space-y-3">
              <input
                value={newSegName}
                onChange={(e) => setNewSegName(e.target.value)}
                placeholder="Segment name"
                className="w-full rounded-lg border border-[--border-default] bg-[--surface-2] px-3 py-2 text-sm text-[--text-primary]"
              />
              {newSegRules.map((rule, i) => (
                <div key={`rule-${i}`} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={rule.field}
                    onChange={(e) => {
                      const updated = [...newSegRules];
                      updated[i].field = e.target.value;
                      setNewSegRules(updated);
                    }}
                    className="rounded-lg border border-[--border-default] bg-[--surface-2] px-3 py-2 text-sm"
                  >
                    <option value="total_revenue">Total Revenue</option>
                    <option value="order_count">Order Count</option>
                    <option value="last_order_days">Days Since Last Order</option>
                    <option value="avg_order_value">Avg Order Value</option>
                  </select>
                  <select
                    value={rule.operator}
                    onChange={(e) => {
                      const updated = [...newSegRules];
                      updated[i].operator = e.target.value;
                      setNewSegRules(updated);
                    }}
                    className="rounded-lg border border-[--border-default] bg-[--surface-2] px-3 py-2 text-sm"
                  >
                    <option value=">=">&gt;=</option>
                    <option value=">">&gt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </select>
                  <input
                    value={rule.value}
                    onChange={(e) => {
                      const updated = [...newSegRules];
                      updated[i].value = e.target.value;
                      setNewSegRules(updated);
                    }}
                    className="rounded-lg border border-[--border-default] bg-[--surface-2] px-3 py-2 text-sm"
                  />
                  <Button variant="outline" onClick={() => setNewSegRules(newSegRules.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => setNewSegRules([...newSegRules, { field: 'total_revenue', operator: '>=', value: '5000' }])}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
                <Button variant="pro" onClick={createSegment} disabled={!newSegName.trim()}>Create Segment</Button>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {segments.map((s: any) => (
                <Card key={s.id} variant="outlined" padding="sm" className="bg-[--surface-2] border-[--border-subtle]">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{s.name}</p>
                    <Badge variant="outline" size="sm">{s.type}</Badge>
                  </div>
                  <p className="text-xs text-[--text-muted] mt-1">{s.member_count || 0} members | {formatInr(s.total_revenue || 0)}</p>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {!loading && activeTab === 'triggers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { name: 'Churn Prevention', desc: 'Alert when users enter at-risk cohorts.' },
              { name: 'VIP Welcome', desc: 'Notify success team when champions emerge.' },
              { name: 'Re-engagement', desc: 'Launch campaign for dormant customers.' },
              { name: 'Pricing Alert', desc: 'Signal cluster shifts in price-sensitive groups.' },
            ].map((item) => (
              <Card key={item.name} variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
                <p className="text-sm font-black">{item.name}</p>
                <p className="text-xs text-[--text-muted] mt-2">{item.desc}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
