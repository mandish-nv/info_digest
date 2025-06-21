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

  const handleSummarize = async (e) => {
    e.preventDefault();
    console.log(text)
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
      const response = await axios.post("http://localhost:5000/api/extractive-summary", {text: text});
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
