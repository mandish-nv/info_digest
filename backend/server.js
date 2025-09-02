const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const FormData = require("form-data"); // To build multipart/form-data for Python API

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000"; // FastAPI URL

const User = require("./models/user");
const Summary = require("./models/summary");

const port = 5000;

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
const URL = "mongodb://localhost:27017/omni_digest";
app.use(express.json());
app.use(cors());

// --- Multer Configuration ---
const allowedExtensions = ["txt", "pdf", "docx"];
const storageTemp = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "temp_uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Create the Multer upload middleware
const upload = multer({
  storage: storageTemp,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: (req, file, cb) => {
    const fileExtension = path
      .extname(file.originalname)
      .toLowerCase()
      .substring(1);

    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true); // Accept the file
    } else {
      cb(
        new Error(
          "Invalid file type. Only .txt, .pdf, and .docx files are allowed."
        ),
        false
      );
    }
  },
}).single("summaryFile"); // 'summaryFile' should match the name of your file input in the frontend form

// Create the temporary upload directory if it doesn't exist
const fs = require("fs");
const tempUploadsDir = path.join(__dirname, "temp_uploads");
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir);
}
const fileUploadsDir = path.join(__dirname, "file_uploads");
if (!fs.existsSync(fileUploadsDir)) {
  fs.mkdirSync(fileUploadsDir);
}

mongoose
  .connect(URL)
  .then(() => {
    app.get("/", (req, res) => {
      res.send("Mongo Connected");
    });

    app.post("/api/extractive-summary", async (req, res) => {
      try {
        const text = req.body.text;
        const ratio = req.body.ratio;
        const selectedOptionValue = req.body.selectedOptionValue;
        const summaryType = req.body.summaryType;
        if (!text) {
          return res.status(400).json({ error: "Text is required(Express)" });
        }
        const pythonResponse = await axios.post(
          `${PYTHON_API_URL}/api/extractive-summary`,
          {
            text: text,
            ratio: ratio,
            selectedOptionValue: selectedOptionValue,
            summaryType: summaryType,
          }
        );
        res.json(pythonResponse.data);
      } catch (error) {
        console.error("Error calling Python API:", error.message);

        if (error.response) {
          console.error("Response data from Python API:", error.response.data);
          res.status(error.response.status).json(error.response.data);
        } else {
          res.status(500).json({
            error: "Failed to communicate with Python summarizer service",
          });
        }
      }
    });

    app.post("/api/extractive-summary-file", async (req, res) => {
      // Use the 'upload' middleware here
      upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
          console.error("Multer error:", err.message);
          return res
            .status(400)
            .json({ error: `Upload error: ${err.message}` });
        } else if (err) {
          console.error("File validation error or other error:", err.message);
          return res.status(400).json({ error: err.message });
        }

        // After Multer runs, the file info is in req.file
        const file = req.file;
        const ratio = req.body.ratio;
        const selectedOptionValue = req.body.selectedOptionValue;
        const summaryType = req.body.summaryType;

        if (!file) {
          return res.status(400).json({ error: "File is required." });
        }

        const formData = new FormData();
        formData.append(
          "file",
          fs.createReadStream(file.path),
          file.originalname
        );
        formData.append("ratio", ratio);
        formData.append("selectedOptionValue", selectedOptionValue);
        formData.append("summaryType", summaryType);

        try {
          const pythonResponse = await axios.post(
            `${PYTHON_API_URL}/api/extractive-summary-file`,
            formData,
            {
              headers: {
                ...formData.getHeaders(), // Important: set Content-Type correctly for FormData
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
            }
          );

          // Clean up the temporary file after successful forwarding
          fs.unlink(file.path, (unlinkErr) => {
            if (unlinkErr)
              console.error("Error deleting temp file:", unlinkErr);
          });

          res.json(pythonResponse.data);
        } catch (error) {
          console.error("Error calling Python API:", error.message);
          // Clean up the temporary file even if Python API call fails
          fs.unlink(file.path, (unlinkErr) => {
            if (unlinkErr)
              console.error(
                "Error deleting temp file on Python API error:",
                unlinkErr
              );
          });

          if (error.response) {
            console.error(
              "Response data from Python API:",
              error.response.data
            );
            res.status(error.response.status).json(error.response.data);
          } else {
            res.status(500).json({
              error: "Failed to communicate with Python summarizer service",
            });
          }
        }
      });
    });

    app.post("/register", async (req, res) => {
      try {
        const saltRounds = 10;

        const fullName = req.body.fullName;
        const userName = req.body.userName;
        const gender = req.body.gender;
        const dob = req.body.dob;
        const email = req.body.email;
        const password = await bcrypt.hash(req.body.password, saltRounds);
        const profilePicture = req.body.profilePicture;
        const user = new User({
          fullName: fullName,
          userName: userName,
          gender: gender,
          dob: dob,
          email: email,
          password: password,
          profilePicture: profilePicture,
        });

        const userNameSearch = await User.findOne({ userName });
        const emailSearch = await User.findOne({ email });

        if (userNameSearch && emailSearch) {
          res.send("userName and email already exists.");
        } else if (userNameSearch) {
          res.send("userName already exists.");
        } else if (emailSearch) {
          res.send("email already exists.");
        } else {
          await user.save();
          res.send("Registered successfully!");
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while saving data.");
      }
    });

    app.post("/login", async (req, res) => {
      try {
        const userName = req.body.userName;
        const password = req.body.password;

        const userNameSearch = await User.findOne({
          $or: [{ userName: userName }, { email: userName }],
        });

        const passwordMatch = userNameSearch
          ? await bcrypt.compare(password, userNameSearch.password)
          : false;

        if (!userNameSearch) {
          res.send("User not found.");
        } else if (!passwordMatch) {
          res.send("Incorrect password.");
        } else if (passwordMatch) {
          res.send("Logged in successfully!");
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while logging in.");
      }
    });

    app.get("/findUserOrEmail/:userName", async (req, res) => {
      try {
        const userName = req.params.userName;
        const userNameSearch = await User.findOne({
          $or: [{ userName: userName }, { email: userName }],
        });
        if (userNameSearch) {
          res.send(userNameSearch._id);
        } else if (!userNameSearch) {
          res.send("user not found");
        }
      } catch (error) {
        res.status(500).send("User not found.");
      }
    });

    app.get("/findById/:id", async (req, res) => {
      try {
        const userId = req.params.id;

        // Validate MongoDB ObjectId (to prevent errors)
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }

        const user = await User.findById(userId).select("-password");

        if (user) {
          res.status(200).json(user);
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error retrieving user profile:", error);
        res
          .status(500)
          .json({ message: "An error occurred while retrieving data." });
      }
    });

    app.post("/storeSummary", async (req, res) => {
      try {
        const summaryData = req.body;
        console.log(summaryData);

        if (
          !summaryData.user_id ||
          !summaryData.originalContent ||
          !summaryData.summarizedContent
        ) {
          return res
            .status(400)
            .json({ message: "Missing required summary data." });
        }

        const newSummary = new Summary(summaryData);
        const savedSummary = await newSummary.save();

        console.log("Summary saved successfully:", savedSummary);
        res.status(200).json({
          message: "Summary stored successfully!",
          summary: savedSummary,
        });
      } catch (error) {
        if (error.name === "ValidationError") {
          console.error("Validation Error:", error.message);
          return res.status(400).json({
            message: "Validation failed",
            errors: error.errors, // Mongoose validation errors
          });
        }
        console.error("Error saving summary:", error);
        res.status(500).json({
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    app.post("/storeSummary/file/:id", async (req, res) => {
      const summaryId = req.params.id;

      // Configure storage for Multer
      const storageFile = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, "file_uploads/");
        },
        filename: (req, file, cb) => {
          cb(null, `${summaryId}-${file.originalname}`);
        },
      });

      // Configure Multer upload middleware
      const uploadFile = multer({
        storage: storageFile,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
        fileFilter: (req, file, cb) => {
          const fileExtension = path
            .extname(file.originalname)
            .toLowerCase()
            .substring(1); // Get extension without the dot

          if (allowedExtensions.includes(fileExtension)) {
            cb(null, true); // Accept the file
          } else {
            cb(
              new Error(
                "Invalid file type. Only .txt, .pdf, and .docx files are allowed."
              ),
              false
            );
          }
        },
      }).single("summaryFile"); // 'summaryFile' is the name of the input field in your form

      // Use the uploadFile middleware
      uploadFile(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }

        if (!req.file) {
          return res
            .status(400)
            .json({ success: false, message: "No file uploaded." });
        }

        try {
          const summary = await Summary.findById(summaryId);

          if (!summary) {
            return res
              .status(404)
              .json({ success: false, message: "Summary not found." });
          }

          // Update the summary document with file details
          summary.inputMedium = {
            type: "file",
            file: {
              filePath: req.file.path,
              name: req.file.originalname,
              type: req.file.mimetype,
              size: req.file.size,
            },
          };

          await summary.save();

          res.status(200).json({
            success: true,
            message: "File uploaded and summary updated successfully.",
            summary: summary,
          });
        } catch (dbError) {
          console.error("Database error:", dbError);
          res.status(500).json({
            success: false,
            message: "Failed to update summary in database.",
            error: dbError.message,
          });
        }
      });
    });

    app.get("/retrieveSummary/:id", async (req, res) => {
      try {
        const userId = req.params.id;

        if (!userId) {
          return res.status(400).json({ message: "User ID is required." });
        }

        const summaries = await Summary.find({ user_id: userId });

        if (!summaries || summaries.length === 0) {
          return res
            .status(404)
            .json({ message: "No summaries found for this user ID." });
        }

        res.status(200).json(summaries);
      } catch (error) {
        console.error("Error fetching summaries by user ID:", error);
        res.status(500).json({
          message: "Server error while fetching summaries.",
          error: error.message,
        });
      }
    });

    app.patch("/updateSummaryFeedback/:summaryId", async (req, res) => {
      try {
        const { summaryId } = req.params;
        const { rating } = req.body;

        // Validate if summaryId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(summaryId)) {
          return res
            .status(400)
            .json({ message: "Invalid Summary ID format." });
        }

        if (
          rating === undefined ||
          rating === null ||
          typeof rating !== "number" ||
          rating < 1 ||
          rating > 5
        ) {
          return res
            .status(400)
            .json({ message: "Valid rating (1-5) is required." });
        }

        // Find the summary by ID and update the feedback field
        const updatedSummary = await Summary.findByIdAndUpdate(
          summaryId,
          { $set: { feedback: rating } }, // Use $set to update only the feedback field
          { new: true, runValidators: true } // Return the updated document, run schema validators
        );

        if (!updatedSummary) {
          return res.status(404).json({ message: "Summary not found." });
        }

        console.log("Summary feedback updated successfully:", updatedSummary);
        res.status(200).json({
          message: "Summary feedback updated successfully!",
          summary: updatedSummary,
        });
      } catch (error) {
        if (error.name === "ValidationError") {
          console.error(
            "Validation Error updating summary feedback:",
            error.message
          );
          return res.status(400).json({
            message: "Validation failed for summary feedback update",
            errors: error.errors,
          });
        }
        console.error("Error updating summary feedback:", error);
        res.status(500).json({
          message: "Internal server error while updating summary feedback",
          error: error.message,
        });
      }
    });

    app.get("/adminStatus/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }
        const user = await User.findById(userId);
        if (user) {
          res.status(200).json(user.adminAccess);
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error retrieving user access", error);
        res
          .status(500)
          .json({ message: "An error occurred while retrieving data." });
      }
    });

    app.get("/users/:userId/name", async (req, res) => {
      try {
        const { userId } = req.params;
        const user = await User.findOne({ _id: userId });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ name: user.userName });
      } catch (error) {
        console.error("Error fetching user name:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const users = await User.find({}).select("-password");
        res.status(200).json(users);
      } catch (error) {
        console.error("Error retrieving all users:", error);
        res
          .status(500)
          .json({ message: "An error occurred while retrieving users." });
      }
    });

    app.put("/users/:id/adminAccess", async (req, res) => {
      try {
        const userId = req.params.id;
        const { adminAccess } = req.body; // Expecting boolean 'adminAccess' from frontend

        // Validate User ID Format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid user ID format." });
        }

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found." });
        }

        if (typeof adminAccess !== "boolean") {
          return res.status(400).json({
            message: "Invalid value for adminAccess. Must be true or false.",
          });
        }

        // Update the adminAccess field
        user.adminAccess = adminAccess;

        await user.save();

        const updatedUser = {
          _id: user._id,
          fullName: user.fullName,
          userName: user.userName,
          email: user.email,
          adminAccess: user.adminAccess,
        };
        res.status(200).json({
          message: "User admin access updated successfully.",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error updating user admin access:", error);
        res
          .status(500)
          .json({ message: "An error occurred while updating user access." });
      }
    });

app.get("/analytics", async (req, res) => {
  try {
    const totalSummaries = await Summary.countDocuments();

    // Define the length labels for mapping numeric categories to strings
    const lengthLabels = {
      0: "Very Short",
      1: "Short",
      2: "Medium",
      3: "Long",
    };

    // Run all aggregation queries in parallel for efficiency
    const [
      statsByLength,
      feedbackDistribution,
      inputMediumStats,
      lengthDistribution,
      summaryTypeDistribution, // Added new variable for summary type distribution
    ] = await Promise.all([
      // New aggregation: Calculate all content stats grouped by summaryLength
      Summary.aggregate([
        {
          $match: { summaryLength: { $in: Object.keys(lengthLabels).map(Number) } }
        },
        {
          $group: {
            _id: "$summaryLength", // Group by the length category (0, 1, 2, 3)
            avgOriginalWordCount: { $avg: "$originalContent.wordCount" },
            avgOriginalSentenceCount: { $avg: "$originalContent.sentenceCount" },
            avgSummarizedWordCount: { $avg: "$summarizedContent.wordCount" },
            avgSummarizedSentenceCount: { $avg: "$summarizedContent.sentenceCount" },
            avgCompressionRatio: {
              $avg: {
                // Safely calculate division, avoiding divide-by-zero errors
                $cond: [
                  { $eq: ["$originalContent.wordCount", 0] },
                  0, // Return 0 if original word count is 0
                  { $divide: ["$summarizedContent.wordCount", "$originalContent.wordCount"] }
                ]
              }
            }
          }
        }
      ]),

      // Feedback distribution (1–5) and includes null feedback
      Summary.aggregate([
        { $group: { _id: "$feedback", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Input medium type distribution
      Summary.aggregate([
        { $group: { _id: "$inputMedium.type", count: { $sum: 1 } } },
      ]),

      // Count of summaries for each length category
      Summary.aggregate([
        { $match: { summaryLength: { $in: Object.keys(lengthLabels).map(Number) } } },
        { $group: { _id: "$summaryLength", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // New aggregation: Count summaries by type (extractive vs. abstractive)
      Summary.aggregate([
        { $group: { _id: "$summaryType", count: { $sum: 1 } } },
      ]),
    ]);

    // --- Data Transformation ---

    // Create the nested objects for stats by length required by the frontend
    const { originalContentStatsByLength, summarizedContentStatsByLength } =
      statsByLength.reduce((acc, stat) => {
        const label = lengthLabels[stat._id];
        if (label) {
          acc.originalContentStatsByLength[label] = {
            avgWordCount: stat.avgOriginalWordCount || 0,
            avgSentenceCount: stat.avgOriginalSentenceCount || 0,
          };
          acc.summarizedContentStatsByLength[label] = {
            avgWordCount: stat.avgSummarizedWordCount || 0,
            avgSentenceCount: stat.avgSummarizedSentenceCount || 0,
            avgCompressionRatio: stat.avgCompressionRatio || 0,
          };
        }
        return acc;
      }, { originalContentStatsByLength: {}, summarizedContentStatsByLength: {} });

    // Map the length distribution counts to labels for the pie chart
    const mappedLengthDistribution = lengthDistribution.map((entry) => ({
      label: lengthLabels[entry._id] || "Unknown",
      count: entry.count,
    }));

    // --- Final JSON Response ---

    res.json({
      totalSummaries,
      originalContentStats: {
        // This part is mainly for the pie chart now
        lengthDistribution: mappedLengthDistribution,
      },
      // The new, detailed stats objects
      originalContentStatsByLength,
      summarizedContentStatsByLength,
      feedbackAnalysis: feedbackDistribution.map((f) => ({
        rating: f._id,
        count: f.count,
      })),
      inputMediumDistribution: inputMediumStats.map((i) => ({
        type: i._id,
        count: i.count,
      })),
      summaryTypeDistribution: summaryTypeDistribution.map((s) => ({
        type: s._id,
        count: s.count,
      })),
    });
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
});
    app.listen(port, () => {
      console.log(`Node.js server running on port ${port}`);
      console.log(`Forwarding requests to Python API at ${PYTHON_API_URL}`);
    });
  })
  .catch((err) => console.log(err));
