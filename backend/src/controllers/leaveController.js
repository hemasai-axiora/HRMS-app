const prisma = require('../config/database');

const createLeaveRequest = async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.leave.create({
      data: { employeeId, leaveType, startDate: start, endDate: end, days, reason },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getLeaveRequests = async (req, res) => {
  try {
    const { employeeId, status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const leaves = await prisma.leave.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true, department: true } } },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.leave.count({ where });
    res.json({ leaves, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    const updated = await prisma.leave.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: req.user?.id, approvedAt: new Date() },
      include: { employee: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    const updated = await prisma.leave.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy: req.user?.id, rejectReason },
      include: { employee: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only cancel pending leaves' });
    }

    const updated = await prisma.leave.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { employeeId: req.user.id };
    if (status) where.status = status;

    const leaves = await prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getLeaveBalance = async (req, res) => {
  try {
    const { employeeId, year } = req.query;
    const targetYear = year || new Date().getFullYear();

    let quotas = await prisma.leaveQuota.findMany({
      where: { employeeId, year: parseInt(targetYear) },
    });

    if (quotas.length === 0) {
      quotas = await prisma.leaveQuota.createMany({
        data: [
          { employeeId, year: parseInt(targetYear), leaveType: 'ANNUAL', quota: 20 },
          { employeeId, year: parseInt(targetYear), leaveType: 'SICK', quota: 10 },
          { employeeId, year: parseInt(targetYear), leaveType: 'CASUAL', quota: 5 },
        ],
      });
      quotas = await prisma.leaveQuota.findMany({
        where: { employeeId, year: parseInt(targetYear) },
      });
    }

    const leaves = await prisma.leave.groupBy({
      by: ['leaveType'],
      where: { employeeId, status: 'APPROVED', startDate: { gte: new Date(targetYear, 0, 1) } },
      _sum: { days: true },
    });

    const usedMap = {};
    for (const l of leaves) {
      usedMap[l.leaveType] = l._sum.days || 0;
    }

    const balance = quotas.map((q) => ({
      ...q,
      used: usedMap[q.leaveType] || 0,
      remaining: q.quota - (usedMap[q.leaveType] || 0),
    }));

    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getMyLeaves,
  getLeaveBalance,
};