const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    select: false,  // Don't return password in queries by default
    required: false  // Optional - only required for local auth (dev mode)
  },
  role: {
    type: String,
    enum: ['patient', 'caregiver'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  preferredLanguage: {
    type: String,
    enum: ['english', 'assamese', 'bengali', 'bodo', 'manipuri', 'nagamese', 'mizo', 'khasi'],
    default: 'english'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date
  }
}, { timestamps: true });

// Pre-save middleware to hash password before storing
userSchema.pre('save', async function(next) {
  // Only hash if password is modified and it's not already hashed
  if (!this.isModified('password')) return next();
  
  try {
    // Skip hashing if password is empty or already starts with $2 (bcrypt hash)
    if (!this.password || this.password.startsWith('$2')) return next();
    
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to verify password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && new Date(this.accountLockedUntil) > new Date();
};

// Instance method to reset failed login attempts
userSchema.methods.resetFailedAttempts = function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
