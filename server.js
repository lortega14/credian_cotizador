require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabling for simplicity in dev, configure properly in prod
}));
app.use(cors());

// Logging Middleware
app.use(morgan('dev'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON and URLEncoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credian_cotizador').then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_credian',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/credian_cotizador' 
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/quotes', require('./routes/quoteRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Fallback to index.html for SPA-like behavior (or handling 404s)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
