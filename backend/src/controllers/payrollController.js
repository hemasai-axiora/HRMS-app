const prisma = require('../config/database');
const salaryCalculator = require('../services/salaryService');

const getSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const structure = await prisma.salaryStructure.findUnique({ where: { employeeId } });
    if (!structure) return res.json(null);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { joinDate: true },
    });

    const yearsOfService = employee?.joinDate
      ? (new Date() - new Date(employee.joinDate)) / (365.25 * 24 * 60 * 60 * 1000)
      : 0;

    const pf = salaryCalculator.calculatePF(structure.basicSalary, structure.pfEnabled);
    const tds = structure.tdsEnabled
      ? salaryCalculator.calculateTDS(structure.basicSalary)
      : 0;
    const gratuity = salaryCalculator.calculateGratuity(structure.basicSalary, yearsOfService);

    res.json({ ...structure, calculations: { pf, tds, gratuity, yearsOfService: yearsOfService.toFixed(1) } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const setSalaryStructure = async (req, res) => {
  try {
    const { employeeId, basicSalary, hra, da, conveyence, medical, specialAllowance, otherAllowance, pfEnabled, pfRate, tdsEnabled, insurance, otherDeduction } = req.body;

    if (!employeeId || !basicSalary) {
      return res.status(400).json({ error: 'Employee ID and basic salary required' });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const structure = await prisma.salaryStructure.upsert({
      where: { employeeId },
      create: {
        employeeId,
        basicSalary,
        hra: hra || 0,
        da: da || 0,
        conveyence: conveyence || 0,
        medical: medical || 0,
        specialAllowance: specialAllowance || 0,
        otherAllowance: otherAllowance || 0,
        pfEnabled: pfEnabled !== false,
        pfRate: pfRate || 0.12,
        tdsEnabled: tdsEnabled !== false,
        insurance: insurance || 0,
        otherDeduction: otherDeduction || 0,
      },
      update: {
        basicSalary,
        hra,
        da,
        conveyence,
        medical,
        specialAllowance,
        otherAllowance,
        pfEnabled: pfEnabled !== undefined ? pfEnabled : true,
        pfRate,
        tdsEnabled: tdsEnabled !== undefined ? tdsEnabled : true,
        insurance,
        otherDeduction,
      },
    });

    res.json(structure);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const runPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const existing = await prisma.payrollRun.findUnique({
      where: { month_year: { month: targetMonth, year: targetYear } },
    });
    if (existing) return res.status(400).json({ error: 'Payroll already run for this period' });

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: { salaryStructure: true },
    });

    const attendances = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    });

    const leaveDeductions = await prisma.leave.findMany({
      where: { startDate: { gte: startDate }, status: 'APPROVED', leaveType: 'UNPAID' },
    });

    const payrollRun = await prisma.payrollRun.create({
      data: { month: targetMonth, year: targetYear, status: 'PROCESSED', processedBy: req.user?.id, processedAt: new Date() },
    });

    let totalAmount = 0;
    let totalPf = 0;
    let totalTds = 0;
    let totalGratuity = 0;
    const records = [];

    for (const employee of employees) {
      if (!employee.salaryStructure) continue;

      const structure = employee.salaryStructure;
      const empAttendance = attendances.filter((a) => a.employeeId === employee.id);
      const daysWorked = empAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
      const unpaidLeaves = leaveDeductions.filter((l) => l.employeeId === employee.id).reduce((sum, l) => sum + l.days, 0);
      const workDays = 20;

      const calc = daysWorked < workDays
        ? salaryCalculator.calculateProportionalSalary(structure, daysWorked - unpaidLeaves, workDays, { tdsEnabled: structure.tdsEnabled, employeePf: structure.pfEnabled })
        : salaryCalculator.calculateNetSalary(structure, { tdsEnabled: structure.tdsEnabled, employeePf: structure.pfEnabled });

      const record = await prisma.payrollRecord.create({
        data: {
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          basicSalary: calc.breakdowns.earnings.basicSalary,
          hra: calc.breakdowns.earnings.hra,
          da: calc.breakdowns.earnings.da,
          conveyance: calc.breakdowns.earnings.conveyance,
          medical: calc.breakdowns.earnings.medical,
          specialAllowance: calc.breakdowns.earnings.specialAllowance,
          otherAllowance: calc.breakdowns.earnings.otherAllowance,
          grossEarnings: calc.grossEarnings,
          pf: calc.breakdowns.deductions.employeePf,
          tax: calc.breakdowns.deductions.tds,
          insurance: calc.breakdowns.deductions.insurance,
          otherDeductions: calc.breakdowns.deductions.otherDeductions,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
          workDays,
          daysWorked: Math.max(0, daysWorked - unpaidLeaves),
          leaves: unpaidLeaves,
          deductions: unpaidLeaves * (structure.basicSalary / workDays),
        },
      });

      totalAmount += calc.netSalary;
      totalPf += calc.breakdowns.deductions.employerPf;
      totalTds += calc.breakdowns.deductions.tds;
      if (employee.joinDate) {
        const years = (new Date() - new Date(employee.joinDate)) / (365.25 * 24 * 60 * 60 * 1000);
        totalGratuity += salaryCalculator.calculateGratuity(structure.basicSalary, years);
      }
      records.push(record);
    }

    const updated = await prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalAmount,
        employeeCount: records.length,
        totalPf,
        totalTds,
        totalGratuity,
      },
    });

    res.json({ payrollRun: updated, records, summary: { totalPf, totalTds, totalGratuity } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getPayrollReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { month_year: { month: targetMonth, year: targetYear } },
    });

    if (!payrollRun) return res.status(404).json({ error: 'Payroll not run for this period' });

    const records = await prisma.payrollRecord.findMany({
      where: { payrollRunId: payrollRun.id },
      include: { employee: { include: { department: true } } },
    });

    res.json({ payrollRun, records, summary: { totalPf: payrollRun.totalPf, totalTds: payrollRun.totalTds, totalGratuity: payrollRun.totalGratuity } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllPayrollRuns = async (req, res) => {
  try {
    const runs = await prisma.payrollRun.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const calculateEmployeeSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const structure = await prisma.salaryStructure.findUnique({ where: { employeeId } });
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { joinDate: true },
    });

    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const attendances = await prisma.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lte: endDate } },
    });

    const daysWorked = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const workDays = 20;

    const calc = daysWorked < workDays
      ? salaryCalculator.calculateProportionalSalary(structure, daysWorked, workDays, { tdsEnabled: structure.tdsEnabled, employeePf: structure.pfEnabled })
      : salaryCalculator.calculateNetSalary(structure, { tdsEnabled: structure.tdsEnabled, employeePf: structure.pfEnabled });

    const yearsOfService = employee?.joinDate
      ? (new Date() - new Date(employee.joinDate)) / (365.25 * 24 * 60 * 60 * 1000)
      : 0;

    res.json({
      employeeId,
      month: targetMonth,
      year: targetYear,
      yearsOfService: yearsOfService.toFixed(1),
      baseSalary: structure.basicSalary,
      calculation: calc,
      settings: salaryCalculator.getSettings(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getPayrollSettings = async (req, res) => {
  try {
    let settings = await prisma.payrollSettings.findFirst();
    if (!settings) {
      settings = await prisma.payrollSettings.create({ data: {} });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updatePayrollSettings = async (req, res) => {
  try {
    const { pfRate, maxPf, gratuityRate, tdsEnabled, epfEnabled, epsEnabled, adminPf } = req.body;

    const settings = await prisma.payrollSettings.updateMany({
      data: {
        ...(pfRate !== undefined && { pfRate }),
        ...(maxPf !== undefined && { maxPf }),
        ...(gratuityRate !== undefined && { gratuityRate }),
        ...(tdsEnabled !== undefined && { tdsEnabled }),
        ...(epfEnabled !== undefined && { epfEnabled }),
        ...(epsEnabled !== undefined && { epsEnabled }),
        ...(adminPf !== undefined && { adminPf }),
      },
    });

    if (pfRate !== undefined) salaryCalculator.updateSettings({ pfRate });
    if (maxPf !== undefined) salaryCalculator.updateSettings({ maxPf });

    res.json(await prisma.payrollSettings.findFirst());
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getSalaryStructure,
  setSalaryStructure,
  runPayroll,
  getPayrollReport,
  getAllPayrollRuns,
  calculateEmployeeSalary,
  getPayrollSettings,
  updatePayrollSettings,
};