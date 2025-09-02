import React from "react";
import "../css/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-about">
          <h3 className="footer-title">InfoDigest</h3>
          <p className="footer-description">
            InfoDigest is a summarization platform for generating concise summaries.
          </p>
        </div>

        <div className="footer-links">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-list">
            <li className="footer-item"><a href="/" className="footer-link">Home</a></li>
            <li className="footer-item">About</li>
            <li className="footer-item">Contact</li>
            <li className="footer-item">Privacy Policy</li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4 className="footer-heading">Contact Us</h4>
          <p className="footer-text">Email: support@infodigest.com</p>
          <p className="footer-text">Phone: +977-1234567890</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">
          © {new Date().getFullYear()} InfoDigest. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
