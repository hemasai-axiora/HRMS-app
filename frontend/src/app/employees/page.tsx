'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getEmployees, getDepartments, createEmployee, updateEmployee, deleteEmployee, getOrgChart } from '@/lib/api';
import { CanView, CanCreate, CanEdit, CanDelete } from '@/components/PermissionGuard';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: { id: string; name: string };
  departmentId: string;
  salary: number;
  joinDate: string;
  managerId: string;
  manager?: { firstName: string; lastName: string };
}

interface Department {
  id: string;
  name: string;
}

const initialForm = {
  firstName: '', lastName: '', email: '', phone: '', jobTitle: '', departmentId: '', salary: '', joinDate: '', managerId: '', address: '', gender: '', nationality: '',
};

export default function EmployeesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'org'>('list');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [orgChart, setOrgChart] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || !hasPermissionModule('EMPLOYEES'))) router.push('/');
  }, [user, authLoading]);

  const hasPermissionModule = (module: string) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    return true;
  };

  useEffect(() => {
    if (user && hasPermissionModule('EMPLOYEES')) {
      loadData();
    }
  }, [user, search, selectedDepartment]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empData, deptData] = await Promise.all([
        getEmployees({ search, departmentId: selectedDepartment }),
        getDepartments(),
      ]);
      setEmployees(empData.employees);
      setDepartments(deptData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgChart = async () => {
    try {
      const data = await getOrgChart();
      setOrgChart(data);
      setView('org');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, form);
      } else {
        await createEmployee(form);
      }
      setView('list');
      setForm(initialForm);
      setEditingEmployee(null);
      loadData();
    } catch (err) {
      alert('Error saving employee');
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || '',
      jobTitle: emp.jobTitle,
      departmentId: emp.departmentId,
      salary: String(emp.salary),
      joinDate: emp.joinDate?.split('T')[0] || '',
      managerId: emp.managerId || '',
      address: '',
      gender: '',
      nationality: '',
    });
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this employee?')) return;
    try {
      await deleteEmployee(id);
      loadData();
    } catch (err) {
      alert('Error deleting employee');
    }
  };

  if (authLoading || !user) return <div>Loading...</div>;
  if (!hasPermissionModule('EMPLOYEES')) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Employee Management</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => { setView('list'); loadData(); }} style={{ padding: '0.5rem 1rem', background: view === 'list' ? '#2563eb' : '#f3f4f6', color: view === 'list' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>List</button>
          <button onClick={loadOrgChart} style={{ padding: '0.5rem 1rem', background: view === 'org' ? '#2563eb' : '#f3f4f6', color: view === 'org' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Org Chart</button>
          <CanCreate module="EMPLOYEES">
            <button onClick={() => { setEditingEmployee(null); setForm(initialForm); setView('form'); }} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add Employee</button>
          </CanCreate>
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'list' && (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', flex: 1 }} />
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Department</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Job Title</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Salary</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    employees.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{emp.employeeId}</td>
                        <td style={{ padding: '1rem' }}>{emp.firstName} {emp.lastName}</td>
                        <td style={{ padding: '1rem' }}>{emp.email}</td>
                        <td style={{ padding: '1rem' }}>{emp.department?.name}</td>
                        <td style={{ padding: '1rem' }}>{emp.jobTitle}</td>
                        <td style={{ padding: '1rem' }}>${emp.salary?.toLocaleString()}</td>
                        <td style={{ padding: '1rem' }}>
                          <CanEdit module="EMPLOYEES">
                            <button onClick={() => handleEdit(emp)} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                          </CanEdit>
                          <CanDelete module="EMPLOYEES">
                            <button onClick={() => handleDelete(emp.id)} style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                          </CanDelete>
                        </td>
                      </tr>
                    ))}
                  {employees.length === 0 && !loading && <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>No employees found</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'form' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>First Name *</label><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Last Name *</label><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Email *</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Job Title *</label><input required value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Department *</label><select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}><option value="">Select</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Salary *</label><input required type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Join Date</label><input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Manager</label><select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}><option value="">None</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem' }}>Gender</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ padding: '0.75rem 2rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                <button type="button" onClick={() => setView('list')} style={{ padding: '0.75rem 2rem', background: '#f3f4f6', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {view === 'org' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '1rem' }}>Organization Chart</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {orgChart.map((emp) => (
                <div key={emp.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', minWidth: '200px', background: '#f9fafb' }}>
                  <div style={{ fontWeight: 'bold' }}>{emp.name}</div>
                  <div style={{ color: '#666', fontSize: '0.875rem' }}>{emp.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}