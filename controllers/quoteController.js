const Quote = require('../models/Quote');
const ActivityLog = require('../models/ActivityLog');

exports.createQuote = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { generalData, terms } = req.body;

    // Validate
    if (!generalData || !terms || terms.length === 0) {
      return res.status(400).json({ error: 'General data and terms are required' });
    }

    const newQuote = await Quote.create({
      userId: req.session.userId,
      generalData,
      terms
    });

    // Log Activity
    await ActivityLog.create({
      userId: req.session.userId,
      action: 'QUOTE_GENERATED',
      details: {
        quoteId: newQuote._id,
        client: generalData.client,
        asset: generalData.asset,
        netValue: generalData.netValue
      }
    });

    res.status(201).json({ message: 'Quote created successfully', quote: newQuote });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getQuotes = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Role-based filtering: ADMIN sees all, COMPANY sees only theirs
    const query = req.session.role === 'ADMIN' ? {} : { userId: req.session.userId };
    
    // Sort by newest first
    const quotes = await Quote.find(query).sort({ createdAt: -1 }).populate('userId', 'companyName email');

    res.json(quotes);
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getQuoteById = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const quote = await Quote.findById(req.params.id).populate('userId', 'companyName email');
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    // Simple authorization check
    if (req.session.role !== 'ADMIN' && quote.userId._id.toString() !== req.session.userId) {
       return res.status(403).json({ error: 'Not authorized to view this quote' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Get quote by id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
