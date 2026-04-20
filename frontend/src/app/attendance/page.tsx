'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getTodayAttendance, checkIn, checkOut, getMonthlyReport, markAttendance, getEmployees, getAttendanceSettings, updateAttendanceSettings } from '@/lib/api';
import { CanView, CanCreate, CanEdit } from '@/components/PermissionGuard';

interface AttendanceRec {
  id?: string;
  employee?: { id: string; firstName: string; lastName: string; jobTitle: string; department: { name: string } };
  employeeId?: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  lateMinutes?: number;
  workHours?: number;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#10b981',
  LATE: '#f59e0b',
  ABSENT: '#dc2626',
  HALF_DAY: '#8b5cf6',
  ON_LEAVE: '#6b7280',
};

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'today' | 'report' | 'settings'>('today');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user && view === 'today') loadTodayAttendance();
    if (user && view === 'report') loadMonthlyReport();
    if (user && view === 'settings' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) loadSettings();
  }, [user, view]);

  const hasPermissionModule = (module: string) => user?.role === 'SUPER_ADMIN' || true;

  const loadTodayAttendance = async () => {
    setLoading(true);
    try {
      const data = await getTodayAttendance();
      setAttendance(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const data = await getMonthlyReport(dateFilter);
      setMonthlyData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await getAttendanceSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await getEmployees({ limit: 100 });
      setEmployees(data.employees);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleCheckIn = async () => {
    if (!selectedEmployee) return alert('Select an employee');
    try {
      await checkIn(selectedEmployee);
      loadTodayAttendance();
      alert('Checked in successfully');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployee) return alert('Select an employee');
    try {
      await checkOut(selectedEmployee);
      loadTodayAttendance();
      alert('Checked out successfully');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Check-out failed');
    }
  };

  const handleMarkAttendance = async (employeeId: string, status: string) => {
    try {
      await markAttendance({ employeeId, status });
      loadTodayAttendance();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateAttendanceSettings(settings);
      alert('Settings updated');
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  const getStatusCount = (status: string) => attendance.filter((a) => a.status === status).length;

  if (authLoading || !user) return <div>Loading...</div>;
  if (!hasPermissionModule('ATTENDANCE')) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Attendance</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('today')} style={{ padding: '0.5rem 1rem', background: view === 'today' ? '#2563eb' : '#f3f4f6', color: view === 'today' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Today</button>
          <button onClick={() => setView('report')} style={{ padding: '0.5rem 1rem', background: view === 'report' ? '#2563eb' : '#f3f4f6', color: view === 'report' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Report</button>
          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <button onClick={() => setView('settings')} style={{ padding: '0.5rem 1rem', background: view === 'settings' ? '#2563eb' : '#f3f4f6', color: view === 'settings' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Settings</button>
          )}
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'today' && (
          <>
            <CanEdit module="ATTENDANCE">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', flex: 1 }}>
                  <option value="">Select Employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
                <button onClick={handleCheckIn} style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check In</button>
                <button onClick={handleCheckOut} style={{ padding: '0.75rem 1.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Out</button>
              </div>
            </CanEdit>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} style={{ background: 'white', padding: '1rem', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{getStatusCount(status)}</div>
                  <div style={{ color: '#666', fontSize: '0.875rem' }}>{status}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Employee</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Department</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Check In</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Check Out</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Hours</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    attendance.map((att, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{att.employee?.firstName} {att.employee?.lastName}</td>
                        <td style={{ padding: '1rem' }}>{att.employee?.department?.name}</td>
                        <td style={{ padding: '1rem' }}>{att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : '-'}</td>
                        <td style={{ padding: '1rem' }}>{att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : '-'}</td>
                        <td style={{ padding: '1rem' }}>{att.workHours || '-'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: STATUS_COLORS[att.status] + '20', color: STATUS_COLORS[att.status], fontSize: '0.875rem' }}>{att.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'report' && (
          <>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
              <select value={dateFilter.month} onChange={(e) => setDateFilter({ ...dateFilter, month: parseInt(e.target.value) })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
              </select>
              <select value={dateFilter.year} onChange={(e) => setDateFilter({ ...dateFilter, year: parseInt(e.target.value) })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                {[dateFilter.year - 1, dateFilter.year, dateFilter.year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={loadMonthlyReport} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Generate</button>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Employee</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Present</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Late</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Half Day</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Absent</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Work Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    monthlyData?.summary?.map((rec: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{rec.employee?.firstName} {rec.employee?.lastName}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#10b981' }}>{rec.present}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#f59e0b' }}>{rec.late}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#8b5cf6' }}>{rec.halfDay}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#dc2626' }}>{rec.absent}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{rec.workHours.toFixed(1)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'settings' && settings && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Attendance Settings</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Check-in Start Time</label><input type="time" value={settings.checkInStartTime} onChange={(e) => setSettings({ ...settings, checkInStartTime: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Check-in End Time</label><input type="time" value={settings.checkInEndTime} onChange={(e) => setSettings({ ...settings, checkInEndTime: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Check-out Time</label><input type="time" value={settings.checkOutTime} onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Late Threshold (minutes)</label><input type="number" value={settings.lateThreshold} onChange={(e) => setSettings({ ...settings, lateThreshold: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Half Day Threshold (hours)</label><input type="number" value={settings.halfDayThreshold} onChange={(e) => setSettings({ ...settings, halfDayThreshold: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
              <button onClick={handleSaveSettings} style={{ padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}>Save Settings</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}