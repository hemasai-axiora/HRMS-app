'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { CanView, CanCreate, CanEdit, CanDelete } from '@/components/PermissionGuard';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout, hasPermission } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>HRMS Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <button onClick={() => router.push('/permissions')} style={{ padding: '0.5rem 1rem', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Manage Permissions</button>
          )}
          <span>{user.name} ({user.role})</span>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>
      <main style={{ padding: '2rem' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Welcome, {user.name}!</h2>
          <p style={{ color: '#666' }}>Role: {user.role}</p>
          <p style={{ color: '#666' }}>Email: {user.email}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <CanView module="USERS">
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Users</h3>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>Manage user accounts</p>
            </div>
          </CanView>

          <CanView module="EMPLOYEES">
            <Link href="/employees">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Employees</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Manage employee records</p>
              </div>
            </Link>
          </CanView>

          <CanView module="ATTENDANCE">
            <Link href="/attendance">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Attendance</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Track attendance</p>
              </div>
            </Link>
          </CanView>

          <CanView module="LEAVE">
            <Link href="/leave">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Leave Management</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Manage leave requests</p>
              </div>
            </Link>
          </CanView>

          <CanView module="PAYROLL">
            <Link href="/payroll">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Payroll</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Manage payroll</p>
              </div>
            </Link>
          </CanView>

          <CanView module="REPORTS">
            <Link href="/payslips">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Payslips</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>View & download payslips</p>
              </div>
            </Link>
          </CanView>

          <CanView module="REPORTS">
            <Link href="/projects">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Projects</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Manage projects & tasks</p>
              </div>
            </Link>
          </CanView>

          <CanView module="ATTENDANCE">
            <Link href="/timesheet">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Timesheet</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Log daily work hours</p>
              </div>
            </Link>
          </CanView>

          <CanView module="REPORTS">
            <Link href="/overtime">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Overtime</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Manage OT requests</p>
              </div>
            </Link>
          </CanView>

          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <Link href="/dashboard/admin">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2563eb' }}>Admin Dashboard</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Overview & analytics</p>
              </div>
            </Link>
          )}

          {user.role === 'MANAGER' && (
            <Link href="/dashboard/manager">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#059669' }}>Manager Dashboard</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>Team workload & tasks</p>
              </div>
            </Link>
          )}

          {user.role === 'EMPLOYEE' && (
            <Link href="/dashboard/employee">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7c3aed' }}>My Dashboard</h3>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>My tasks & hours</p>
              </div>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}