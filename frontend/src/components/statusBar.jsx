import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/StatusBar.css"; // Import the CSS file

export default function StatusBar() {
  const userId =
    sessionStorage.getItem("login") || localStorage.getItem("login") || null;
  const [adminAccessFlag, setAdminAccessFlag] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(userId);
  const [userName, setUserName] = useState('Loading...');
  const [error, setError] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    const currentLoginId = sessionStorage.getItem("login") || localStorage.getItem("login")

    if (currentLoginId) {
      localStorage.setItem("currentUser", currentLoginId);
      sessionStorage.setItem("login", currentLoginId)
    } else {
      localStorage.removeItem("currentUser");
    }
  }, []);

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
    // Only call checkAdminStatus if loggedInUser changes or on initial render
    checkAdminStatus();
  }, [loggedInUser]); // Dependency array includes loggedInUser

    useEffect(() => {
    const sync = () => {
      const current = sessionStorage.getItem("login") || localStorage.getItem("login"); // Get current from either

      if (current) {
        // keep both stores in sync
        sessionStorage.setItem("login", current);
        localStorage.setItem("login", current);
      } else {
        // clear both if user logged out
        sessionStorage.removeItem("login");
        localStorage.removeItem("login");
      }

      setLoggedInUser(current); // triggers re‑render when needed
    };

    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []); // Empty dependency array means this runs once on mount and cleanup on unmount


  useEffect(() => {
    const fetchUserName = async () => {
      // Reset state for new fetch
      setUserName('Loading...');
      setError(null);

      // Check if the userId is available before making the API call
      if (!userId) {
        setError('User ID not found.');
        setUserName('Guest');
        return;
      }

      try {
        // Construct the API URL with the userId
        const apiUrl = `http://localhost:5000/users/${userId}/name`;
        
        // Make the GET request to the backend
        const response = await axios.get(apiUrl);
        
        // Update the state with the name from the response data
        if (response.data && response.data.name) {
          setUserName(response.data.name);
        } else {
          setError('Invalid response from server.');
          setUserName('User'); // Fallback name
        }
      } catch (err) {
        // Handle errors and update the state accordingly
        console.error('Failed to fetch user name:', err);
        setError('Failed to load user name.');
        setUserName('User'); // Fallback name on error
      }
    };

    fetchUserName();
  }, [userId]); // The effect re-runs whenever the userId changes



  const logOut = () => {
    sessionStorage.removeItem("login");
    localStorage.removeItem("login");
    localStorage.removeItem("currentUser");
    setLoggedInUser(null);
    navigate("/");
  };

  return (
    <div className="status-bar">
      <h1>
        <Link to="/">InfoDigest</Link>
      </h1>

      <div className="status-bar-links">
        {adminAccessFlag && (
          <Link to="/adminPanel">Admin Panel</Link>
        )}
        {loggedInUser && (
          <Link to="/profile">User Profile</Link>
        )}
      </div>

      <div className="status-bar-user-status">
        <div className="status-bar-logout-section" style={{ display: loggedInUser ? "flex" : "none" }}>
          <p>Welcome, {userName}</p>
          <button onClick={logOut}>Log out</button>
        </div>

        <div className="status-bar-logout-section" style={{ display: loggedInUser ? "none" : "flex" }}>
          <p>Guest</p>
        </div>

        <div className="status-bar-auth-links" style={{ display: loggedInUser ? "none" : "flex", flexDirection: 'column' }}>
          <Link to={"/register"}>Register</Link>
          <Link to={"/login"}>Log in</Link>
        </div>
      </div>
    </div>
  );
}