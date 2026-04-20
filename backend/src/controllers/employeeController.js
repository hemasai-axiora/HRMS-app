const prisma = require('../config/database');

const employeeIncludes = {
  department: true,
  manager: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
  subordinates: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
  documents: true,
};

const getAllEmployees = async (req, res) => {
  try {
    const { departmentId, search, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };

    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: employeeIncludes,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.employee.count({ where });

    res.json({ employees, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: employeeIncludes,
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createEmployee = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender, address, nationality,
      jobTitle, departmentId, employmentType, joinDate, salary, managerId
    } = req.body;

    if (!firstName || !lastName || !email || !jobTitle || !departmentId || !salary) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const count = await prisma.employee.count();
    const employeeId = `EMP${String(count + 1).padStart(5, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        nationality,
        jobTitle,
        departmentId,
        employmentType: employmentType || 'FULL_TIME',
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        salary: parseFloat(salary),
        managerId,
      },
      include: employeeIncludes,
    });

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, email, phone, dateOfBirth, gender, address, nationality,
      jobTitle, departmentId, employmentType, joinDate, salary, managerId, isActive
    } = req.body;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender !== undefined && { gender }),
        ...(address !== undefined && { address }),
        ...(nationality !== undefined && { nationality }),
        ...(jobTitle && { jobTitle }),
        ...(departmentId && { departmentId }),
        ...(employmentType && { employmentType }),
        ...(joinDate && { joinDate: new Date(joinDate) }),
        ...(salary && { salary: parseFloat(salary) }),
        ...(managerId !== undefined && { managerId }),
        ...(isActive !== undefined && { isActive }),
      },
      include: employeeIncludes,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Employee deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    const department = await prisma.department.update({
      where: { id },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(isActive !== undefined && { isActive }) },
    });
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name required' });

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Department exists' });

    const department = await prisma.department.create({
      data: { name, description },
    });

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getOrgChart = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        managerId: true,
      },
      orderBy: { firstName: 'asc' },
    });

    const chart = employees.map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      title: e.jobTitle,
      managerId: e.managerId,
    }));

    res.json(chart);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  updateDepartment,
  createDepartment,
  getOrgChart,
};