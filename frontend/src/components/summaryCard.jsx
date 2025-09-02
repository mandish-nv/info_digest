import React, { useState, useEffect } from 'react';
import '../css/SummaryCard.css';

function SummaryCard({ summary }) {
  const [showPopup, setShowPopup] = useState(false);

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

   useEffect(() => {
   if (showPopup) {
     document.body.style.overflow = 'hidden';
   } else {
     document.body.style.overflow = 'auto';
   }

   return () => {
     document.body.style.overflow = 'auto'; // Clean up on unmount
   };
 }, [showPopup]);

  return (
    <div className="summary-card">
      <div className="summary-header">
        <p>
          <span className="summary-label">Summary ID:</span> {summary._id}
        </p>
      </div>
      <hr className="divider" />
      <div className="summary-content-section">
        <h3 className="section-title">Original Content:</h3>
        {summary.inputMedium.type === "text" && (
          <p className="content-text">{summary.originalContent.text}</p>
        )}
        {summary.inputMedium.type === "file" && (
          <div className="file-content">
            {/* <button onClick={togglePopup} className="file-button">View File Content</button> */}
            <p className="file-name">{summary.inputMedium.file.name}</p>

            {showPopup && (
              <div
                className="popup-overlay"
                onClick={togglePopup}
              >
                <div
                  className="popup-content"
                  onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the popup
                >
                  <button onClick={togglePopup} className="close-popup-button">
                    &times;
                  </button>
                  <h3 className="popup-title">Original Content</h3>
                  <p className="popup-text">{summary.originalContent.text}</p>
                </div>
              </div>
            )}
          </div>
        )}
        <p className="content-stats">
          <span className="stat-label">Words:</span> {summary.originalContent.wordCount}, <span className="stat-label">Sentences:</span>
          {summary.originalContent.sentenceCount}
        </p>
      </div>
      <hr className="divider" />
      <div className="summary-content-section">
        <h3 className="section-title">Summarized Content:</h3>
        <p className="content-text">{summary.summarizedContent.text}</p>
        <p className="content-stats">
          <span className="stat-label">Words:</span> {summary.summarizedContent.wordCount}, <span className="stat-label">Sentences:</span>
          {summary.summarizedContent.sentenceCount}
        </p>
      </div>
      <hr className="divider" />
      {summary.keywords && summary.keywords.length > 0 && (
        <p className="keywords-container">
          <span className="summary-label">Keywords:</span> {summary.keywords.join(", ")}
        </p>
      )}
      <p className="creation-date">
        <span className="summary-label">Created At:</span>
        {new Date(summary.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

export default SummaryCard;