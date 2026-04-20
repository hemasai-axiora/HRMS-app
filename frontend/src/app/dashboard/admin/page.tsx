'use client';
import { useEffect, useState } from 'react';
import { getDashboardStats, getAllUtilization } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  employees: number;
  projects: number;
  tasks: number;
  overtime: number;
  attendance: { today: number; monthly: { present: number; absent: number; late: number; total: number } };
}

interface Utilization {
  utilization: Array<{ employee: { name: string; department: string }; utilization: number }>;
  avgUtilization: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [utilization, setUtilization] = useState<Utilization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, utilData] = await Promise.all([getDashboardStats(), getAllUtilization()]);
      setStats(statsData);
      setUtilization(utilData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const attendanceData = stats
    ? [
        { name: 'Present', value: stats.attendance.monthly.present },
        { name: 'Late', value: stats.attendance.monthly.late },
        { name: 'Absent', value: stats.attendance.monthly.absent },
      ]
    : [];

  const topUtilized = utilization?.utilization.slice(0, 5) || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Employees</div>
          <div className="text-2xl font-bold">{stats?.employees}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Active Projects</div>
          <div className="text-2xl font-bold">{stats?.projects}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pending Tasks</div>
          <div className="text-2xl font-bold">{stats?.tasks}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pending Overtime</div>
          <div className="text-2xl font-bold">{stats?.overtime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Attendance Overview</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={attendanceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {attendanceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Top Utilized Employees</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topUtilized}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="employee.name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="utilization" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Average Utilization</h2>
          <span className="text-3xl font-bold text-blue-600">{utilization?.avgUtilization || 0}%</span>
        </div>
      </div>
    </div>
  );
}