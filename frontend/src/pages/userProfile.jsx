import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import StatusBar from "../components/statusBar";
import SummaryCard from "../components/summaryCard";

import "../css/userProfile.css"; // Ensure this import is present
import Footer from "../components/footer";

export default function UserProfile() {
  const { id } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [adminAccessFlag, setAdminAccessFlag] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  const loggedInUser = sessionStorage.getItem("login");

  useEffect(() => {
    const currentLoginId =
      sessionStorage.getItem("login") || localStorage.getItem("login");

    if (currentLoginId) {
      localStorage.setItem("currentUser", currentLoginId);
      sessionStorage.setItem("login", currentLoginId);
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [loggedInUser]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (loggedInUser) {
          const res = await axios.get(
            `http://localhost:5000/adminStatus/${loggedInUser}`
          );
          setAdminAccessFlag(res.data);
        } else {
          setAdminAccessFlag(false);
          console.log("Not logged in");
        }
      } catch (error) {
        console.error("Error fetching admin status:", error);
        setAdminAccessFlag(false);
      }
    };
    checkAdminStatus();
  }, [loggedInUser]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      setSummaryError(null);
      let profileIdToFetch = null;
      const loggedInUser =
        sessionStorage.getItem("login") || localStorage.getItem("login");
      if (loggedInUser) {
        localStorage.setItem("currentUser", loggedInUser);
        sessionStorage.setItem("login", loggedInUser);
      } else {
        localStorage.removeItem("currentUser");
      }

      if (id) {
        if (id === loggedInUser) {
          profileIdToFetch = loggedInUser;
        } else {
          profileIdToFetch = id;
          if (!adminAccessFlag) {
            setError("You are not authorized to view this page.");
            setLoading(false);
            return;
          }
        }
      } else if (loggedInUser) {
        profileIdToFetch = loggedInUser;
      } else {
        setError("No user ID provided or logged in to display a profile.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const profileResponse = await axios.get(
          `http://localhost:5000/findById/${profileIdToFetch}`
        );
        setUserProfile(profileResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "An unexpected error occurred."
        );
      } finally {
        setLoading(false);
      }

      try {
        setLoading(true);
        setError(null);
        setSummaryError(null);
        const summariesResponse = await axios.get(
          `http://localhost:5000/retrieveSummary/${profileIdToFetch}`
        );
        setSummaries(summariesResponse.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Corrected access to status
          setSummaryError("No summary available");
        } else {
          setSummaryError(
            "An unexpected error occurred while retrieving summary."
          );
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [adminAccessFlag, id]);

  if (loading) {
    return <div className="user-profile-loading">Loading user profile...</div>;
  }

  if (error) {
    return <div className="user-profile-error">Error: {error}</div>;
  }

  if (!userProfile) {
    return (
      <div className="user-profile-no-data">
        No user profile data available.
      </div>
    );
  }

  return (
    <div>
    <div className="user-profile-container-main">
      <StatusBar />
      <div className="user-profile-container">
        <h2 className="user-profile-heading">User Profile</h2>
        <div className="user-profile-details">
          {userProfile.profilePicture && (
            <div className="user-profile-picture-container">
              <img
                src={userProfile.profilePicture}
                alt="Profile"
                className="user-profile-picture"
              />
            </div>
          )}
          <div>
            <p className="user-profile-item">
              <strong>Full Name:</strong> {userProfile.fullName}
            </p>
            <p className="user-profile-item">
              <strong>Username:</strong> {userProfile.userName}
            </p>
            <p className="user-profile-item">
              <strong>Email:</strong> {userProfile.email}
            </p>
            <p className="user-profile-item">
              <strong>Gender:</strong> {userProfile.gender}
            </p>
            <p className="user-profile-item">
              <strong>Date of Birth:</strong>{" "}
              {new Date(userProfile.dob).toLocaleDateString()}
            </p>
            <p className="user-profile-item">
              <strong>Registered On:</strong>{" "}
              {new Date(userProfile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="user-profile-history">
          <h2 className="user-profile-history-heading">History</h2>
          {summaryError && <div className="summary-error">{summaryError}</div>}
          {summaries.length > 0 && (
            <div className="user-profile-summaries">
              <h3 className="user-profile-summaries-found">Summaries Found:</h3>
              <div className="summary-cards-grid">
                {summaries.map((summary) => (
                  <SummaryCard key={summary._id} summary={summary} />
                ))}
              </div>
            </div>
          )}
          {summaries.length === 0 && !summaryError && (
            <p className="no-summaries-message">No summaries available yet.</p>
          )}
        </div>
      </div>
      </div>
      <Footer/>
    </div>
  );
}
