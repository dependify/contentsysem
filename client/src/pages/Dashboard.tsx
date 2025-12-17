
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

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          <Icon className={color} size={24} />
        </div>
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

  if (loading) return <div>Loading dashboard...</div>;

  const totalProcessed = stats?.agent_performance?.reduce((acc, curr) => acc + parseInt(curr.executions), 0) || 0;
  const failedJobs = stats?.queue_stats?.find(s => s.status === 'failed')?.count || 0;
  const pendingJobs = stats?.queue_stats?.find(s => s.status === 'pending')?.count || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">System Overview</h2>
        <p className="text-gray-400 mt-2">Real-time health and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Agent Executions" 
          value={totalProcessed.toString()} 
          icon={Activity} 
          color="text-blue-400" 
        />
        <StatCard 
          title="Pending Queue" 
          value={pendingJobs.toString()} 
          icon={Clock} 
          color="text-yellow-400" 
        />
        <StatCard 
          title="Failed Jobs" 
          value={failedJobs.toString()} 
          icon={Server} 
          color="text-red-400" 
        />
        <StatCard 
          title="Active Workers" 
          value="1" 
          icon={Database} 
          color="text-green-400" 
        />
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Agent Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Agent Name</th>
                <th className="px-6 py-3">Executions</th>
                <th className="px-6 py-3">Success Rate</th>
                <th className="px-6 py-3">Avg Duration (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats?.agent_performance?.map((agent) => (
                <tr key={agent.agent_name} className="hover:bg-gray-750">
                  <td className="px-6 py-4 font-medium">{agent.agent_name}</td>
                  <td className="px-6 py-4">{agent.executions}</td>
                  <td className="px-6 py-4">
                    {Math.round((parseInt(agent.successes) / parseInt(agent.executions)) * 100)}%
                  </td>
                  <td className="px-6 py-4">{Math.round(agent.avg_duration)}ms</td>
                </tr>
              ))}
              {(!stats?.agent_performance || stats.agent_performance.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No performance data available yet.
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
