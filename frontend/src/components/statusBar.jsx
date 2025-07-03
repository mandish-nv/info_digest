//retrieve all data and check seperately for admin access
//fix display issue for adminStatus and userProfile

import { Link } from "react-router-dom";
import LoggedInStatus from "../pages/loggedInStatus";
import { useEffect, useState } from "react";
import axios from "axios"; 

export default function StatusBar() {
  const [adminAccessFlag, setAdminAccessFlag] = useState(false);
  const loggedInUser = sessionStorage.getItem("login")
    ? sessionStorage.getItem("login")
    : false;

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

  return (
    <div style={{ display: "flex", backgroundColor: "green" }}>
      <h1><Link to="/">OmniDigest</Link></h1>
      {adminAccessFlag && (
        <div>
          <Link to="/adminPanel">Admin Panel</Link>
        </div>
      )}
      {loggedInUser?(<div>
      <Link to="/profile">
        User Profile
        </Link>
      </div>):("")}
      <LoggedInStatus />
    </div>
  );
} 