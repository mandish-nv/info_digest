// current user and admin can view

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import StatusBar from '../components/statusBar';

export default function UserProfile() {
  const { id } = useParams(); // Get ID from URL (e.g., /profile/123)
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the current logged-in user's ID from sessionStorage
  const loggedInUser = sessionStorage.getItem("login");

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      let profileIdToFetch = null;

      
      
      // Determine which ID to use: URL param first, then logged-in user
      if (id) {
        profileIdToFetch = id;
      } else if (loggedInUser) {
        profileIdToFetch = loggedInUser;
      } else {
        // No ID available to fetch a profile
        setError("No user ID provided or logged in to display a profile.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/findById/${profileIdToFetch}`);
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
  }, [id, loggedInUser]); // Re-run effect if URL ID or loggedInUser changes

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
      <StatusBar/>
      <h2>User Profile</h2>
      <p><strong>Full Name:</strong> {userProfile.fullName}</p>
      <p><strong>Username:</strong> {userProfile.userName}</p>
      <p><strong>Email:</strong> {userProfile.email}</p>
      <p><strong>Gender:</strong> {userProfile.gender}</p>
      <p><strong>Date of Birth:</strong> {new Date(userProfile.dob).toLocaleDateString()}</p>
      <p><strong>Registered On:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
      {userProfile.profilePicture && (
        <div>
          <strong>Profile Picture:</strong><br />
          <img src={userProfile.profilePicture} alt="Profile" width="150" height="150" />
        </div>
      )}
    </div>
  );
}

