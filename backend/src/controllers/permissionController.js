const prisma = require('../config/database');

const MODULES = ['USERS', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'REPORTS', 'SETTINGS'];
const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'];

const getDefaultPermissions = (role) => {
  const defaults = {
    SUPER_ADMIN: MODULES.flatMap((m) => MODULES.map((a) => ({ module: m, action: a, isGranted: true }))),
    ADMIN: MODULES.flatMap((m) => [
      { module: m, action: 'VIEW', isGranted: true },
      { module: m, action: 'CREATE', isGranted: true },
      { module: m, action: 'EDIT', isGranted: true },
      { module: m, action: 'DELETE', isGranted: false },
      { module: m, action: 'EXPORT', isGranted: true },
    ]),
    MANAGER: [
      { module: 'EMPLOYEES', action: 'VIEW', isGranted: true },
      { module: 'EMPLOYEES', action: 'CREATE', isGranted: true },
      { module: 'EMPLOYEES', action: 'EDIT', isGranted: true },
      { module: 'ATTENDANCE', action: 'VIEW', isGranted: true },
      { module: 'ATTENDANCE', action: 'EDIT', isGranted: true },
      { module: 'LEAVE', action: 'VIEW', isGranted: true },
      { module: 'LEAVE', action: 'CREATE', isGranted: true },
      { module: 'LEAVE', action: 'EDIT', isGranted: true },
      { module: 'REPORTS', action: 'VIEW', isGranted: true },
      { module: 'REPORTS', action: 'EXPORT', isGranted: true },
    ],
    EMPLOYEE: [
      { module: 'EMPLOYEES', action: 'VIEW', isGranted: false },
      { module: 'ATTENDANCE', action: 'VIEW', isGranted: true },
      { module: 'ATTENDANCE', action: 'CREATE', isGranted: true },
      { module: 'LEAVE', action: 'VIEW', isGranted: true },
      { module: 'LEAVE', action: 'CREATE', isGranted: true },
    ],
  };
  return defaults[role] || [];
};

const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (req.user.role === 'SUPER_ADMIN' || currentUserId === userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ permissions: user.permissions, role: user.role });
    }
    return res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllPermissions = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, permissions: true },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: 'Access denied' });
    if (req.user.role === 'MANAGER' && targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify Super Admin permissions' });
    }
    if (req.user.role === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify Super Admin permissions' });
    }

    await prisma.permission.deleteMany({ where: { userId } });

    const permissionData = permissions.map((p) => ({
      module: p.module,
      action: p.action,
      isGranted: p.isGranted,
      userId,
    }));

    await prisma.permission.createMany({ data: permissionData });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    res.json({ permissions: updatedUser.permissions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const resetToDefault = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (req.user.role === 'SUPER_ADMIN') {
      const defaults = getDefaultPermissions(targetUser.role);
      await prisma.permission.deleteMany({ where: { userId } });
      await prisma.permission.createMany({ data: defaults.map((p) => ({ ...p, userId })) });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true },
      });
      return res.json({ permissions: user.permissions });
    }

    return res.status(403).json({ error: 'Only Super Admin can reset permissions' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getUserPermissions,
  getAllPermissions,
  updateUserPermissions,
  resetToDefault,
  getDefaultPermissions,
  MODULES,
  ACTIONS,
};