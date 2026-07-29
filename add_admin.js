require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/credian_cotizador';

mongoose.connect(uri).then(async () => {
  console.log('Conectado a la base de datos...');

  // Check if user already exists
  const existing = await User.findOne({ email: 'mateo@credian.mx' });
  if (existing) {
    console.log('El usuario mateo@credian.mx ya existe.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('MateoCredian2026', 10);

  await User.create({
    email: 'mateo@credian.mx',
    password: hashedPassword,
    name: 'Mateo',
    role: 'ADMIN',
    companyName: 'CREDIAN Admin'
  });

  console.log('✅ Usuario admin creado: mateo@credian.mx');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
