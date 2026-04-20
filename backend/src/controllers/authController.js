const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { getDefaultPermissions } = require('./permissionController');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { permissions: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const permissions = user.permissions.length > 0 ? user.permissions : getDefaultPermissions(user.role);

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, permissions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = role || 'EMPLOYEE';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        permissions: {
          create: getDefaultPermissions(userRole),
        },
      },
      include: { permissions: true },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, permissions: user.permissions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { permissions: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const permissions = user.permissions.length > 0 ? user.permissions : getDefaultPermissions(user.role);
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, permissions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { login, register, getProfile };