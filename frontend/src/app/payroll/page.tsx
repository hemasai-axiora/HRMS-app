'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getAllPayrollRuns, getPayrollReport, runPayroll, getEmployees, getSalaryStructure, setSalaryStructure, calculateEmployeeSalary, getPayrollSettings, updatePayrollSettings } from '@/lib/api';
import { CanView, CanCreate, CanEdit } from '@/components/PermissionGuard';

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: string;
  totalAmount: number;
  employeeCount: number;
  createdAt: string;
}

interface PayrollRecord {
  id: string;
  employee: { id: string; firstName: string; lastName: string; employeeId: string; department: { name: string } };
  basicSalary: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowance: number;
  grossEarnings: number;
  pf: number;
  tax: number;
  insurance: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  workDays: number;
  daysWorked: number;
  leaves: number;
}

export default function PayrollPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'runs' | 'report' | 'structure' | 'settings'>('runs');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [structure, setStructure] = useState<any>(null);
  const [form, setForm] = useState({ basicSalary: 0, hra: 0, da: 0, conveyance: 0, medical: 0, specialAllowance: 0, otherAllowance: 0, pfEnabled: true, tdsEnabled: true, insurance: 0, otherDeduction: 0 });
  const [processing, setProcessing] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role === 'EMPLOYEE')) router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user && view === 'runs') loadRuns();
    if (user && view === 'structure') loadEmployees();
  }, [user, view]);

  useEffect(() => {
    if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) loadGlobalSettings();
  }, [user]);

  const loadGlobalSettings = async () => {
    try {
      const data = await getPayrollSettings();
      setGlobalSettings(data);
    } catch (err) { console.error(err); }
  };

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await getAllPayrollRuns();
      setRuns(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadEmployees = async () => {
    try {
      const data = await getEmployees({ limit: 100 });
      setEmployees(data.employees);
    } catch (err) { console.error(err); }
  };

  const loadReport = async (run: PayrollRun) => {
    setLoading(true);
    try {
      const data = await getPayrollReport({ month: run.month, year: run.year });
      setSelectedRun(run);
      setRecords(data.records);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRunPayroll = async () => {
    if (!confirm('Run payroll for current month?')) return;
    setProcessing(true);
    try {
      await runPayroll(new Date().getMonth() + 1, new Date().getFullYear());
      loadRuns();
      alert('Payroll processed successfully');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const loadStructure = async (empId: string) => {
    try {
      const data = await getSalaryStructure(empId);
      setSelectedEmployee(employees.find(e => e.id === empId));
      if (data) {
        setStructure(data);
        const calc = data.calculations || {};
        setForm({
          basicSalary: data.basicSalary,
          hra: data.hra,
          da: data.da,
          conveyance: data.conveyence,
          medical: data.medical,
          specialAllowance: data.specialAllowance,
          otherAllowance: data.otherAllowance,
          pfEnabled: data.pfEnabled !== false,
          tdsEnabled: data.tdsEnabled !== false,
          insurance: data.insurance,
          otherDeduction: data.otherDeduction,
        });
      } else {
        setStructure(null);
        setForm({ basicSalary: 0, hra: 0, da: 0, conveyance: 0, medical: 0, specialAllowance: 0, otherAllowance: 0, pfEnabled: true, tdsEnabled: true, insurance: 0, otherDeduction: 0 });
      }
    } catch (err) { console.error(err); }
  };

  const handleSaveStructure = async () => {
    if (!selectedEmployee) return;
    try {
      await setSalaryStructure(selectedEmployee.id, form);
      alert('Salary structure saved');
    } catch (err) { alert('Failed to save'); }
  };

  const calculatePreview = () => {
    const basicSalary = form.basicSalary || 0;
    const grossEarnings = basicSalary + (form.hra || 0) + (form.da || 0) + (form.conveyance || 0) + (form.medical || 0) + (form.specialAllowance || 0) + (form.otherAllowance || 0);
    const pf = form.pfEnabled ? Math.min(basicSalary * 0.12, 2160) : 0;
    const tds = form.tdsEnabled ? calculateTDS(grossEarnings) : 0;
    const totalDeductions = pf + tds + (form.insurance || 0) + (form.otherDeduction || 0);
    const netSalary = grossEarnings - totalDeductions;
    return {
      grossEarnings,
      employeePf: pf,
      employerPf: pf,
      tds,
      totalDeductions,
      netSalary,
      taxSlab: getTaxSlab(grossEarnings * 12),
    };
  };

  const calculateTDS = (monthlyGross: number) => {
    const annual = monthlyGross * 12;
    if (annual <= 250000) return 0;
    if (annual <= 500000) return ((annual - 250000) * 0.05) / 12;
    if (annual <= 750000) return (12500 + (annual - 500000) * 0.10) / 12;
    if (annual <= 1000000) return (37500 + (annual - 750000) * 0.15) / 12;
    if (annual <= 1250000) return (75000 + (annual - 1000000) * 0.20) / 12;
    if (annual <= 1500000) return (125000 + (annual - 1250000) * 0.25) / 12;
    return (187500 + (annual - 1500000) * 0.30) / 12;
  };

  const getTaxSlab = (annualGross: number) => {
    if (annualGross <= 250000) return 'Nil';
    if (annualGross <= 500000) return '5%';
    if (annualGross <= 750000) return '10%';
    if (annualGross <= 1000000) return '15%';
    if (annualGross <= 1250000) return '20%';
    if (annualGross <= 1500000) return '25%';
    return '30%';
  };

  const preview = structure ? calculatePreview() : null;

  if (authLoading || !user) return <div>Loading...</div>;
  if (user.role === 'EMPLOYEE') return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Payroll</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('runs')} style={{ padding: '0.5rem 1rem', background: view === 'runs' ? '#2563eb' : '#f3f4f6', color: view === 'runs' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Runs</button>
          <button onClick={() => setView('structure')} style={{ padding: '0.5rem 1rem', background: view === 'structure' ? '#2563eb' : '#f3f4f6', color: view === 'structure' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salary Structure</button>
          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <button onClick={() => setView('settings')} style={{ padding: '0.5rem 1rem', background: view === 'settings' ? '#2563eb' : '#f3f4f6', color: view === 'settings' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Settings</button>
          )}
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'runs' && (
          <>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Payroll Runs</h2>
              {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                <button onClick={handleRunPayroll} disabled={processing} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {processing ? 'Processing...' : 'Run Payroll'}
                </button>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Period</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Employees</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>Total Amount</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    runs.map((run) => (
                      <tr key={run.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{new Date(0, run.month - 1).toLocaleString('en', { month: 'long' })} {run.year}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{run.employeeCount}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>${run.totalAmount?.toLocaleString()}</td>
                        <td style={{ padding: '1rem' }}><span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: run.status === 'PAID' ? '#10b981' : '#f59e0b', color: 'white', fontSize: '0.875rem' }}>{run.status}</span></td>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => loadReport(run)} style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                        </td>
                      </tr>
                    ))}
                  {runs.length === 0 && !loading && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No payroll runs found</td></tr>}
                </tbody>
              </table>
            </div>

            {selectedRun && records.length > 0 && (
              <div style={{ marginTop: '2rem', background: 'white', borderRadius: '8px', padding: '1rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>{new Date(0, selectedRun.month - 1).toLocaleString('en', { month: 'long' })} {selectedRun.year} - {records.length} Employees</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '0.5rem' }}>Employee</th>
                        <th style={{ padding: '0.5rem' }}>Basic</th>
                        <th style={{ padding: '0.5rem' }}>HRA</th>
                        <th style={{ padding: '0.5rem' }}> Gross</th>
                        <th style={{ padding: '0.5rem' }}>PF</th>
                        <th style={{ padding: '0.5rem' }}>Tax</th>
                        <th style={{ padding: '0.5rem' }}>Total Ded</th>
                        <th style={{ padding: '0.5rem' }}>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.5rem' }}>{rec.employee?.firstName} {rec.employee?.lastName}</td>
                          <td style={{ padding: '0.5rem' }}>${rec.basicSalary?.toFixed(0)}</td>
                          <td style={{ padding: '0.5rem' }}>${rec.hra?.toFixed(0)}</td>
                          <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>${rec.grossEarnings?.toFixed(0)}</td>
                          <td style={{ padding: '0.5rem', color: '#dc2626' }}>${rec.pf?.toFixed(0)}</td>
                          <td style={{ padding: '0.5rem', color: '#dc2626' }}>${rec.tax?.toFixed(0)}</td>
                          <td style={{ padding: '0.5rem', color: '#dc2626' }}>${rec.totalDeductions?.toFixed(0)}</td>
                          <td style={{ padding: '0.5rem', fontWeight: 'bold', color: '#10b981' }}>${rec.netSalary?.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'structure' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Employees</h3>
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {employees.map((emp) => (
                  <div key={emp.id} onClick={() => loadStructure(emp.id)} style={{ padding: '0.75rem', cursor: 'pointer', background: selectedEmployee?.id === emp.id ? '#e5e7eb' : 'transparent', borderRadius: '4px', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{emp.firstName} {emp.lastName}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>{emp.employeeId}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
              {selectedEmployee ? (
                <>
                  <h3 style={{ marginBottom: '1rem' }}>Salary Structure - {selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Basic Salary *</label><input type="number" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>HRA</label><input type="number" value={form.hra} onChange={(e) => setForm({ ...form, hra: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>DA</label><input type="number" value={form.da} onChange={(e) => setForm({ ...form, da: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Conveyance</label><input type="number" value={form.conveyance} onChange={(e) => setForm({ ...form, conveyance: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Medical</label><input type="number" value={form.medical} onChange={(e) => setForm({ ...form, medical: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Special Allowance</label><input type="number" value={form.specialAllowance} onChange={(e) => setForm({ ...form, specialAllowance: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    <div><label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}><input type="checkbox" checked={form.pfEnabled} onChange={(e) => setForm({ ...form, pfEnabled: e.target.checked })} /> Enable PF (12%)</label></div>
                    <div><label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}><input type="checkbox" checked={form.tdsEnabled} onChange={(e) => setForm({ ...form, tdsEnabled: e.target.checked })} /> Enable TDS</label></div>
                    <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Insurance</label><input type="number" value={form.insurance} onChange={(e) => setForm({ ...form, insurance: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                  </div>

                  {preview && (
                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                      <h4 style={{ marginBottom: '1rem' }}>Monthly Calculation Preview</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div><span style={{ color: '#666' }}>Gross Earnings</span><div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${preview.grossEarnings.toFixed(2)}</div></div>
                        <div><span style={{ color: '#666' }}>Employee PF (12%)</span><div style={{ fontSize: '1rem', color: '#dc2626' }}>${preview.employeePf.toFixed(2)}</div></div>
                        <div><span style={{ color: '#666' }}>TDS ({preview.taxSlab})</span><div style={{ fontSize: '1rem', color: '#dc2626' }}>${preview.tds.toFixed(2)}</div></div>
                        <div><span style={{ color: '#666' }}>Total Deductions</span><div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#dc2626' }}>${preview.totalDeductions.toFixed(2)}</div></div>
                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid #ddd', paddingTop: '1rem' }}><span style={{ color: '#666' }}>Net Salary (Take Home)</span><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>${preview.netSalary.toFixed(2)}</div></div>
                        <div><span style={{ color: '#666' }}>Employer PF Contribution</span><div style={{ fontSize: '1rem', color: '#f59e0b' }}>${preview.employerPf.toFixed(2)}</div></div>
                      </div>
                    </div>
                  )}

                  <button onClick={handleSaveStructure} style={{ marginTop: '1rem', padding: '0.75rem 2rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Structure</button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Select an employee to configure salary structure</div>
              )}
            </div>
          </div>
        )}

        {view === 'settings' && globalSettings && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Payroll Settings (PF, TDS, Gratuity)</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div><strong>PF Rate</strong><div style={{ color: '#666', fontSize: '0.875rem' }}>Employee provident fund percentage</div></div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{(globalSettings.pfRate * 100).toFixed(0)}%</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div><strong>Max PF</strong><div style={{ color: '#666', fontSize: '0.875rem' }}>Maximum PF deduction per month</div></div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${globalSettings.maxPf}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div><strong>Gratuity Rate</strong><div style={{ color: '#666', fontSize: '0.875rem' }}>Gratuity calculation rate</div></div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{(globalSettings.gratuityRate * 100).toFixed(2)}%</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div><strong>TDS Enabled</strong><div style={{ color: '#666', fontSize: '0.875rem' }}>Tax deducted at source</div></div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{globalSettings.tdsEnabled ? 'Yes' : 'No'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div><strong>EPF Enabled</strong><div style={{ color: '#666', fontSize: '0.875rem' }}>Employee provident fund</div></div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{globalSettings.epfEnabled ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Indian Tax Slabs (FY 2024-25)</h4>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                <div>₹0 - ₹2.5L: Nil</div>
                <div>₹2.5L - ₹5L: 5%</div>
                <div>₹5L - ₹7.5L: 10%</div>
                <div>₹7.5L - ₹10L: 15%</div>
                <div>₹10L - ₹12.5L: 20%</div>
                <div>₹12.5L - ₹15L: 25%</div>
                <div>₹15L+: 30%</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}