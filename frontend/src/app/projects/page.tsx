'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getProjects, getProjectById, createProject, updateProject, deleteProject, addProjectExpense, getTasks, createTask, updateTask, getEmployees } from '@/lib/api';
import { CanView, CanCreate, CanEdit } from '@/components/PermissionGuard';

interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  deadline: string;
  budget: number;
  status: string;
  manager: { id: string; firstName: string; lastName: string };
  resources: { employee: { id: string; firstName: string; lastName: string } }[];
  metrics: { totalCost: number; totalExpense: number; completionPercent: number };
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: string;
  estimatedHours: number;
  actualHours: number;
  project: { id: string; name: string };
  assignee: { id: string; firstName: string; lastName: string };
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: '#6b7280',
  ACTIVE: '#10b981',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#2563eb',
  CANCELLED: '#dc2626',
};

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'REWORK', 'COMPLETED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'projects' | 'tasks' | 'detail'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', deadline: '', budget: 0, managerId: '', status: 'PLANNING' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', projectId: '', assigneeId: '', estimatedHours: 0, deadline: '', priority: 'MEDIUM' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0 });

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user && view === 'projects') loadProjects();
    if (user && view === 'tasks') loadTasks();
  }, [user, view]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects({ limit: 50 });
      setProjects(data.projects);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadEmployees = async () => {
    try {
      const data = await getEmployees({ limit: 100 });
      setEmployees(data.employees);
    } catch (err) { console.error(err); }
  };

  const loadProjectDetail = async (id: string) => {
    try {
      const data = await getProjectById(id);
      setSelectedProject(data);
      setView('detail');
    } catch (err) { console.error(err); }
  };

  const handleSaveProject = async () => {
    try {
      await createProject(form);
      setForm({ name: '', description: '', startDate: '', deadline: '', budget: 0, managerId: '', status: 'PLANNING' });
      loadProjects();
      alert('Project created');
    } catch (err) { alert('Failed to create project'); }
  };

  const handleSaveTask = async () => {
    try {
      await createTask(taskForm);
      setTaskForm({ title: '', description: '', projectId: '', assigneeId: '', estimatedHours: 0, deadline: '', priority: 'MEDIUM' });
      loadTasks();
      if (taskForm.projectId) loadProjectDetail(taskForm.projectId);
      alert('Task created');
    } catch (err) { alert('Failed to create task'); }
  };

  const handleAddExpense = async () => {
    if (!selectedProject) return;
    try {
      await addProjectExpense(selectedProject.id, expenseForm);
      setExpenseForm({ description: '', amount: 0 });
      loadProjectDetail(selectedProject.id);
      alert('Expense added');
    } catch (err) { alert('Failed to add expense'); }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus });
      loadTasks();
      if (selectedProject) loadProjectDetail(selectedProject.id);
    } catch (err) { console.error(err); }
  };

  if (authLoading || !user) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dashboard</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Project Management</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('projects')} style={{ padding: '0.5rem 1rem', background: view === 'projects' ? '#2563eb' : '#f3f4f6', color: view === 'projects' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Projects</button>
          <button onClick={() => setView('tasks')} style={{ padding: '0.5rem 1rem', background: view === 'tasks' ? '#2563eb' : '#f3f4f6', color: view === 'tasks' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Tasks</button>
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        {view === 'projects' && (
          <>
            <CanCreate module="PAYROLL">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <input placeholder="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <input type="number" placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Select Manager</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <button onClick={handleSaveProject} style={{ padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Project</button>
              </div>
            </CanCreate>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Project</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Manager</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Deadline</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>Budget</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Progress</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    projects.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}><button onClick={() => loadProjectDetail(p.id)} style={{ fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>{p.name}</button></td>
                        <td style={{ padding: '1rem' }}>{p.manager?.firstName} {p.manager?.lastName}</td>
                        <td style={{ padding: '1rem' }}>{p.deadline ? new Date(p.deadline).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>₹{p.budget?.toLocaleString()}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{p.metrics?.completionPercent || 0}%</td>
                        <td style={{ padding: '1rem' }}><span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: STATUS_COLORS[p.status] + '20', color: STATUS_COLORS[p.status], fontSize: '0.875rem' }}>{p.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'tasks' && (
          <>
            <CanCreate module="PAYROLL">
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <input placeholder="Task Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <select value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Assign To</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
                <input type="number" placeholder="Estimated Hours" value={taskForm.estimatedHours} onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseFloat(e.target.value) })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={handleSaveTask} style={{ padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Task</button>
              </div>
            </CanCreate>

            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Task</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Project</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Assigned To</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Priority</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr> :
                    tasks.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{t.title}</td>
                        <td style={{ padding: '1rem' }}>{t.project?.name || '-'}</td>
                        <td style={{ padding: '1rem' }}>{t.assignee?.firstName} {t.assignee?.lastName}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}><span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: t.priority === 'URGENT' ? '#dc2626' : t.priority === 'HIGH' ? '#f59e0b' : '#6b7280', color: 'white', fontSize: '0.75rem' }}>{t.priority}</span></td>
                        <td style={{ padding: '1rem' }}>
                          <select value={t.status} onChange={(e) => handleTaskStatusChange(t.id, e.target.value)} style={{ padding: '0.25rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem' }}>
                            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{t.actualHours || 0}/{t.estimatedHours || 0}h</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'detail' && selectedProject && (
          <div>
            <button onClick={() => setView('projects')} style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back to Projects</button>
            
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}>{selectedProject.name}</h2>
                  <p style={{ color: '#666' }}>{selectedProject.description}</p>
                </div>
                <span style={{ padding: '0.5rem 1rem', borderRadius: '999px', background: STATUS_COLORS[selectedProject.status] + '20', color: STATUS_COLORS[selectedProject.status] }}>{selectedProject.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}><div style={{ color: '#666', fontSize: '0.875rem' }}>Budget</div><div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{selectedProject.budget?.toLocaleString()}</div></div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}><div style={{ color: '#666', fontSize: '0.875rem' }}>Total Cost</div><div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{selectedProject.metrics?.totalCost?.toFixed(0) || 0}</div></div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}><div style={{ color: '#666', fontSize: '0.875rem' }}>Expenses</div><div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{selectedProject.metrics?.totalExpense?.toFixed(0) || 0}</div></div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}><div style={{ color: '#666', fontSize: '0.875rem' }}>Progress</div><div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{selectedProject.metrics?.completionPercent || 0}%</div></div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div><strong>Manager:</strong> {selectedProject.manager?.firstName} {selectedProject.manager?.lastName}</div>
                <div><strong>Deadline:</strong> {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : '-'}</div>
                <div><strong>Resources:</strong> {selectedProject.resources?.length || 0}</div>
              </div>
            </div>

            <CanCreate module="PAYROLL">
              <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <input placeholder="Expense Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <input type="number" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) })} style={{ width: '150px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                <button onClick={handleAddExpense} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Expense</button>
              </div>
            </CanCreate>
          </div>
        )}
      </main>
    </div>
  );
}