const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const uri = 'mongodb://localhost:27017/credian_cotizador';

mongoose.connect(uri).then(async () => {
  console.log('Connected. Seeding DB...');
  
  // Clean users
  await User.deleteMany({});

  const adminPassword = await bcrypt.hash('admin123', 10);
  const companyPassword = await bcrypt.hash('company123', 10);

  const users = [
    {
      email: 'admin@credian.mx',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      companyName: 'CREDIAN Admin'
    },
    {
      email: 'test@empresa.com',
      password: companyPassword,
      name: 'Test Contact',
      role: 'COMPANY',
      companyName: 'Empresa Test SA de CV'
    }
  ];

  await User.insertMany(users);
  console.log('Users Seeded: admin@credian.mx (admin123) and test@empresa.com (company123)');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
