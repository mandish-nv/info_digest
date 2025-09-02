import StatusBar from "../components/statusBar";
import { useEffect, useState } from "react";
import ManageUsers from "./manageUsers";
import ViewAnalytics from "./viewAnalytics";
import ManageAiModels from "./manageAiModels";
import '../css/AdminPanel.css'; // Import the CSS file
import Footer from "../components/footer";

export default function AdminPanel(){
  const [currentPage, setCurrentPage] = useState("none");

  return(
    <div>
    <div className="admin-panel-container">
      <StatusBar/>
      <h1 className="admin-panel-title">Admin Panel</h1>
      
      <div className="admin-nav">
        <span 
          className={`nav-item ${currentPage === "Manage users" ? "active" : ""}`}
          onClick={()=>setCurrentPage("Manage users")}
        >
          Manage users
        </span> 
        <span 
          className={`nav-item ${currentPage === "View analytics" ? "active" : ""}`}
          onClick={()=>setCurrentPage("View analytics")}
        >
          View analytics
        </span> 
        {/*
        <span 
          className={`nav-item ${currentPage === "Manage AI models" ? "active" : ""}`}
          onClick={()=>setCurrentPage("Manage AI models")}
        >
          Manage AI models
        </span>
        */}
      </div>
      
      <div className="admin-content">
        {currentPage === 'Manage users' && <ManageUsers/>}
        {currentPage === 'View analytics' && <ViewAnalytics/>}
        {currentPage === 'Manage AI models' && <ManageAiModels/>}
      </div>
      </div>
      <Footer/>
    </div>
  );
}