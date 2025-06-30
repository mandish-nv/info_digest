const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const axios = require("axios"); // For making HTTP requests to FastAPI

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000"; // FastAPI URL

const User = require("./models/user");
const Summary = require("./models/summary")

// const crypto = require("crypto");
// const dotenv = require("dotenv");
// const path=require("path")
// dotenv.config();
// const algorithm = "aes-256-cbc";
// const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

const port = 5000;

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
const URL = "mongodb://localhost:27017/omni_digest";
app.use(express.json());
app.use(cors());

mongoose
  .connect(URL)
  .then(() => {
    app.get("/", (req, res) => {
      res.send("Mongo Connected");
    });

    // Proxy route for greeting
    app.post("/api/extractive-summary", async (req, res) => {
      try {
        const text  = req.body.text;
        const  ratio  = req.body.ratio;
        if (!text) {
          return res.status(400).json({ error: "Text is required(Express)" });
        }
        const pythonResponse = await axios.post(
          `${PYTHON_API_URL}/api/extractive-summary`,
          {
            text: text,
            ratio: ratio
          }
        );
        res.json(pythonResponse.data);
      } catch (error) {
        console.error("Error calling Python greet API:", error.message);

        if (error.response) {
          console.error("Response data from Python API:", error.response.data);
          res.status(error.response.status).json(error.response.data);
        } else {
          res
            .status(500)
            .json({
              error: "Failed to communicate with Python summarizer service",
            });
        }
      }
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

    app.post("/findById", async (req, res) => {
      const id = req.body.id; // Extract the 'id' from the request body

      if (!id) {
        return res.status(400).send({ message: "ID is required" });
      }

      try {
        // Use 'findById' to find the user by '_id'
        const userData = await User.findById(id);

        // If user is not found, return a 404 response
        if (!userData) {
          return res.status(404).send({ message: "User not found" });
        }

        // Send the found user data as response
        res.send(userData);
      } catch (error) {
        // Handle errors (for example, invalid 'id' format or database issues)
        console.error("Error finding user:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post('/storeSummary', async (req, res) => {
      try {
        const summaryData = req.body; // Data sent from your frontend
    
        // Basic validation (Mongoose schema also handles much of this,
        // but you can add more specific checks here if needed before saving)
        if (!summaryData.user_id || !summaryData.originalContent || !summaryData.summarizedContent) {
          return res.status(400).json({ message: 'Missing required summary data.' });
        }
    
        // Create a new Summary document using the model
        const newSummary = new Summary(summaryData);
    
        // Save the document to the database
        const savedSummary = await newSummary.save();
    
        console.log('Summary saved successfully:', savedSummary);
        res.status(200).json({
          message: 'Summary stored successfully!',
          summary: savedSummary
        });
    
      } catch (error) {
        // Handle validation errors or other database errors
        if (error.name === 'ValidationError') {
          console.error('Validation Error:', error.message);
          return res.status(400).json({
            message: 'Validation failed',
            errors: error.errors // Mongoose validation errors
          });
        }
        console.error('Error saving summary:', error);
        res.status(500).json({
          message: 'Internal server error',
          error: error.message
        });
      }
    });

    app.patch('/updateSummaryFeedback/:summaryId', async (req, res) => {
      try {
        const { summaryId } = req.params; // Get summary ID from URL
        const { rating } = req.body;     // Get new rating from request body
    
        // Validate if summaryId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(summaryId)) {
          return res.status(400).json({ message: 'Invalid Summary ID format.' });
        }
    
        // Basic validation for rating
        if (rating === undefined || rating === null || typeof rating !== 'number' || rating < 1 || rating > 5) {
          return res.status(400).json({ message: 'Valid rating (1-5) is required.' });
        }
    
        // Find the summary by ID and update the feedback field
        const updatedSummary = await Summary.findByIdAndUpdate(
          summaryId,
          { $set: { feedback: rating } }, // Use $set to update only the feedback field
          { new: true, runValidators: true } // Return the updated document, run schema validators
        );
    
        if (!updatedSummary) {
          return res.status(404).json({ message: 'Summary not found.' });
        }
    
        console.log('Summary feedback updated successfully:', updatedSummary);
        res.status(200).json({
          message: 'Summary feedback updated successfully!',
          summary: updatedSummary
        });
    
      } catch (error) {
        if (error.name === 'ValidationError') {
          console.error('Validation Error updating summary feedback:', error.message);
          return res.status(400).json({
            message: 'Validation failed for summary feedback update',
            errors: error.errors
          });
        }
        console.error('Error updating summary feedback:', error);
        res.status(500).json({
          message: 'Internal server error while updating summary feedback',
          error: error.message
        });
      }
    });





    // user profile display
    app.get("/profile/:id", async (req, res) => {
      try {
        const userId = req.params.id; // Use `id` instead of `slug`

        // Validate MongoDB ObjectId (to prevent errors)
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }

        const user = await User.findById(userId); // Use `findById` for efficiency

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

    app.post("/changePassword", async (req, res) => {
      const id = req.body._id;
      const password = req.body.password;
      const saltRounds = 10;
      const newPassword = await bcrypt.hash(password, saltRounds);
      try {
        await User.updateOne(
          { _id: id },
          {
            $set: { password: newPassword },
          }
        );

        res.send("Success");
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.listen(port, () => {
      console.log(`Node.js server running on port ${port}`);
      console.log(`Forwarding requests to Python API at ${PYTHON_API_URL}`);
    });
  })
  .catch((err) => console.log(err));
