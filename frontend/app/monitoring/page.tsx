'use client';

import { useState, useEffect } from 'react';

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshRate, setRefreshRate] = useState(5000); // 5 seconds

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics/dashboard');
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const data = await response.json();
        setMetrics(data);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshRate);
    return () => clearInterval(interval);
  }, [refreshRate]);

  if (loading) return <div className="text-center py-8 text-gray-400">Loading metrics...</div>;
  if (error) return <div className="text-center py-8 text-red-400">Error: {error}</div>;
  if (!metrics) return <div className="text-center py-8 text-gray-400">No data available</div>;

  const healthColor = metrics.health_score > 80 ? 'text-green-400' : 
                     metrics.health_score > 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">System Monitoring Dashboard</h1>
            <p className="text-gray-400">Real-time performance metrics and health status</p>
          </div>
          <div className="flex gap-3">
            <select 
              value={refreshRate} 
              onChange={(e) => setRefreshRate(Number(e.target.value))}
              className="px-3 py-2 bg-slate-700 text-white rounded text-sm border border-slate-600"
            >
              <option value={1000}>1s refresh</option>
              <option value={5000}>5s refresh</option>
              <option value={10000}>10s refresh</option>
              <option value={30000}>30s refresh</option>
            </select>
            <span className="text-gray-400 text-sm py-2">
              Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Health Scores Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Overall Health */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-white">Overall Health</h2>
              <span className={`text-3xl font-bold ${healthColor}`}>
                {metrics.health_score}
              </span>
            </div>
            <p className="text-gray-300 mb-4">{metrics.health_status}</p>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  metrics.health_score > 80 ? 'bg-green-500' : 
                  metrics.health_score > 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{width: `${metrics.health_score}%`}}
              />
            </div>
          </div>

          {/* System Status */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">CPU Usage</span>
                <span className="text-white font-mono">{metrics.system.cpu_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-500"
                  style={{width: `${metrics.system.cpu_percent}%`}}
                />
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-gray-400">Memory Usage</span>
                <span className="text-white font-mono">{metrics.system.memory_percent.toFixed(1)}% ({metrics.system.memory_mb.toFixed(0)}MB)</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-purple-500"
                  style={{width: `${metrics.system.memory_percent}%`}}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {metrics.recommendations && metrics.recommendations.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">System Recommendations</h2>
            <ul className="space-y-2">
              {metrics.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="text-gray-300 font-mono text-sm">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Endpoints Performance */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Top Endpoints by Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-white">Endpoint</th>
                  <th className="text-right py-3 px-4">Requests</th>
                  <th className="text-right py-3 px-4">Avg (ms)</th>
                  <th className="text-right py-3 px-4">P95 (ms)</th>
                  <th className="text-right py-3 px-4">P99 (ms)</th>
                  <th className="text-right py-3 px-4">Errors</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics.endpoints)
                  .sort(([, a]: any, [, b]: any) => a.avg_ms - b.avg_ms)
                  .slice(0, 10)
                  .map(([endpoint, data]: any) => (
                    <tr key={endpoint} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4 text-blue-400 font-mono text-xs">{endpoint}</td>
                      <td className="text-right py-3 px-4 text-white">{data.requests}</td>
                      <td className="text-right py-3 px-4">{data.avg_ms.toFixed(2)}</td>
                      <td className="text-right py-3 px-4">{data.p95_ms.toFixed(2)}</td>
                      <td className="text-right py-3 px-4">{data.p99_ms.toFixed(2)}</td>
                      <td className="text-right py-3 px-4">
                        {data.errors > 0 ? <span className="text-red-400 font-bold">{data.errors}</span> : '0'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Summary */}
        {metrics.errors.total > 0 && (
          <div className="bg-slate-800 border border-red-700/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Error Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-red-400 text-3xl font-bold mb-2">{metrics.errors.total}</div>
                <p className="text-gray-400">Total Errors</p>
              </div>
              {metrics.errors.last_error && (
                <div className="bg-slate-700/50 rounded p-4">
                  <p className="text-sm text-gray-400 mb-1">Last Error:</p>
                  <p className="text-white font-mono text-xs">{metrics.errors.last_error.endpoint}</p>
                  <p className="text-red-400 font-mono text-xs mt-1">{metrics.errors.last_error.error}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(metrics.errors.last_error.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
