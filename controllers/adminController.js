const Quote = require('../models/Quote');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { Parser } = require('json2csv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendCredentialsEmail } = require('../utils/mailer');

const isAdmin = (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Requires admin privileges' });
  }
  next();
};

exports.getStats = [isAdmin, async (req, res) => {
  try {
    const totalCompanies = await User.countDocuments({ role: 'COMPANY' });
    const totalQuotesLength = await Quote.countDocuments();
    
    // Companies that have quoted vs those that only logged in
    const quotes = await Quote.find().distinct('userId');
    const companiesThatQuoted = quotes.length;
    
    // Active sessions (simple representation by logins in the last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const activeLogins = await ActivityLog.find({ action: 'LOGIN', timestamp: { $gte: yesterday } }).distinct('userId');

    // List of latest activities for the dashboard table
    const latestActivities = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('userId', 'companyName email');

    res.json({
      totalCompanies,
      totalQuotes: totalQuotesLength,
      companiesThatQuoted,
      companiesOnlyLoggedIn: totalCompanies - companiesThatQuoted,
      activeSessions24h: activeLogins.length,
      latestActivities
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}];

exports.downloadActivityLogCsv = [isAdmin, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .populate('userId', 'companyName email');

    const formattedLogs = logs.map(log => ({
      Company: log.userId ? log.userId.companyName : 'Unknown',
      Email: log.userId ? log.userId.email : 'Unknown',
      Action: log.action,
      Date: log.timestamp.toISOString(),
      Details: JSON.stringify(log.details)
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(formattedLogs);

    res.header('Content-Type', 'text/csv');
    res.attachment('activity_log.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Download activity log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}];

exports.downloadQuotesCsv = [isAdmin, async (req, res) => {
  try {
    const quotes = await Quote.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'companyName email');

    const formattedQuotes = quotes.map(quote => ({
      Date: quote.createdAt.toISOString(),
      Company: quote.userId ? quote.userId.companyName : 'Unknown',
      Client: quote.generalData.client,
      Asset: quote.generalData.asset,
      InvoiceValue: quote.generalData.invoiceValue,
      Currency: quote.generalData.currency,
      NetValue: quote.generalData.netValue,
      OptionsOffered: quote.terms.map(t => `${t.months}mo`).join(' / ')
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(formattedQuotes);

    res.header('Content-Type', 'text/csv');
    res.attachment('quotes.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Download quotes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}];

exports.createUser = [isAdmin, async (req, res) => {
  try {
    const { email, companyName } = req.body;

    if (!email || !companyName) {
      return res.status(400).json({ error: 'Email and Company Name are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Generate random 8-character password
    const rawPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = new User({
      email: normalizedEmail,
      password: hashedPassword,
      name: 'Representante',
      role: 'COMPANY',
      companyName: companyName
    });

    await newUser.save();

    await ActivityLog.create({
      userId: req.session.userId,
      action: 'COMPANY_CREATED',
      details: {
        createdCompanyEmail: normalizedEmail,
        createdCompanyName: companyName
      }
    });

    res.status(201).json({
      message: 'Empresa creada exitosamente',
      user: {
        email: normalizedEmail,
        companyName: companyName,
        generatedPassword: rawPassword
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error while creating user' });
  }
}];

exports.getUsers = [isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'COMPANY' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}];

exports.updateUser = [isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, companyName, resetPassword } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.email = email.toLowerCase().trim();
    user.companyName = companyName;

    let resData = { message: 'Usuario actualizado', user: { email: user.email, companyName: user.companyName } };

    if (resetPassword) {
      const rawPassword = crypto.randomBytes(4).toString('hex');
      user.password = await bcrypt.hash(rawPassword, 10);
      resData.newPassword = rawPassword;
    }

    await user.save();
    
    await ActivityLog.create({
      userId: req.session.userId,
      action: 'COMPANY_MODIFIED',
      details: { targetUserId: user._id, targetCompanyName: companyName }
    });

    res.json(resData);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}];

exports.deleteUser = [isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    
    if (user) {
      await ActivityLog.create({
        userId: req.session.userId,
        action: 'COMPANY_DELETED',
        details: { deletedEmail: user.email, deletedCompanyName: user.companyName }
      });
    }

    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}];

exports.sendCredentials = [isAdmin, async (req, res) => {
  try {
    const { email, companyName, password } = req.body;

    if (!email || !companyName || !password) {
      return res.status(400).json({ error: 'Faltan datos para enviar el correo' });
    }

    await sendCredentialsEmail(email, companyName, password);

    res.json({ message: 'Correo enviado exitosamente' });
  } catch (error) {
    console.error('Send credentials email error:', error);
    res.status(500).json({ error: 'Error al enviar el correo. Verifica la configuración SMTP.' });
  }
}];

