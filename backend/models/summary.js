const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  summarizedText: {
    type: String,
    required: true
  },
  topSentences: {
    type: [String],
    required: false
  },
  keywords: {
    type: [String],
    required: false
  },
  feedback: {
    type: String,
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
      required: true
    },
    websiteLink: String,
    docxInput: String,
    ocrInputPhoto: String
  }
}, {timestamps: true});

module.exports = mongoose.model("Summary", summarySchema);
