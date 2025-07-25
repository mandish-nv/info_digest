import { useState, useEffect } from "react";
import axios from "axios";
import { Link, Navigate, useNavigate } from "react-router";

export default function Login({ value }) {
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginInfo, setLoginInfo] = useState({ userName: "", password: "" });
  const [check, setCheck] = useState(false);
  const navigate = useNavigate();

  const isLoggedIn = (sessionStorage.getItem("login")||localStorage.getItem("login"))?true:false;
    useEffect(()=>{
      if(isLoggedIn){
        sessionStorage.setItem("login", localStorage.getItem("login"));
        navigate('/')
      }
    },[])

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
    <form onSubmit={login}>
      <div>Username or Email:</div>
      <br />
      <input
        type="text"
        name="username"
        value={loginInfo.userName}
        placeholder="Enter Username or Email"
        onChange={(event) => handleChange(event, "userName")}
      ></input>
      <div className="error-message">{formErrors.userName}</div>
      <br />
      <br />
      <div>Password:</div>
      <br />
      <input
        type={showPassword ? "text" : "password"}
        name="password"
        value={loginInfo.password}
        onChange={(e) => handleChange(e, "password")}
      />
      <button type="button" onClick={() => setShowPassword((prev) => !prev)}>
        {showPassword ? "Hide" : "Show"} Password
      </button>
      <div className="error-message">{formErrors.password}</div>
      <br />
      <br />
      {/* <div>
        <input
          type="checkbox"
          name="remember"
          checked={check}
          onChange={() => setCheck(!check)}
        />
        <div className="login-text">Remember Me</div>
      </div> */}
      <br />
      <button type="submit">Submit</button>
      <br />
      <br />
      Don't have an account <Link to={"/register"}>Register</Link>
    </form>
  );
}
