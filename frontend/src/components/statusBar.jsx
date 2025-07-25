import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function StatusBar() {
  const userId =
    sessionStorage.getItem("login") || localStorage.getItem("login") || null;
  const [adminAccessFlag, setAdminAccessFlag] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(userId);
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
    checkAdminStatus();
  }, []);

  useEffect(() => {
    const sync = () => {
      const current = userId;

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
  }, []);

  const logOut = () => {
    sessionStorage.removeItem("login");
    localStorage.removeItem("login");
    localStorage.removeItem("currentUser");
    setLoggedInUser(null);
    navigate("/");
  };

  return (
    <div style={{ display: "flex", backgroundColor: "green" }}>
      <h1>
        <Link to="/">OmniDigest</Link>
      </h1>
      {adminAccessFlag && (
        <div>
          <Link to="/adminPanel">Admin Panel</Link>
        </div>
      )}
      {loggedInUser ? (
        <div>
          <Link to="/profile">User Profile</Link>
        </div>
      ) : (
        ""
      )}

      {/* Logged in status */}
      <div>
        <p>LoggedInStatus:</p>

        <div style={{ display: loggedInUser ? "block" : "none" }}>
          <p>Logged in: </p>
          <p>{loggedInUser}</p>
          <button onClick={() => logOut()}>Log out</button>
        </div>

        <br />

        <div style={{ display: loggedInUser ? "none" : "block" }}>
          <Link to={"/register"}>Register</Link>
          <br />
          <Link to={"/login"}>Log in</Link>
        </div>
        <br />
      </div>
    </div>
  );
}
