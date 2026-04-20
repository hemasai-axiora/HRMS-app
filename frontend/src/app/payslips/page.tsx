'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getPayslipHistory, downloadPayslipPDF, emailPayslip, getPayslip, downloadBulkPayslips, emailBulkPayslips, getEmployees } from '@/lib/api';

interface PayslipRecord {
  id: string;
  employee: { id: string; firstName: string; lastName: string; employeeId: string; department: { name: string } };
  payrollRun: { month: number; year: number };
  basicSalary: number;
  hra: number;
  grossEarnings: number;
  pf: number;
  tax: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  daysWorked: number;
}

export default function PayslipsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user) loadPayslips();
  }, [user, selectedYear]);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      let employeeId = undefined;
      if (user?.role === 'EMPLOYEE') {
        employeeId = user.employeeId;
      }
      const data = await getPayslipHistory({ employeeId, year: selectedYear });
      setPayslips(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleView = async (id: string) => {
    try {
      const data = await getPayslip(id);
      setSelectedPayslip(data);
      setView('detail');
    } catch (err) { console.error(err); }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payslip/pdf/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { console.error(err); }
  };

  const handleEmail = async (id: string) => {
    setSendingEmail(true);
    try {
      await emailPayslip(id);
      alert('Payslip sent to email');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payslip/pdf-bulk?month=${new Date().getMonth() + 1}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslips-${selectedYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { console.error(err); }
  };

  const handleEmailAll = async () => {
    if (!confirm('Send payslips to all employees via email?')) return;
    setSendingEmail(true);
    try {
      await emailBulkPayslips(new Date().getMonth() + 1, selectedYear);
      alert('Bulk emails sent');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to send');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatMonth = (month: number) => new Date(0, month - 1).toLocaleString('en', { month: 'long' });

  const formatCurrency = (amount: number) => amount ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0';

  if (authLoading || !user) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Payslips</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <>
              <button onClick={handleDownloadAll} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Download All</button>
              <button onClick={handleEmailAll} disabled={sendingEmail} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{sendingEmail ? 'Sending...' : 'Email All'}</button>
            </>
          )}
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'list' && (
          <>
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Month</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Employee</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>Gross</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>Deductions</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>Net</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    payslips.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{formatMonth(p.payrollRun.month)} {p.payrollRun.year}</td>
                        <td style={{ padding: '1rem' }}>{p.employee?.firstName} {p.employee?.lastName}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>{formatCurrency(p.grossEarnings)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: '#dc2626' }}>{formatCurrency(p.totalDeductions)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(p.netSalary)}</td>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => handleView(p.id)} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                          <button onClick={() => handleDownload(p.id)} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>PDF</button>
                          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                            <button onClick={() => handleEmail(p.id)} disabled={sendingEmail} style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Email</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {payslips.length === 0 && !loading && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>No payslips found</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'detail' && selectedPayslip && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button onClick={() => setView('list')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back</button>
              <h2>{formatMonth(selectedPayslip.payrollRun.month)} {selectedPayslip.payrollRun.year}</h2>
            </div>

            <div style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>{selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}</h3>
              <p style={{ color: '#666' }}>{selectedPayslip.employee?.employeeId}</p>
              <p style={{ color: '#666' }}>{selectedPayslip.employee?.department?.name}</p>
            </div>

            <h4 style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>Earnings</h4>
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Basic Salary</span><span>{formatCurrency(selectedPayslip.basicSalary)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>HRA</span><span>{formatCurrency(selectedPayslip.hra)}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <span>Gross Earnings</span><span>{formatCurrency(selectedPayslip.grossEarnings)}</span>
            </div>

            <h4 style={{ marginBottom: '0.5rem' }}>Deductions</h4>
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PF</span><span style={{ color: '#dc2626' }}>{formatCurrency(selectedPayslip.pf)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>TDS</span><span style={{ color: '#dc2626' }}>{formatCurrency(selectedPayslip.tax)}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <span>Total Deductions</span><span style={{ color: '#dc2626' }}>{formatCurrency(selectedPayslip.totalDeductions)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#10b981', color: 'white', borderRadius: '8px', marginTop: '1rem' }}>
              <span style={{ fontSize: '1.25rem' }}>NET SALARY</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(selectedPayslip.netSalary)}</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => handleDownload(selectedPayslip.id)} style={{ flex: 1, padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Download PDF</button>
              {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                <button onClick={() => handleEmail(selectedPayslip.id)} disabled={sendingEmail} style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{sendingEmail ? 'Sending...' : 'Email Payslip'}</button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}