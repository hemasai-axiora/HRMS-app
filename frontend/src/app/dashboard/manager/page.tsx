'use client';
import { useEffect, useState } from 'react';
import { getManagerDashboard, getProfile } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TeamWorkload {
  employee: string;
  hours: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string;
  assignee: { firstName: string; lastName: string };
  project: { name: string };
}

interface Dashboard {
  pendingTasks: number;
  pendingOvertime: number;
  teamWorkload: TeamWorkload[];
  recentTasks: Task[];
}

export default function ManagerDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await getProfile();
      const data = await getManagerDashboard(profile.id);
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const workloadData = dashboard?.teamWorkload || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manager Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pending Tasks</div>
          <div className="text-2xl font-bold">{dashboard?.pendingTasks}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pending Overtime</div>
          <div className="text-2xl font-bold">{dashboard?.pendingOvertime}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Team Members</div>
          <div className="text-2xl font-bold">{workloadData.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Team Workload (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="employee" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Tasks</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Task</th>
                  <th className="text-left py-2 px-2">Assignee</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.recentTasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-sm">{task.title}</td>
                    <td className="py-2 px-2 text-sm">{task.assignee.firstName} {task.assignee.lastName}</td>
                    <td className="py-2 px-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        task.status === 'TODO' ? 'bg-gray-200' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-sm">{new Date(task.deadline).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}