const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'COMPANY'],
    required: true,
    default: 'COMPANY'
  },
  companyName: {
    type: String,
    required: true
  },
  fixedCondition: {
    type: String,
    enum: ['Libre', 'Nuevo', 'Seminuevo'],
    default: 'Libre'
  },
  lastLogin: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
