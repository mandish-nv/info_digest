import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const getLogin = () =>
  sessionStorage.getItem("login") || localStorage.getItem("login") || null;

export default function LoggedInStatus() {
  const navigate = useNavigate();

   // 1 – state comes from whichever store currently holds “login”
   const [loggedInUser, setLoggedInUser] = useState(getLogin);

   // 2 – combined effect: on mount AND whenever any tab changes storage
   useEffect(() => {
     const sync = () => {
       const current = getLogin();
 
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
 
     sync();                              // run once on mount
     window.addEventListener("storage", sync);
     return () => window.removeEventListener("storage", sync);
   }, []);
  
  const logOut = () => {
    sessionStorage.removeItem("login");
    localStorage.removeItem("login");
    setLoggedInUser(null);          
    navigate("/");                  
  };

  

  return (
    <div>
      <p>LoggedInStatus:</p>

      <div style={{ display:  loggedInUser  ? "block" : "none" }}>
        <p>Logged in: </p>
        <p>{loggedInUser}</p>
        <button onClick={() => logOut()}>Log out</button>
      </div>

      <br />

      <div style={{ display:  loggedInUser  ? "none" : "block" }}>
        <Link to={"/register"}>Register</Link>
        <br />
        <Link to={"/login"}>Log in</Link>
      </div>
      <br />
    </div>
  );
}
