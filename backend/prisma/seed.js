const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const MODULES = ['USERS', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'REPORTS', 'SETTINGS'];
const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'];

const getPermissions = (role) => {
  const defaults = {
    SUPER_ADMIN: MODULES.flatMap((m) => ACTIONS.map((a) => ({ module: m, action: a, isGranted: true }))),
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
      { module: 'ATTENDANCE', action: 'VIEW', isGranted: true },
      { module: 'ATTENDANCE', action: 'CREATE', isGranted: true },
      { module: 'LEAVE', action: 'VIEW', isGranted: true },
      { module: 'LEAVE', action: 'CREATE', isGranted: true },
    ],
  };
  return defaults[role] || [];
};

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const departments = [
    { name: 'Engineering', description: 'Software Development' },
    { name: 'Human Resources', description: 'HR Department' },
    { name: 'Finance', description: 'Finance & Accounting' },
    { name: 'Marketing', description: 'Marketing & Sales' },
    { name: 'Operations', description: 'Operations' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }
  console.log('Departments created');

  const users = [
    { email: 'superadmin@hrms.com', name: 'Super Admin', role: 'SUPER_ADMIN' },
    { email: 'admin@hrms.com', name: 'Admin User', role: 'ADMIN' },
    { email: 'manager@hrms.com', name: 'Manager User', role: 'MANAGER' },
    { email: 'employee@hrms.com', name: 'Employee User', role: 'EMPLOYEE' },
  ];

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          permissions: {
            create: getPermissions(userData.role),
          },
        },
      });
      console.log(`Created user: ${user.email}`);
    }
  }

  const hrDept = await prisma.department.findUnique({ where: { name: 'Human Resources' } });
  const engDept = await prisma.department.findUnique({ where: { name: 'Engineering' } });
  const financeDept = await prisma.department.findUnique({ where: { name: 'Finance' } });

  if (hrDept && !(await prisma.employee.findUnique({ where: { email: 'john.doe@company.com' } }))) {
    await prisma.employee.create({
      data: {
        employeeId: 'EMP00001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        phone: '+1234567890',
        jobTitle: 'HR Manager',
        departmentId: hrDept.id,
        salary: 75000,
        joinDate: new Date('2022-01-15'),
        isActive: true,
      },
    });
    console.log('Sample employees created');
  }

  console.log('Database seeded!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());