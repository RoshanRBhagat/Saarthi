const mongoose = require('mongoose');

const hostSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true, // Prevents the same number from registering twice
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  carDetails: {
    makeAndModel: {
      type: String,
      required: [true, 'Car make and model is required']
    },
    // We will add more fields here later (e.g., license plate, year)
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    enum: ['mumbai', 'pune', 'akola', 'nagpur'], // Restricts input to these specific cities
    lowercase: true
  },
  registrationStatus: {
    type: String,
    enum: ['pending_review', 'active', 'suspended'],
    default: 'pending_review' // All new hosts start as pending
  }
}, { 
  timestamps: true // Automatically creates 'createdAt' and 'updatedAt' fields
});

module.exports = mongoose.model('Host', hostSchema);