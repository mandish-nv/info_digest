import { useState, useEffect } from "react";
import axios from "axios";
import { Link, Navigate, useNavigate } from "react-router";
import '../css/Login.css';
import StatusBar from "../components/statusBar";

export default function Login({ value }) {
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginInfo, setLoginInfo] = useState({ userName: "", password: "" });
  const [check, setCheck] = useState(false);
  const navigate = useNavigate();

  const isLoggedIn = (sessionStorage.getItem("login") || localStorage.getItem("login")) ? true : false;
  useEffect(() => {
    if (isLoggedIn) {
      sessionStorage.setItem("login", localStorage.getItem("login"));
      navigate('/')
    }
  }, [])

  const handleChange = (event, name) => {
    setLoginInfo({ ...loginInfo, [name]: event.target.value });
    setFormErrors({ ...formErrors, [name]: "" });
  };

  const validateFields = () => {
    const errors = {};
    if (!loginInfo.userName.trim()) errors.userName = "Username is required.";
    if (!loginInfo.password.trim()) errors.password = "Password is required.";
    return errors;
  };

  const login = async (event) => {
    event.preventDefault();
    const errors = validateFields();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
    } else {
      const res1 = await axios.post("http://localhost:5000/login", loginInfo);
      if (res1.data === "Logged in successfully!") {
        console.log("Logged in successfully!");
        const res2 = await axios.get(
          `http://localhost:5000/findUserOrEmail/${loginInfo.userName}`
        );
        const userId = res2.data;
        localStorage.setItem("currentUser", (userId));
        if (check) {
          sessionStorage.setItem("login", (userId));
          localStorage.setItem("login", (userId));
        } else {
          sessionStorage.setItem("login", (userId));
        }
        console.log(userId)
        navigate("/");
      } else if (res1.data === "User not found.") {
        setFormErrors((prevErrors) => ({
          ...prevErrors,
          userName: "User not found.",
        }));
      } else if (res1.data === "Incorrect password.") {
        setFormErrors((prevErrors) => ({
          ...prevErrors,
          password: "Incorrect password.",
        }));
      } else {
        alert("Error occured");
      }
    }
  };

  return (
    <div className="login-container">
      <StatusBar/>
      <form onSubmit={login} className="login-form">
        <h1 className="form-title">Login</h1>
        <div className="form-group">
          <label htmlFor="username">Username or Email:</label>
          <input
            type="text"
            id="username"
            name="username"
            className="form-input"
            value={loginInfo.userName}
            placeholder="Enter Username or Email"
            onChange={(event) => handleChange(event, "userName")}
            style={{width:"470px"}}
          />
          <div className="error-message">{formErrors.userName}</div>
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <div className="password-input-group">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              className="form-input"
              value={loginInfo.password}
              onChange={(e) => handleChange(e, "password")}
            />
            <button
              type="button"
              className="show-password-btn"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="error-message">{formErrors.password}</div>
        </div>
        {/* 
        <div className="form-group remember-me-group">
          <input
            type="checkbox"
            id="rememberMe"
            name="remember"
            checked={check}
            onChange={() => setCheck(!check)}
          />
          <label htmlFor="rememberMe" className="login-text">Remember Me</label>
        </div> */}
        <button type="submit" className="submit-btn">
          Submit
        </button>
        <p className="register-prompt">Don't have an account?</p>
        <Link to={"/register"} className="register-link">
          Register
        </Link>
      </form>
    </div>
  );
}