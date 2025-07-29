import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "../css/TextSummarizer.css"; // Import the CSS file

let summaryId;

export default function TextSummarizer() {
  const [text, setText] = useState("");
  const [summarizeResult, setSummarizeResult] = useState("");
  const [originalSentencesCount, setOriginalSentencesCount] = useState(0);
  const [summarySentencesCount, setSummarySentencesCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [summaryWordCount, setSummaryWordCount] = useState(0);
  const [keywords, setKeywords] = useState([]);
  const [inputMedium, setInputMedium] = useState("text");
  const [uploadedFile, setUploadedFile] = useState(null); // State to store the File object
  const [uploadStatus, setUploadStatus] = useState("");
  const [originalContentText, setOriginalContentText] = useState(""); // To store the original text for side-by-side display

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create a ref for the summary results container
  const summaryResultsRef = useRef(null);

  const NODE_JS_API_URL = "http://localhost:5000/api"; // This variable is not used in the provided code.

  const loggedInUser = sessionStorage.getItem("login")
    ? sessionStorage.getItem("login")
    : false;

  const summaryOptions = [
    { label: "Very Short", ratio: 0.05, value: "very_short" },
    { label: "Short", ratio: 0.15, value: "short" },
    { label: "Medium", ratio: 0.25, value: "medium" },
    { label: "Long", ratio: 0.40, value: "long" },
  ];

  // default to 'Medium' which is index 2
  const [selectedIndex, setSelectedIndex] = useState(2);

  const selectedOption = summaryOptions[selectedIndex];
  const ratio = selectedOption.ratio;
  const selectedOptionValue = selectedOption.value;

  const handleSliderChange = (event) => {
    setSelectedIndex(parseInt(event.target.value, 10));
  };

  // Effect to scroll to the summary results section when summarizeResult changes
  useEffect(() => {
    if (summarizeResult && summaryResultsRef.current) {
      summaryResultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [summarizeResult]);

  const handleSummarize = async (e) => {
    e.preventDefault();
    if (inputMedium === "text") {
      if (!text.trim()) {
        setError("Please enter some text first.");
        return;
      }
    }
    if (inputMedium === "file") {
      if (!uploadedFile) {
        setError("Please select a file first.");
        return;
      }
    }
    setLoading(true);
    setError("");
    setSummarizeResult("");
    setOriginalSentencesCount(0);
    setSummarySentencesCount(0);
    setWordCount(0);
    setSummaryWordCount(0);
    setKeywords([]);
    setOriginalContentText(""); // Clear previous original text

    let response;
    try {
      if (inputMedium === "text") {
        response = await axios.post(
          "http://localhost:5000/api/extractive-summary",
          { text: text, ratio: ratio, selectedOptionValue: selectedOptionValue }
        );
      } else if (inputMedium === "file") {
        const formData = new FormData();
        formData.append("summaryFile", uploadedFile); // 'summaryFile' must match the name in your Express Multer config
        formData.append("ratio", ratio);
        formData.append("selectedOptionValue", selectedOptionValue);

        response = await axios.post(
          "http://localhost:5000/api/extractive-summary-file",
          formData,
          {
            headers: {
              // This header is CRUCIAL for FormData to work correctly
              // axios often sets this automatically, but explicitly defining it is safer.
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        setError("Select an input medium");
        return;
      }
      setSummarizeResult(response.data.summary);
      setOriginalSentencesCount(response.data.original_length_sentences);
      setSummarySentencesCount(response.data.summary_sentences_count);
      setWordCount(response.data.originalWordCount);
      setSummaryWordCount(response.data.summaryWordCount);
      setKeywords(response.data.keywords);
      setOriginalContentText(response.data.originalContentText); // Set original text

      if (loggedInUser) {
        const summaryData = {
          user_id: loggedInUser,
          originalContent: {
            text: response.data.originalContentText,
            wordCount: response.data.originalWordCount,
            sentenceCount: response.data.original_length_sentences,
          },
          summarizedContent: {
            text: response.data.summary,
            wordCount: response.data.summaryWordCount,
            sentenceCount: response.data.summary_sentences_count,
          },
          keywords: response.data.keywords,
          feedback: selectedRating,
          summaryLength: selectedIndex,
          inputMedium: {
            type: inputMedium,
            // ...(inputMedium === "file" && {
            //   file: {
            //     name: uploadedFile.name,
            //     filePath: `/temp_uploads/${uploadedFile.name}`, // Store the path relative to the server
            //     type: uploadedFile.type,
            //     size: uploadedFile.size,
            //   },
            // }),
            // ...(inputMedium === "image" && {
            //   image: uploadedImage,
            // }),
          },
        };
        try {
          const res = await axios.post(
            "http://localhost:5000/storeSummary",
            summaryData
          );
          summaryId = res.data.summary._id;
          if (inputMedium === "file") {
            const formData = new FormData();
            formData.append("summaryFile", uploadedFile);
            const res2 = await axios.post(
              `http://localhost:5000/storeSummary/file/${summaryId}`,
              formData,
              {
                headers: {
                  // This header is CRUCIAL for FormData to work correctly
                  // axios often sets this automatically, but explicitly defining it is safer.
                  "Content-Type": "multipart/form-data",
                },
              }
            );
          }
          // Using a custom modal/message box instead of alert()
          showCustomMessage(res.data.message);
        } catch (err) {
          console.error(
            "Error saving summary",
            err.response ? err.response.data : err.message
          );
          showCustomMessage(
            `Error saving summary: ${
              err.response ? err.response.data.error : err.message
            }`
          );
        }
      }
    } catch (err) {
      console.error(
        "Error summarizing text:",
        err.response ? err.response.data : err.message
      );
      setError(
        err.response
          ? err.response.data.error || "Failed to summarize text"
          : "Network error"
      );
    } finally {
      setLoading(false);
    }
  };

  const [selectedRating, setSelectedRating] = useState(null);

  const handleRatingChange = (event) => {
    setSelectedRating(parseInt(event.target.value));
  };

  const submitFeedback = async () => {
    console.log("Submit feedback button");
    try {
      const res = await axios.patch(
        `http://localhost:5000/updateSummaryFeedback/${summaryId}`,
        { rating: selectedRating }
      );
      // Using a custom modal/message box instead of alert()
      showCustomMessage(res.data.message);
    } catch (err) {
      console.error(
        "Error saving summary",
        err.response ? err.response.data : err.message
      );
      showCustomMessage(
        `Error submitting feedback: ${
          err.response ? err.response.data.error : err.message
        }`
      );
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0]; // Get the first file
    if (file) {
      setUploadedFile(file); // Store the file object
      setUploadStatus(`File selected: ${file.name}`);
    } else {
      setUploadedFile(null);
      setUploadStatus("No file selected.");
    }
  };

  // Custom message box function
  const showCustomMessage = (message) => {
    const messageBox = document.createElement("div");
    messageBox.className = "custom-message-box";
    messageBox.innerHTML = `
      <div class="custom-message-content">
        <p>${message}</p>
        <button class="custom-message-button">OK</button>
      </div>
    `;
    document.body.appendChild(messageBox);

    messageBox.querySelector(".custom-message-button").onclick = () => {
      document.body.removeChild(messageBox);
    };
  };

  return (
    <div className="App">
      {error && <p className="error-message">Error: {error}</p>}
      {loading && <p className="loading-message">Loading...</p>}

      <section className="summarizer-section">
        <h2>Extractive Summarization</h2>
        <form onSubmit={handleSummarize} className="summarizer-form">
          <div className="input-medium-selector">
            <span
              className={`input-medium-option ${
                inputMedium === "text" ? "active" : ""
              }`}
              onClick={() => {
                setInputMedium("text");
                setText("");
                setError("");
                setUploadedFile(null);
                setUploadStatus("");
              }}
            >
              Text input
            </span>
            <span
              className={`input-medium-option ${
                inputMedium === "file" ? "active" : ""
              }`}
              onClick={() => {
                setInputMedium("file");
                setUploadStatus("");
                setUploadedFile(null);
                setText("");
                setError("");
              }}
            >
              File input
            </span>
          </div>

          {inputMedium === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to summarize"
              rows="8"
              cols="80"
              className="text-input"
            ></textarea>
          )}
          {inputMedium === "file" && (
            <div className="file-input-container">
              <p>Enter .docx, .txt or .pdf</p>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".docx,.pdf,.txt"
                className="file-input"
              />
              {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
            </div>
          )}
          <div className="summary-length-card">
            <h1 className="summary-length-title">Select Summary Length</h1>
            <div className="summary-length-slider-container">
              <label htmlFor="summary-length-slider" className="slider-label">
                Summary Length:{" "}
                <span className="selected-length-label">
                  {selectedOption.label}
                </span>
              </label>
              <input
                type="range"
                id="summary-length-slider"
                min="0" // Corresponds to the first option (Very Short)
                max={summaryOptions.length - 1} // Corresponds to the last option (Long)
                step="1" // Ensure discrete steps
                value={selectedIndex} // Current index of the selected option
                onChange={handleSliderChange}
                className="summary-slider"
              />
            </div>
            <p className="ratio-info">
              This corresponds to a ratio of{" "}
              <span className="ratio-value">{ratio.toFixed(2)}</span> of the
              original text length.
            </p>
          </div>
          <button type="submit" disabled={loading} className="summarize-button">
            Summarize
          </button>
        </form>

        {summarizeResult && (
          <div className="summary-results-container" ref={summaryResultsRef}>
            <div className="content-panel">
              <h4>Original Text:</h4>
              <p className="content-text">{originalContentText}</p>
              <p>Original Text Length: {originalSentencesCount} sentences</p>
              <p>Original word count: {wordCount}</p>
            </div>

            <div className="content-panel">
              <h4>Summary:</h4>
              <p className="content-text">{summarizeResult}</p>
              <p>Summary Length: {summarySentencesCount} sentences</p>
              <p>Summary word count: {summaryWordCount}</p>
              <p>Keywords: </p>
              <ul className="keywords-list">
                {keywords.map((word, index) => (
                  <li key={index}>{word}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {summarizeResult && (
          <div className="feedback-section">
            <h1 className="feedback-title">Rate Your Experience</h1>
            <div className="rating-options">
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="rating-option">
                  <input
                    type="radio"
                    id={`rating-${rating}`}
                    name="feedback-rating"
                    value={rating}
                    checked={selectedRating === rating}
                    onChange={handleRatingChange}
                    className="rating-input"
                  />
                  <label htmlFor={`rating-${rating}`} className="rating-label">
                    {rating}
                  </label>
                  <span className="rating-text">
                    {rating === 1 && "Very Poor"}
                    {rating === 2 && "Poor"}
                    {rating === 3 && "Average"}
                    {rating === 4 && "Good"}
                    {rating === 5 && "Excellent"}
                  </span>
                </div>
              ))}
            </div>

            {selectedRating !== null && (
              <p className="selected-rating-display">
                You have selected:{" "}
                <span className="selected-rating-value">{selectedRating}</span>
              </p>
            )}

            <div>
              <button
                onClick={submitFeedback}
                disabled={selectedRating === null}
                className="submit-feedback-button"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
