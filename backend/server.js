const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const axios = require("axios"); // For making HTTP requests to FastAPI
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

const lengthLabels = {
  0: "Very Short",
  1: "Short",
  2: "Medium",
  3: "Long",
};

// --- Multer Configuration ---
// Define allowed extensions (case-insensitive)
const allowedExtensions = ["txt", "pdf", "docx"];

// Configure Multer storage to temporarily save the file
const storageTemp = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save uploaded files to a temporary 'temp_uploads' directory
    // These files will be forwarded to the Python API and then potentially deleted.
    cb(null, "temp_uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Create the Multer upload middleware
const upload = multer({
  storage: storageTemp,
  limits: { fileSize: 10 * 1024 * 1024 }, // Example: 10MB file size limit
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
        if (!text) {
          return res.status(400).json({ error: "Text is required(Express)" });
        }
        const pythonResponse = await axios.post(
          `${PYTHON_API_URL}/api/extractive-summary`,
          {
            text: text,
            ratio: ratio,
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
          // A Multer error occurred (e.g., file size limit)
          console.error("Multer error:", err.message);
          return res
            .status(400)
            .json({ error: `Upload error: ${err.message}` });
        } else if (err) {
          // Our custom fileFilter error or other unexpected error
          console.error("File validation error or other error:", err.message);
          return res.status(400).json({ error: err.message });
        }

        // After Multer runs, the file info is in req.file
        const file = req.file;
        const ratio = req.body.ratio; 

        if (!file) {
          return res.status(400).json({ error: "File is required." });
        }

        const formData = new FormData();
        // Append the file 
        formData.append(
          "file",
          fs.createReadStream(file.path),
          file.originalname
        );
        formData.append("ratio", ratio); 

        try {
          const pythonResponse = await axios.post(
            `${PYTHON_API_URL}/api/extractive-summary-file`,
            formData,
            {
              headers: {
                ...formData.getHeaders(), // Important: set Content-Type correctly for FormData
              },
              maxContentLength: Infinity, // Important for large files
              maxBodyLength: Infinity, // Important for large files
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

        const userNameSearch = await User.findOne({ userName }); //returns whole object
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

    //make this get
    app.post("/findUserOrEmail", async (req, res) => {
      try {
        const userName = req.body.userName;
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
        const userId = req.params.id; // Use `id` instead of `slug`

        // Validate MongoDB ObjectId (to prevent errors)
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }

        const user = await User.findById(userId).select("-password"); // Use `findById` for efficiency

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
        const summaryData = req.body; // Data sent from your frontend
        console.log(summaryData);
        // Basic validation (Mongoose schema also handles much of this,
        // but you can add more specific checks here if needed before saving)
        if (
          !summaryData.user_id ||
          !summaryData.originalContent ||
          !summaryData.summarizedContent
        ) {
          return res
            .status(400)
            .json({ message: "Missing required summary data." });
        }

        // Create a new Summary document using the model
        const newSummary = new Summary(summaryData);

        // Save the document to the database
        const savedSummary = await newSummary.save();

        console.log("Summary saved successfully:", savedSummary);
        res.status(200).json({
          message: "Summary stored successfully!",
          summary: savedSummary,
        });
      } catch (error) {
        // Handle validation errors or other database errors
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
          // Set the destination folder for uploaded files
          cb(null, "file_uploads/");
        },
        filename: (req, file, cb) => {
          // Set the filename: summaryId-originalfilename.ext
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
            // Reject the file with an error message
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
          // A Multer error occurred when uploading.
          return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
          // An unknown error occurred.
          return res.status(500).json({ success: false, message: err.message });
        }
    
        // If no file was uploaded (e.g., user submitted form without selecting a file)
        if (!req.file) {
          return res
            .status(400)
            .json({ success: false, message: "No file uploaded." });
        }
    
        try {
          // Find the summary document by its ID
          const summary = await Summary.findById(summaryId);
    
          if (!summary) {
            // If no summary document is found with the given ID
            return res
              .status(404)
              .json({ success: false, message: "Summary not found." });
          }
    
          // Update the summary document with file details
          summary.inputMedium = {
            type: "file", // Set the input medium type to 'file'
            file: {
              filePath: req.file.path, // Path where the file is saved on the server
              name: req.file.originalname, // Original name of the uploaded file
              type: req.file.mimetype, // MIME type of the file
              size: req.file.size, // Size of the file in bytes
            },
          };
    
          // Save the updated summary document
          await summary.save();
    
          res.status(200).json({
            success: true,
            message: "File uploaded and summary updated successfully.",
            summary: summary, // Return the updated summary document
          });
        } catch (dbError) {
          // Handle database errors
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
        const { summaryId } = req.params; // Get summary ID from URL
        const { rating } = req.body; // Get new rating from request body

        // Validate if summaryId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(summaryId)) {
          return res
            .status(400)
            .json({ message: "Invalid Summary ID format." });
        }

        // Basic validation for rating
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

        // 1. Validate User ID Format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid user ID format." });
        }

        // 2. Find the User
        const user = await User.findById(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found." });
        }

        // 3. Validate newAdminStatus (ensure it's a boolean)
        if (typeof adminAccess !== "boolean") {
          return res.status(400).json({
            message: "Invalid value for adminAccess. Must be true or false.",
          });
        }

        // 4. Update the adminAccess field
        user.adminAccess = adminAccess;

        // 5. Save the updated user to the database
        await user.save();

        // 6. Send success response
        // You might want to return a subset of user data, not the whole user object
        // to avoid sending sensitive info back unnecessarily.
        const updatedUser = {
          _id: user._id,
          fullName: user.fullName,
          userName: user.userName,
          email: user.email,
          adminAccess: user.adminAccess,
          // Include other non-sensitive fields you need on the frontend
        };
        res.status(200).json({
          message: "User admin access updated successfully.",
          user: updatedUser,
        });
      } catch (error) {
        // Handle server errors
        console.error("Error updating user admin access:", error);
        res
          .status(500)
          .json({ message: "An error occurred while updating user access." });
      }
    });

    app.get("/analytics", async (req, res) => {
      try {
        const totalSummaries = await Summary.countDocuments();

        const [
          contentStats,
          feedbackDistribution,
          inputMediumStats,
          lengthDistribution,
        ] = await Promise.all([
          // Average word/sentence counts + compression ratio
          Summary.aggregate([
            {
              $project: {
                originalWordCount: "$originalContent.wordCount",
                originalSentenceCount: "$originalContent.sentenceCount",
                summarizedWordCount: "$summarizedContent.wordCount",
                summarizedSentenceCount: "$summarizedContent.sentenceCount",
                compressionRatio: {
                  $cond: [
                    { $eq: ["$originalContent.wordCount", 0] },
                    null,
                    {
                      $divide: [
                        "$summarizedContent.wordCount",
                        "$originalContent.wordCount",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null, // Group all documents into a single group
                avgOriginalWordCount: { $avg: "$originalWordCount" },
                avgOriginalSentenceCount: { $avg: "$originalSentenceCount" },
                avgSummarizedWordCount: { $avg: "$summarizedWordCount" },
                avgSummarizedSentenceCount: {
                  $avg: "$summarizedSentenceCount",
                },
                avgCompressionRatio: { $avg: "$compressionRatio" },
              },
            },
          ]),

          // Feedback distribution (1–5) - MODIFIED to include null feedback
          Summary.aggregate([
            // Removed the $match stage to include documents where feedback is null
            { $group: { _id: "$feedback", count: { $sum: 1 } } }, // Group by feedback value (including null) and count
            { $sort: { _id: 1 } }, // Sort by feedback value
          ]),

          // Input medium type distribution
          Summary.aggregate([
            { $group: { _id: "$inputMedium.type", count: { $sum: 1 } } },
          ]),

          // Length distribution using summaryLength field
          Summary.aggregate([
            { $match: { summaryLength: { $in: [0, 1, 2, 3] } } },
            {
              $group: {
                _id: "$summaryLength",
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
        ]);

        const mappedLengthDistribution = lengthDistribution.map((entry) => ({
          category: entry._id,
          label: lengthLabels[entry._id] || "Unknown",
          count: entry.count,
        }));

        res.json({
          totalSummaries,

          originalContentStats: {
            avgWordCount: contentStats[0]?.avgOriginalWordCount || 0,
            avgSentenceCount: contentStats[0]?.avgOriginalSentenceCount || 0,
            lengthDistribution: mappedLengthDistribution,
          },

          summarizedContentStats: {
            avgWordCount: contentStats[0]?.avgSummarizedWordCount || 0,
            avgSentenceCount: contentStats[0]?.avgSummarizedSentenceCount || 0,
            avgCompressionRatio: contentStats[0]?.avgCompressionRatio || 0,
          },

          feedbackAnalysis: feedbackDistribution.map((f) => ({
            rating: f._id,
            count: f.count,
          })),

          inputMediumDistribution: inputMediumStats.map((i) => ({
            type: i._id,
            count: i.count,
          })),
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch analytics" });
      }
    });

    app.listen(port, () => {
      console.log(`Node.js server running on port ${port}`);
      console.log(`Forwarding requests to Python API at ${PYTHON_API_URL}`);
    });
  })
  .catch((err) => console.log(err));
