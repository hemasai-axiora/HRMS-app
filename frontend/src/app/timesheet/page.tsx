'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { logTimesheet, getEmployeeTimesheets, getAllTimesheets, getDailySummary, generateAttendanceFromTimesheet, getTasks, getEmployees } from '@/lib/api';

interface TimesheetEntry {
  id: string;
  task: { id: string; title: string; project: { name: string } };
  date: string;
  hoursWorked: number;
  description: string;
}

export default function TimesheetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [myTimesheets, setMyTimesheets] = useState<TimesheetEntry[]>([]);
  const [allTimesheets, setAllTimesheets] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'my' | 'all' | 'summary'>('my');
  const [form, setForm] = useState({ taskId: '', date: new Date().toISOString().split('T')[0], hoursWorked: 8, description: '' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user && view === 'my') loadMyTimesheets();
    if (user && view === 'all' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) loadAllTimesheets();
    if (user && view === 'summary') loadSummary();
  }, [user, view]);

  useEffect(() => {
    loadTasks();
    loadEmployees();
  }, []);

  const loadMyTimesheets = async () => {
    setLoading(true);
    try {
      const data = await getEmployeeTimesheets(user?.id || '', {});
      setMyTimesheets(data.timesheets);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAllTimesheets = async () => {
    setLoading(true);
    try {
      const data = await getAllTimesheets({});
      setAllTimesheets(Object.values(data.aggregated));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getDailySummary();
      setDailySummary(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadTasks = async () => {
    try {
      const data = await getTasks({});
      setTasks(data);
    } catch (err) { console.error(err); }
  };

  const loadEmployees = async () => {
    try {
      const data = await getEmployees({ limit: 100 });
      setEmployees(data.employees);
    } catch (err) { console.error(err); }
  };

  const handleLogHours = async () => {
    try {
      const payload = {
        employeeId: user?.id || '',
        taskId: form.taskId || undefined,
        date: form.date,
        hoursWorked: form.hoursWorked,
        description: form.description,
      };
      await logTimesheet(payload);
      setForm({ taskId: '', date: new Date().toISOString().split('T')[0], hoursWorked: 8, description: '' });
      loadMyTimesheets();
      alert('Hours logged successfully');
    } catch (err) { alert('Failed to log hours'); }
  };

  const handleGenerateAttendance = async () => {
    if (!confirm('Generate attendance records from timesheet data?')) return;
    setGenerating(true);
    try {
      await generateAttendanceFromTimesheet();
      alert('Attendance generated successfully');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || !user) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Timesheet</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('my')} style={{ padding: '0.5rem 1rem', background: view === 'my' ? '#2563eb' : '#f3f4f6', color: view === 'my' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>My Timesheet</button>
          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <>
              <button onClick={() => setView('all')} style={{ padding: '0.5rem 1rem', background: view === 'all' ? '#2563eb' : '#f3f4f6', color: view === 'all' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>All Entries</button>
              <button onClick={() => setView('summary')} style={{ padding: '0.5rem 1rem', background: view === 'summary' ? '#2563eb' : '#f3f4f6', color: view === 'summary' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Summary</button>
            </>
          )}
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'my' && (
          <>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
              <select value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <option value="">Select Task (optional)</option>
                {tasks.filter((t) => t.assignee?.id === user?.id).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
              <input type="number" placeholder="Hours" value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: parseFloat(e.target.value) })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
              <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <button onClick={handleLogHours} style={{ padding: '0.75rem 2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '1rem' }}>Log Hours</button>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Task</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Hours</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    myTimesheets.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{new Date(t.date).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem' }}>{t.task?.title || '-'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{t.hoursWorked}h</td>
                        <td style={{ padding: '1rem' }}>{t.description || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'all' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Employee</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Total Hours</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                  allTimesheets.map((emp, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem' }}>{emp.employee?.firstName} {emp.employee?.lastName}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{emp.totalHours.toFixed(1)}h</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: emp.totalHours >= 8 ? '#10b98120' : emp.totalHours > 0 ? '#f59e0b20' : '#dc262620', color: emp.totalHours >= 8 ? '#10b981' : emp.totalHours > 0 ? '#f59e0b' : '#dc2626' }}>
                          {emp.totalHours >= 8 ? 'Full Day' : emp.totalHours > 0 ? 'Partial' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'summary' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
          <>
            <button onClick={handleGenerateAttendance} disabled={generating} style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '1rem' }}>
              {generating ? 'Generating...' : 'Generate Attendance'}
            </button>

            {dailySummary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{dailySummary.totalHours?.toFixed(1)}h</div>
                  <div style={{ color: '#666' }}>Total Hours</div>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{dailySummary.present}</div>
                  <div style={{ color: '#666' }}>Full Day</div>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{dailySummary.partial}</div>
                  <div style={{ color: '#666' }}>Partial Day</div>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{dailySummary.absent}</div>
                  <div style={{ color: '#666' }}>Absent</div>
                </div>
              </div>
            )}

            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem' }}>Employee Hours Breakdown</h4>
              {dailySummary?.breakdown && Object.entries(dailySummary.breakdown).map(([name, hours]: any) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                  <span>{name}</span>
                  <span style={{ fontWeight: 'bold', color: hours >= 8 ? '#10b981' : hours > 0 ? '#f59e0b' : '#dc2626' }}>{hours.toFixed(1)}h</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}