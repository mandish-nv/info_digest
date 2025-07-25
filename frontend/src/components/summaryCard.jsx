import React, { useState } from 'react';

function SummaryCard({ summary }) {
  const [showPopup, setShowPopup] = useState(false);

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  return (
    <div className="summary-card"> 
      <p>
        <span>Summary ID:</span> {summary._id}
      </p>
      <div>
        <p>Original Content:</p>
        {summary.inputMedium.type === "text" && (
          <p>{summary.originalContent.text}</p>
        )}
        {summary.inputMedium.type === "file" && (
          <div>
            <button onClick={togglePopup}>File</button>
            <p>{summary.inputMedium.file.name}</p>

            {showPopup && (
              <div
                className="popup-overlay"
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  backdropFilter: "blur(5px)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                }}
              >
                <div
                  className="popup-content"
                  style={{
                    backgroundColor: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                    position: "relative",
                    maxWidth: "500px",
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                >
                  <button
                    onClick={togglePopup}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "none",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      color: "#333",
                    }}
                  >
                    X
                  </button>
                  <h3>Original Content</h3>
                  <p>{summary.originalContent.text}</p>
                </div>
              </div>
            )}
          </div>
        )}
        <p>
          Words: {summary.originalContent.wordCount}, Sentences:{" "}
          {summary.originalContent.sentenceCount}
        </p>
      </div>
      <div>
        <p>Summarized Content:</p>
        <p>{summary.summarizedContent.text}</p>
        <p>
          Words: {summary.summarizedContent.wordCount}, Sentences:{" "}
          {summary.summarizedContent.sentenceCount}
        </p>
      </div>
      {summary.keywords && summary.keywords.length > 0 && (
        <p>
          <span>Keywords:</span> {summary.keywords.join(", ")}
        </p>
      )}
      <p>
        Created At:{" "}
        {new Date(summary.createdAt).toLocaleDateString()}
      </p>
      <hr />
    </div>
  );
}

export default SummaryCard;