'use client';
import { useEffect, useState } from 'react';
import { getEmployeeDashboard, getProfile } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string;
  project: { name: string };
}

interface Timesheet {
  id: string;
  date: string;
  hoursWorked: number;
}

interface Dashboard {
  assignedTasks: Task[];
  recentTimesheets: Timesheet[];
  thisWeekHours: number;
  todayStatus: string;
  pendingOvertime: number;
}

export default function EmployeeDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await getProfile();
      const data = await getEmployeeDashboard(profile.id);
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const timesheetData = dashboard?.recentTimesheets.map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' }),
    hours: t.hoursWorked,
  })) || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Employee Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Today Status</div>
          <div className="text-2xl font-bold">{dashboard?.todayStatus}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">This Week Hours</div>
          <div className="text-2xl font-bold">{dashboard?.thisWeekHours}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Assigned Tasks</div>
          <div className="text-2xl font-bold">{dashboard?.assignedTasks.length}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pending Overtime</div>
          <div className="text-2xl font-bold">{dashboard?.pendingOvertime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Weekly Hours</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timesheetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Assigned Tasks</h2>
          <div className="space-y-3">
            {dashboard?.assignedTasks.map((task) => (
              <div key={task.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-gray-500">{task.project.name}</div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-xs ${
                    task.status === 'TODO' ? 'bg-gray-200' : 'bg-blue-100'
                  }`}>
                    {task.status}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Due: {new Date(task.deadline).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {(!dashboard?.assignedTasks.length) && (
              <div className="text-gray-500 text-center py-4">No tasks assigned</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}