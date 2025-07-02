import StatusBar from "../components/statusBar";
import { useEffect, useState } from "react";
import ManageUsers from "./manageUsers";
import ViewAnalytics from "./viewAnalytics";
import ManageAiModels from "./manageAiModels";

export default function AdminPanel(){
  const [currentPage, setCurrentPage] = useState("none");

  return(
    <div>
      <StatusBar/>
      <h1>Admin Panel</h1>
      <div>
        <span onClick={()=>setCurrentPage("Manage users")}>Manage users</span> 
      </div>
      <div>
        <span onClick={()=>setCurrentPage("View analytics")}>View analytics</span> 
      </div>
      <div>
        <span onClick={()=>setCurrentPage("Manage AI models")}>Manage AI models</span> 
      </div>
      {currentPage=='Manage users'&&(<ManageUsers/>)}
      {currentPage=='View analytics'&&(<ViewAnalytics/>)}
      {currentPage=='Manage AI models'&&(<ManageAiModels/>)}
    </div>
  );
}