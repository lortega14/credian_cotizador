const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/stats', adminController.getStats);
router.get('/activities.csv', adminController.downloadActivityLogCsv);
router.get('/quotes.csv', adminController.downloadQuotesCsv);
router.post('/users', adminController.createUser);
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/send-credentials', adminController.sendCredentials);

module.exports = router;
