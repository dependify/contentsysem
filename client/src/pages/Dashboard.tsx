
import { useEffect, useState } from 'react';
import { Activity, Server, Database, Clock } from 'lucide-react';
import api from '../lib/api';

interface Stats {
  queue_stats: Array<{ status: string; count: string }>;
  agent_performance: Array<{ 
    agent_name: string; 
    executions: string; 
    avg_duration: number;
    successes: string;
    failures: string;
  }>;
}

import { ArrowUp, ArrowDown } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color, bgColor, trend }: { title: string, value: string, icon: any, color: string, bgColor: string, trend?: { value: string, isPositive: boolean } }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-600/50 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor} transition-colors group-hover:bg-opacity-20`}>
          <Icon className={color} size={22} />
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trend.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend.isPositive ? <ArrowUp size={12} className="mr-1" /> : <ArrowDown size={12} className="mr-1" />}
            {trend.value}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/system/stats')
      .then(res => setStats(res.data.stats))
      .catch(err => console.error('Failed to fetch stats', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm animate-pulse">Loading dashboard metrics...</p>
      </div>
    </div>
  );

  const totalProcessed = stats?.agent_performance?.reduce((acc, curr) => acc + parseInt(curr.executions), 0) || 0;
  const failedJobs = stats?.queue_stats?.find(s => s.status === 'failed')?.count || 0;
  const pendingJobs = stats?.queue_stats?.find(s => s.status === 'pending')?.count || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">System Overview</h2>
          <p className="text-gray-400 mt-2 text-sm">Real-time health and performance metrics across all agents</p>
        </div>
        <div className="text-xs text-gray-500 font-mono bg-gray-800/50 px-3 py-1 rounded border border-gray-700/50">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Executions"
          value={totalProcessed.toString()} 
          icon={Activity} 
          color="text-blue-400"
          bgColor="bg-blue-400/10"
          trend={{ value: "12% vs last week", isPositive: true }}
        />
        <StatCard 
          title="Pending Queue" 
          value={pendingJobs.toString()} 
          icon={Clock} 
          color="text-yellow-400"
          bgColor="bg-yellow-400/10"
          trend={{ value: "Stable", isPositive: true }}
        />
        <StatCard 
          title="Failed Jobs" 
          value={failedJobs.toString()} 
          icon={Server} 
          color="text-red-400"
          bgColor="bg-red-400/10"
          trend={{ value: "2 new errors", isPositive: false }}
        />
        <StatCard 
          title="Active Workers" 
          value="1" 
          icon={Database} 
          color="text-emerald-400"
          bgColor="bg-emerald-400/10"
          trend={{ value: "Optimal", isPositive: true }}
        />
      </div>

      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Agent Performance</h3>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">View All Reports</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Agent Name</th>
                <th className="px-6 py-4 font-medium">Executions</th>
                <th className="px-6 py-4 font-medium">Success Rate</th>
                <th className="px-6 py-4 font-medium">Avg Duration</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {stats?.agent_performance?.map((agent) => {
                const successRate = Math.round((parseInt(agent.successes) / parseInt(agent.executions)) * 100);
                return (
                  <tr key={agent.agent_name} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mr-3"></div>
                        <span className="font-medium text-gray-200">{agent.agent_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{agent.executions}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${successRate > 90 ? 'bg-green-500' : successRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${successRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-300">{successRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{Math.round(agent.avg_duration)}ms</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Active
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!stats?.agent_performance || stats.agent_performance.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Database size={32} className="text-gray-600 mb-2" />
                      <p>No performance data available yet.</p>
                      <p className="text-xs text-gray-600">Run some workflows to see analytics here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
