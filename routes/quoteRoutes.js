const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');

router.post('/', quoteController.createQuote);
router.get('/', quoteController.getQuotes);
router.get('/:id', quoteController.getQuoteById);

module.exports = router;
