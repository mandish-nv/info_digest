import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showRepassword, setShowRepassword] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const isLoggedIn = (sessionStorage.getItem("login")||localStorage.getItem("login"))?true:false;
  useEffect(()=>{
    if(isLoggedIn){
      sessionStorage.setItem("login", localStorage.getItem("login"));
      navigate('/')
    }
  },[])

  const [regInfo, setRegInfo] = useState({
    fullName: "",
    userName: "",
    gender: "",
    dob: "",
    email: "",
    password: "",
    repassword: "",
    profilePicture: "none",
  });

  const validateFields = () => {
    const errors = {};
    if (!regInfo.fullName.trim()) errors.fullName = "Full Name is required.";
    if (!regInfo.userName.trim()) errors.userName = "Username is required.";
    if (!regInfo.gender.trim()) errors.gender = "Gender is required.";
    if (!regInfo.dob.trim()) errors.dob = "Date of Birth is required.";
    if (!regInfo.email.trim()) errors.email = "Email is required.";
    if (regInfo.password.trim().length <= 5)
      errors.password = "Password should be atleast 6 characters long";
    if (!regInfo.password.trim()) errors.password = "Password is required.";
    if (regInfo.password.trim() !== regInfo.repassword.trim())
      errors.repassword = "Password and Repassword should be the same.";
    if (!regInfo.repassword.trim())
      errors.repassword = "Repassword is required.";
    return errors;
  };

  const register = async (event) => {
    event.preventDefault();
    const errors = validateFields();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
    } else {
      try {
        const res = await axios.post("http://localhost:5000/register", regInfo);
        console.log("res.data:", res.data);
        if (res.data === "userName and email already exists.") {
          errors.userName = "userName already exists.";
          errors.email = "email already exists.";
          setFormErrors(errors);
        } else if (res.data === "userName already exists.") {
          errors.userName = "userName already exists.";
          setFormErrors(errors);
        } else if (res.data === "email already exists.") {
          errors.email = "email already exists.";
          setFormErrors(errors);
        } else if (res.data === "Registered successfully!") {
          setRegInfo({
            fullName: "",
            userName: "",
            gender: "",
            dob: "",
            email: "",
            password: "",
            repassword: "",
            profilePicture: "none",
          });
          setFormErrors({});
          fileInputRef.current.value = "";

          console.log("Navigating to /register-status...");
          navigate("/register-status");
        } else {
          alert("Error occured!");
        }
      } catch (err) {
        alert("Registration failed.");
      }
    }
  };

  const handleChangeReg = (event, name) => {
    setRegInfo({ ...regInfo, [name]: event.target.value });
    setFormErrors({ ...formErrors, [name]: "" }); // clear error on change
  };

  const handleFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setRegInfo({ ...regInfo, profilePicture: reader.result });
          setFormErrors({ ...formErrors, profilePicture: "" }); // clear error
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to get today's date in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Function to get a date X years ago in YYYY-MM-DD format (for min age)
  const getDateYearsAgo = (years) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const maxDob = getTodayDateString();
  const minDob = getDateYearsAgo(120);

  return (
    <form onSubmit={register}>
      <h1>Register</h1>
      <div>* Full Name:</div>
      <input
        type="text"
        name="fullName"
        value={regInfo.fullName}
        onChange={(e) => handleChangeReg(e, "fullName")}
      />
      <div className="error-message">{formErrors.fullName}</div>
      <br />
      <div>* Username:</div>
      <input
        type="text"
        name="userName"
        value={regInfo.userName}
        onChange={(e) => handleChangeReg(e, "userName")}
      />
      <div className="error-message">{formErrors.userName}</div>
      <br />
      <div>* Gender:</div>
      <input
        type="radio"
        name="gender"
        value="Male"
        checked={regInfo.gender === "Male"}
        onChange={(e) => handleChangeReg(e, "gender")}
      />{" "}
      Male
      <input
        type="radio"
        name="gender"
        value="Female"
        checked={regInfo.gender === "Female"}
        onChange={(e) => handleChangeReg(e, "gender")}
      />{" "}
      Female
      <div className="error-message">{formErrors.gender}</div>
      <br />
      <div>* Date of Birth:</div>
      <input
        type="date"
        name="dob"
        value={regInfo.dob}
        min={minDob}
        max={maxDob}
        onChange={(e) => handleChangeReg(e, "dob")}
      />
      <div className="error-message">{formErrors.dob}</div>
      <br />
      <div>* Email:</div>
      <input
        type="email"
        name="email"
        value={regInfo.email}
        onChange={(e) => handleChangeReg(e, "email")}
      />
      <div className="error-message">{formErrors.email}</div>
      <br />
      <div>* Password:</div>
      <input
        type={showPassword ? "text" : "password"}
        name="password"
        value={regInfo.password}
        onChange={(e) => handleChangeReg(e, "password")}
      />
      <button type="button" onClick={() => setShowPassword((prev) => !prev)}>
        {showPassword ? "Hide" : "Show"} Password
      </button>
      <div className="error-message">{formErrors.password}</div>
      <br />
      <div>* Repassword:</div>
      <input
        type={showRepassword ? "text" : "password"}
        name="repassword"
        value={regInfo.repassword}
        onChange={(e) => handleChangeReg(e, "repassword")}
      />
      <button type="button" onClick={() => setShowRepassword((prev) => !prev)}>
        {showRepassword ? "Hide" : "Show"} Repassword
      </button>
      <div className="error-message">{formErrors.repassword}</div>
      <br />
      <div>Profile Picture:</div>
      <input
        type="file"
        name="image"
        accept="image/*"
        onChange={handleFile}
        ref={fileInputRef}
      />
      <div className="error-message">{formErrors.profilePicture}</div>
      <br />
      <br />
      <button type="submit">Submit</button>
      <br />
      <p>Already have an account?</p>
      <Link to={"/login"}>Log in</Link>
    </form>
  );
}
