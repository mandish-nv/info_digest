import { Link } from "react-router-dom";
import TextSummarizer from "../components/textSummarizer";
import LoggedInStatus from "./loggedInStatus";


export default function LandingPage(){
  const loggedInUser = sessionStorage.getItem("login")?sessionStorage.getItem("login"):false;


  return(
    <div>
      <h1>Landing Page</h1> 
      <br />
      <TextSummarizer />
      <br/>
      <br/>
      <LoggedInStatus/>

    </div>
  )
}