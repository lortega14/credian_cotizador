const mongoose = require('mongoose');

const termSchema = new mongoose.Schema({
  months: { type: Number, required: true },
  extraordinaryCommission: { type: Number, required: true },
  firstRent: { type: Number, required: true },
  openingCommission: { type: Number, required: true },
  paymentSubtotal: { type: Number, required: true },
  paymentIva: { type: Number, required: true },
  initialPaymentTotal: { type: Number, required: true },
  monthlyRent: { type: Number, required: true },
  monthlyRentIva: { type: Number, required: true },
  totalMonthlyRent: { type: Number, required: true },
  residualValue: { type: Number, required: true },
  residualIva: { type: Number, required: true },
  netResidualValue: { type: Number, required: true },
  estimatedIsrSaving: { type: Number, required: true }
}, { _id: false }); // Prevent creating an _id for each array item

const quoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generalData: {
    client: { type: String, required: true },
    asset: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    currency: { type: String, required: true },
    invoiceValue: { type: Number, required: true },
    iva: { type: Number, required: true },
    netValue: { type: Number, required: true },
    exchangeRate: { type: Number, required: true },
    rentType: { type: String, required: true }
  },
  terms: {
    type: [termSchema],
    required: true,
    validate: [v => v.length > 0, 'At least one term configuration is required']
  }
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
