'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getEmployeeOvertime, approveOvertime, rejectOvertime, getOTSummary } from '@/lib/api';

interface OvertimeEntry {
  id: string;
  employee: { id: string; firstName: string; lastName: string };
  date: string;
  regularHours: number;
  otHours: number;
  status: string;
  reason: string;
  rejectReason: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#dc2626',
};

export default function OvertimePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [overtime, setOvertime] = useState<OvertimeEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'requests' | 'summary'>('requests');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user) loadOvertime();
  }, [user]);

  useEffect(() => {
    if (user && (view === 'summary') && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) loadSummary();
  }, [user, view]);

  const loadOvertime = async () => {
    setLoading(true);
    try {
      let employeeId = undefined;
      if (user?.role === 'EMPLOYEE') {
        employeeId = user.id;
      }
      const data = await getEmployeeOvertime({ employeeId });
      setOvertime(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getOTSummary({});
      setSummary(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveOvertime(id);
      loadOvertime();
      alert('Overtime approved');
    } catch (err) { alert('Failed to approve'); }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectOvertime(id, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      loadOvertime();
      alert('Overtime rejected');
    } catch (err) { alert('Failed to reject'); }
  };

  if (authLoading || !user) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Overtime Management</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('requests')} style={{ padding: '0.5rem 1rem', background: view === 'requests' ? '#2563eb' : '#f3f4f6', color: view === 'requests' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Requests</button>
          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <button onClick={() => setView('summary')} style={{ padding: '0.5rem 1rem', background: view === 'summary' ? '#2563eb' : '#f3f4f6', color: view === 'summary' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Summary</button>
          )}
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'requests' && (
          <>
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Employee</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Date</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Regular Hours</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>OT Hours</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Reason</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    overtime.map((ot) => (
                      <tr key={ot.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{ot.employee?.firstName} {ot.employee?.lastName}</td>
                        <td style={{ padding: '1rem' }}>{new Date(ot.date).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{ot.regularHours}h</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>{ot.otHours}h</td>
                        <td style={{ padding: '1rem' }}>{ot.reason || '-'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: STATUS_COLORS[ot.status] + '20', color: STATUS_COLORS[ot.status], fontSize: '0.875rem' }}>{ot.status}</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {ot.status === 'PENDING' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGER') && (
                            <>
                              <button onClick={() => handleApprove(ot.id)} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                              <button onClick={() => setRejectingId(ot.id)} style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  {overtime.length === 0 && !loading && <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>No overtime requests</td></tr>}
                </tbody>
              </table>
            </div>

            {rejectingId && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '100%' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Reject Overtime</h3>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px', marginBottom: '1rem' }} />
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => handleReject(rejectingId)} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); }} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'summary' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>₹{summary?.totalOTPay?.toFixed(0) || 0}</div>
                <div style={{ color: '#666' }}>Total OT Pay</div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{summary?.settings?.otMultiplier || 1.5}x</div>
                <div style={{ color: '#666' }}>OT Multiplier</div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6b7280' }}>{summary?.settings?.standardHours || 176}h</div>
                <div style={{ color: '#666' }}>Standard Hours/Month</div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Employee</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>OT Hours</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>Basic Salary</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>OT Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    summary?.summary?.map((emp: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{emp.employee?.firstName} {emp.employee?.lastName}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>{emp.otHours?.toFixed(1)}h</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>₹{emp.basicSalary?.toLocaleString()}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>₹{emp.otPay?.toFixed(0)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>OT Calculation</h4>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                Hourly Rate = Basic Salary / {summary?.settings?.standardHours || 176} hours<br />
                OT Rate = Hourly Rate × {summary?.settings?.otMultiplier || 1.5} (Multiplier)<br />
                OT Pay = OT Hours × OT Rate
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}