const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalContent: {
      text: {
        type: String,
        required: true,
      },
      wordCount: {
        type: Number,
        required: true,
        min: 0,
      },
      sentenceCount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    summarizedContent: {
      text: {
        type: String,
        required: true,
      },
      wordCount: {
        type: Number,
        required: true,
        min: 0,
      },
      sentenceCount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    keywords: {
      type: [String],
      required: false,
    },
    feedback: {
      type: Number,
      required: false,
    },
    summaryLength: {
      type: Number, //String
      required: false,
    },
    inputMedium: {
      type: {
        type: String,
        enum: ["text", "file", "image"],
        default: "text",
        required: true,
      },
      file: {
        filePath: { type: String, required: false, trim: true }, 
        name: { type: String, required: false, trim: true}, // Original file name
        type: { type: String, required: false, trim: true}, 
        size: { type: Number, required: false, min: 0 }, // in bytes
      },
      image: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Summary", summarySchema);
