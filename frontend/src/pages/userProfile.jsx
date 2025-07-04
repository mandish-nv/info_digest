// current user and admin can view

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import StatusBar from "../components/statusBar";

export default function UserProfile() {
  const { id } = useParams(); // Get ID from URL (e.g., /profile/123)
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminAccessFlag, setAdminAccessFlag] = useState(false);

  // Get the current logged-in user's ID from sessionStorage
  const loggedInUser = sessionStorage.getItem("login");

  useEffect(() => {
    const currentLoginId = sessionStorage.getItem("login") || localStorage.getItem("login")

    if (currentLoginId) {
      localStorage.setItem("currentUser", currentLoginId);
      sessionStorage.setItem("login", currentLoginId)
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
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      let profileIdToFetch = null;
      const loggedInUser = sessionStorage.getItem("login")||localStorage.getItem("login");
      if (loggedInUser) {
        localStorage.setItem("currentUser", loggedInUser);
        sessionStorage.setItem("login", loggedInUser)
      } else {
        localStorage.removeItem("currentUser");
      }

      // Determine which ID to use: URL param first, then logged-in user
      if (id) {
        // admin ho ki nai check
        if(id === loggedInUser){
          profileIdToFetch = loggedInUser;
        } else{
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
        const response = await axios.get(
          `http://localhost:5000/findById/${profileIdToFetch}`
        );
        setUserProfile(response.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError("User not found.");
        } else {
          setError("Failed to fetch user profile. Please try again later.");
          console.error("Error fetching user profile:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id, adminAccessFlag]); // Re-run effect if URL ID or loggedInUser changes

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
  );
}
