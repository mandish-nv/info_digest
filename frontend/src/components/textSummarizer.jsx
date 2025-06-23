import React, { useState } from "react";
import axios from "axios";

export default function TextSummarizer() {
  const [text, setText] = useState("");
  const [summarizeResult, setSummarizeResult] = useState("");
  const [originalSentencesCount, setOriginalSentencesCount] = useState(0);
  const [summarySentencesCount, setSummarySentencesCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const NODE_JS_API_URL = "http://localhost:5000/api";

  const summaryOptions = [
    { label: "Very Short", ratio: 0.1 }, // 10%
    { label: "Short", ratio: 0.25 }, // 25%
    { label: "Medium", ratio: 0.4 }, // 40%
    { label: "Long", ratio: 0.6 }, // 60%
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
    console.log(text);
    if (!text.trim()) {
      setError("Please enter some text first.");
      return;
    }
    setLoading(true);
    setError("");
    setSummarizeResult("");
    setOriginalSentencesCount(0);
    setSummarySentencesCount(0);
    try {
      // const response = await axios.post(
      //   `${NODE_JS_API_URL}/extractive-summary`,
      //   { text },
      //   {
      //     headers: { "Content-Type": "application/json" }
      //   }
      // );
      const response = await axios.post(
        "http://localhost:5000/api/extractive-summary",
        { text: text, ratio: ratio }
      );
      setSummarizeResult(response.data.summary);
      setOriginalSentencesCount(response.data.original_length_sentences);
      setSummarySentencesCount(response.data.summary_sentences_count);
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

  return (
    <div className="App">
      <h1>MERN with FastAPI Integration</h1>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {loading && <p>Loading...</p>}

      <section>
        <h2>Extractive Summarization</h2>
        <form onSubmit={handleSummarize}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to summarize"
            rows="8"
            cols="80"
            required
          ></textarea>
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
          </div>
        )}
      </section>
    </div>
  );
}
