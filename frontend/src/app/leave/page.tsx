'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getLeaveRequests, getMyLeaves, getLeaveBalance, createLeaveRequest, approveLeave, rejectLeave, cancelLeaveRequest, getEmployees } from '@/lib/api';
import { CanView, CanCreate, CanEdit } from '@/components/PermissionGuard';

interface LeaveRec {
  id: string;
  employee: { id: string; firstName: string; lastName: string; department: { name: string } };
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approvedAt: string;
  rejectReason: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#dc2626',
  CANCELLED: '#6b7280',
};

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID'];

export default function LeavePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'balance'>('list');
  const [employees, setEmployees] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRec[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({ employeeId: '', leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user && view === 'list') loadLeaves();
    if (user && view === 'balance') loadBalance();
  }, [user, view]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const hasPermissionModule = (module: string) => user?.role === 'SUPER_ADMIN' || true;

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const data = await getLeaveRequests();
      setLeaves(data.leaves);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const loadBalance = async () => {
    if (!user) return;
    try {
      const data = await getLeaveBalance(employees[0]?.id || user.id);
      setBalance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLeaveRequest(form);
      setView('list');
      setForm({ employeeId: '', leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      loadLeaves();
      alert('Leave request submitted');
    } catch (err) {
      alert('Failed to submit leave request');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeave(id);
      loadLeaves();
      alert('Leave approved');
    } catch (err) {
      alert('Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectLeave(id, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
      loadLeaves();
      alert('Leave rejected');
    } catch (err) {
      alert('Failed to reject');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await cancelLeaveRequest(id);
      loadLeaves();
    } catch (err) {
      alert('Failed to cancel');
    }
  };

  const getStatusCount = (status: string) => leaves.filter((l) => l.status === status).length;

  if (authLoading || !user) return <div>Loading...</div>;
  if (!hasPermissionModule('LEAVE')) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Leave Management</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('list')} style={{ padding: '0.5rem 1rem', background: view === 'list' ? '#2563eb' : '#f3f4f6', color: view === 'list' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Requests</button>
          <CanCreate module="LEAVE">
            <button onClick={() => setView('form')} style={{ padding: '0.5rem 1rem', background: view === 'form' ? '#2563eb' : '#f3f4f6', color: view === 'form' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>New Request</button>
          </CanCreate>
          <button onClick={() => setView('balance')} style={{ padding: '0.5rem 1rem', background: view === 'balance' ? '#2563eb' : '#f3f4f6', color: view === 'balance' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Balance</button>
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'list' && (
          <>
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
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>From</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>To</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Days</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    leaves.map((leave) => (
                      <tr key={leave.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{leave.employee?.firstName} {leave.employee?.lastName}</td>
                        <td style={{ padding: '1rem' }}>{leave.leaveType}</td>
                        <td style={{ padding: '1rem' }}>{new Date(leave.startDate).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem' }}>{new Date(leave.endDate).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{leave.days}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: STATUS_COLORS[leave.status] + '20', color: STATUS_COLORS[leave.status], fontSize: '0.875rem' }}>{leave.status}</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {leave.status === 'PENDING' && (
                            <>
                              <CanEdit module="LEAVE">
                                <button onClick={() => handleApprove(leave.id)} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                                <button onClick={() => setShowRejectModal(leave.id)} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                              </CanEdit>
                            </>
                          )}
                          {leave.status === 'PENDING' && (
                            <button onClick={() => handleCancel(leave.id)} style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {showRejectModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '100%' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Reject Leave Request</h3>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px', marginBottom: '1rem' }} />
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => handleReject(showRejectModal)} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                    <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'form' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>New Leave Request</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Employee</label><select required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}><option value="">Select</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Leave Type</label><select required value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>{LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Start Date</label><input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>End Date</label><input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason</label><textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px' }} /></div>
                <button type="submit" style={{ padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit Request</button>
              </div>
            </form>
          </div>
        )}

        {view === 'balance' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Leave Balance</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {balance.map((b: any) => (
                <div key={b.leaveType} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <div><strong>{b.leaveType}</strong></div>
                  <div style={{ textAlign: 'right' }}><div>Quota: {b.quota}</div><div>Used: {b.used}</div><div style={{ color: '#10b981' }}>Remaining: {b.remaining}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}