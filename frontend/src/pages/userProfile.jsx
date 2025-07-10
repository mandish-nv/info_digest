// current user and admin can view

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import StatusBar from "../components/statusBar";
import SummaryCard from "../components/summaryCard";

export default function UserProfile() {
  const { id } = useParams(); // Get ID from URL (e.g., /profile/123)
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

  // Get the current logged-in user's ID from sessionStorage
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
        // No ID available to fetch a profile
        setError("No user ID provided or logged in to display a profile.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true); // Indicate loading has started
        setError(null); // Clear any previous errors

        // Fetch user profile
        const profileResponse = await axios.get(
          `http://localhost:5000/findById/${profileIdToFetch}`
        );
        setUserProfile(profileResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err.response || err.message || "An unexpected error occurred."
        );
      } finally {
        setLoading(false); // Set loading to false once all requests are complete
      }

      try {
        setLoading(true); // Indicate loading has started
        setError(null); // Clear any previous errors
        setSummaryError(null);
        const summariesResponse = await axios.get(
          `http://localhost:5000/retrieveSummary/${profileIdToFetch}`
        );
        setSummaries(summariesResponse.data);
      } catch (err) {
        if (err.status == "404") {
          setSummaryError("No summary available");
        } else {
          setSummaryError(
            "An unexpected error occurred while retrieving summary."
          );
        }
      } finally {
        setLoading(false); // Set loading to false once all requests are complete
      }
    };
    fetchUserProfile();
  }, [adminAccessFlag, id]);

  if (loading) {
    return <div>Loading user profile...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!userProfile) {
    return <div>No user profile data available.</div>;
  }

  return (
    <div>
      <StatusBar />
      <h2>User Profile</h2>
      <div>
        <p>
          <strong>Full Name:</strong> {userProfile.fullName}
        </p>
        <p>
          <strong>Username:</strong> {userProfile.userName}
        </p>
        <p>
          <strong>Email:</strong> {userProfile.email}
        </p>
        <p>
          <strong>Gender:</strong> {userProfile.gender}
        </p>
        <p>
          <strong>Date of Birth:</strong>{" "}
          {new Date(userProfile.dob).toLocaleDateString()}
        </p>
        <p>
          <strong>Registered On:</strong>{" "}
          {new Date(userProfile.createdAt).toLocaleDateString()}
        </p>
        {userProfile.profilePicture && (
          <div>
            <strong>Profile Picture:</strong>
            <br />
            <img
              src={userProfile.profilePicture}
              alt="Profile"
              width="150"
              height="150"
            />
          </div>
        )}
      </div>
      <div>
        <h2>History</h2>
        <div>{summaryError}</div>
        {summaries.length > 0 && (
          <div>
            <h2>Summaries Found:</h2>
            <div>
              {summaries.map((summary) => (
                // Each SummaryCard instance now has its own isolated state for the popup
                <SummaryCard key={summary._id} summary={summary} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
