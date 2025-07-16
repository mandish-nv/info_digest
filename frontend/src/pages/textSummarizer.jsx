import React, { useState } from "react";
import axios from "axios";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const NODE_JS_API_URL = "http://localhost:5000/api";

  const loggedInUser = sessionStorage.getItem("login")
    ? sessionStorage.getItem("login")
    : false;

  const summaryOptions = [
    { label: "Very Short", ratio: 0.05 }, // 5%
    { label: "Short", ratio: 0.15 }, // 25%
    { label: "Medium", ratio: 0.25 }, // 25%
    { label: "Long", ratio: 0.40 }, // 40%
  ];

  // Initialize the state to store the index of the selected option (default to 'Medium' which is index 2)
  const [selectedIndex, setSelectedIndex] = useState(2);

  // Get the currently selected option based on the index
  const selectedOption = summaryOptions[selectedIndex];
  const ratio = selectedOption.ratio; // The actual ratio value

  // Handle changes to the slider input
  const handleSliderChange = (event) => {
    // Update the state with the new index from the slider
    setSelectedIndex(parseInt(event.target.value, 10));
  };

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
        setError("Please enter a file first.");
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
    let response;
    try {
      if (inputMedium === "text") {
        response = await axios.post(
          "http://localhost:5000/api/extractive-summary",
          { text: text, ratio: ratio }
        );
      } else if (inputMedium === "file") {
        const formData = new FormData();
        formData.append("summaryFile", uploadedFile); // 'summaryFile' must match the name in your Express Multer config
        formData.append("ratio", ratio); // Append the ratio as well

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
          if(inputMedium==="file"){
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
          alert(res.data.message);
        } catch (err) {
          console.error(
            "Error saving summary",
            err.response ? err.response.data : err.message
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

  const [selectedRating, setSelectedRating] = useState(null); // State to store the selected rating

  // Function to handle rating change
  const handleRatingChange = (event) => {
    setSelectedRating(parseInt(event.target.value)); // Convert the value to an integer
  };

  const submitFeedback = async () => {
    console.log("Submit feedback button");
    try {
      const res = await axios.patch(
        `http://localhost:5000/updateSummaryFeedback/${summaryId}`,
        { rating: selectedRating }
      );
      alert(res.data.message);
    } catch (err) {
      console.error(
        "Error saving summary",
        err.response ? err.response.data : err.message
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

  return (
    <div className="App">
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {loading && <p>Loading...</p>}

      <section>
        <h2>Extractive Summarization</h2>
        <form onSubmit={handleSummarize}>
          <span
            onClick={() => {
              setInputMedium("text");
              setText("");
              setError("");
            }}
          >
            Text input
          </span>
          <br />
          <span
            onClick={() => {
              setInputMedium("file");
              setUploadStatus("");
              setUploadedFile(null);
              setError("");
            }}
          >
            File input
          </span>
          <br />
          {inputMedium === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to summarize"
              rows="8"
              cols="80"
            ></textarea>
          )}
          {inputMedium === "file" && (
            <div>
              <p>Enter .docx, .txt or .pdf</p>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".docx,.pdf,.txt"
              />
              {uploadStatus && <p>{uploadStatus}</p>}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              fontFamily: "sans-serif", // Fallback for no specific font
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "32px",
                borderRadius: "12px",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                width: "100%",
                maxWidth: "448px", // Equivalent to max-w-md
              }}
            >
              <h1
                style={{
                  fontSize: "24px", // Equivalent to text-3xl
                  fontWeight: "bold",
                  color: "#1a202c", // Equivalent to gray-800
                  marginBottom: "24px", // Equivalent to mb-6
                  textAlign: "center",
                }}
              >
                Select Summary Length
              </h1>

              <div
                style={{
                  marginBottom: "32px", // Equivalent to mb-8
                }}
              >
                <label
                  htmlFor="summary-length-slider"
                  style={{
                    display: "block",
                    color: "#4a5568", // Equivalent to gray-700
                    fontSize: "18px", // Equivalent to text-lg
                    fontWeight: "500", // Equivalent to font-medium
                    marginBottom: "12px", // Equivalent to mb-3
                    textAlign: "center",
                  }}
                >
                  Summary Length:{" "}
                  <span
                    style={{
                      color: "#4c51bf", // Equivalent to indigo-600
                      fontWeight: "600", // Equivalent to font-semibold
                    }}
                  >
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
                  onChange={handleSliderChange} // Event handler for changes
                  style={{
                    width: "100%",
                    height: "12px", // Equivalent to h-3
                    backgroundColor: "#a3bffa", // Equivalent to indigo-200
                    borderRadius: "8px", // Equivalent to rounded-lg
                    appearance: "none", // Reset default browser styling
                    cursor: "pointer",
                  }}
                  // Note: Direct styling of thumb is complex/inconsistent without CSS,
                  // so pseudo-elements like `::-webkit-slider-thumb` cannot be used directly in inline style.
                  // This is a limitation when explicitly removing CSS classes.
                />
              </div>

              <p
                style={{
                  color: "#718096", // Equivalent to gray-600
                  fontSize: "14px", // Equivalent to text-sm
                  textAlign: "center",
                }}
              >
                This corresponds to a ratio of{" "}
                <span
                  style={{
                    fontWeight: "600", // Equivalent to font-semibold
                    color: "#1a202c", // Equivalent to gray-800
                  }}
                >
                  {ratio.toFixed(2)}
                </span>{" "}
                of the original text length.
              </p>

              {/* The 'ratio' variable can now be used for summarization logic */}
              {console.log("Selected ratio for summarization:", ratio)}
            </div>
          </div>
          <button type="submit" disabled={loading}>
            Summarize
          </button>
        </form>
        {summarizeResult && (
          <div>
            <h4>Summary:</h4>
            <p>{summarizeResult}</p>
            <p>Original Text Length: {originalSentencesCount} sentences</p>
            <p>Summary Length: {summarySentencesCount} sentences</p>
            <p>Original word count: {wordCount}</p>
            <p>Summary word count: {summaryWordCount}</p>
            <p>Keywords: </p>
            <ul>
              {keywords.map((word, index) => (
                <li key={word}>{word}</li>
              ))}
            </ul>
            <div>
              <h1>Rate Your Experience</h1>

              {/* Feedback form */}
              <div>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating}>
                    <input
                      type="radio"
                      id={`rating-${rating}`}
                      name="feedback-rating"
                      value={rating}
                      checked={selectedRating === rating}
                      onChange={handleRatingChange}
                    />
                    <label htmlFor={`rating-${rating}`}>{rating}</label>
                    <span>
                      {rating === 1 && "Very Poor"}
                      {rating === 2 && "Poor"}
                      {rating === 3 && "Average"}
                      {rating === 4 && "Good"}
                      {rating === 5 && "Excellent"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Display selected rating */}
              {selectedRating !== null && (
                <p>
                  You have selected: <span>{selectedRating}</span>
                </p>
              )}

              <div>
                <button
                  onClick={() => submitFeedback()}
                  disabled={selectedRating === null}
                  style={{
                    backgroundColor:
                      selectedRating === null ? "#ccc" : "#4CAF50", // Gray if disabled, green otherwise
                    color: "white",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: selectedRating === null ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    marginTop: "20px",
                  }}
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
