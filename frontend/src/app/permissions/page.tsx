'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getAllPermissions, updateUserPermissions, resetPermissions } from '@/lib/api';

const MODULES = ['USERS', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'REPORTS', 'SETTINGS'];
const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'];

interface UserPermission {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: { module: string; action: string; isGranted: boolean }[];
}

export default function PermissionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPermission | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role === 'EMPLOYEE')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
      loadPermissions();
    }
  }, [user]);

  const loadPermissions = async () => {
    try {
      const data = await getAllPermissions();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load permissions');
    }
  };

  const handlePermissionChange = (module: string, action: string, isGranted: boolean) => {
    if (!selectedUser) return;
    const updated = selectedUser.permissions.map((p) =>
      p.module === module && p.action === action ? { ...p, isGranted } : p
    );
    const newUser = { ...selectedUser, permissions: updated };
    setSelectedUser(newUser);
    setUsers(users.map((u) => (u.id === newUser.id ? newUser : u)));
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setLoadingPermissions(true);
    try {
      await updateUserPermissions(selectedUser.id, selectedUser.permissions);
      alert('Permissions saved');
    } catch (err) {
      alert('Failed to save permissions');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleReset = async (userId: string) => {
    if (!confirm('Reset to default permissions?')) return;
    try {
      await resetPermissions(userId);
      loadPermissions();
      alert('Permissions reset');
    } catch (err) {
      alert('Failed to reset permissions');
    }
  };

  if (loading || !user) return <div>Loading...</div>;
  if (user.role === 'EMPLOYEE') return <div>Access Denied</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Permission Management</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{user.name} ({user.role})</span>
          <button onClick={() => { localStorage.removeItem('token'); router.push('/'); }} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>
      <main style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ width: '300px', background: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Users</h2>
            {users.map((u) => (
              <div key={u.id} onClick={() => setSelectedUser(u)} style={{ padding: '0.75rem', cursor: 'pointer', background: selectedUser?.id === u.id ? '#e5e7eb' : 'transparent', borderRadius: '4px', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>{u.email} - {u.role}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, background: 'white', padding: '1rem', borderRadius: '8px' }}>
            {selectedUser ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1rem' }}>Permissions for {selectedUser.name}</h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleReset(selectedUser.id)} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reset</button>
                    <button onClick={handleSave} disabled={loadingPermissions} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: loadingPermissions ? 0.5 : 1 }}>Save</button>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Module</th>
                      {ACTIONS.map((action) => (
                        <th key={action} style={{ textAlign: 'center', padding: '0.5rem' }}>{action}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((module) => (
                      <tr key={module} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.5rem' }}>{module}</td>
                        {ACTIONS.map((action) => {
                          const perm = selectedUser.permissions.find((p) => p.module === module && p.action === action);
                          const isGranted = perm?.isGranted ?? false;
                          return (
                            <td key={action} style={{ textAlign: 'center', padding: '0.5rem' }}>
                              <input type="checkbox" checked={isGranted} onChange={(e) => handlePermissionChange(module, action, e.target.checked)} disabled={user.role === 'ADMIN' && selectedUser.role === 'SUPER_ADMIN'} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Select a user to manage permissions</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}