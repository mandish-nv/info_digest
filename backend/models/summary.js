const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  originalContent: {
    text: {
      type: String,
      required: true 
    },
    wordCount: {
      type: Number,
      required: true, 
      min: 0
    },
    sentenceCount: {
      type: Number,
      required: true, 
      min: 0
    }
  },
  summarizedContent: {
    text: {
      type: String,
      required: true 
    },
    wordCount: {
      type: Number,
      required: true, 
      min: 0
    },
    sentenceCount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  keywords: {
    type: [String],
    required: false
  },
  feedback: {
    type: Number,
    required: false
  },
  summaryLength: {
    type: Number,
    required: false
  },
  inputMedium: {
    type: {
      type: String,
      enum: ['text', 'websiteLink', 'docxInput', 'ocrInputPhoto'],
      default: 'text',
      required: true
    },
    websiteLink: String,
    docxInput: String,
    ocrInputPhoto: String
  }
}, {timestamps: true});

module.exports = mongoose.model("Summary", summarySchema);
