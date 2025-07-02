import { Link } from "react-router-dom";
import TextSummarizer from "../pages/textSummarizer";
import StatusBar from "../components/statusBar";


export default function LandingPage(){
  const loggedInUser = sessionStorage.getItem("login")?sessionStorage.getItem("login"):false;


  return(
    <div>
      <StatusBar/>
      <br/>
      <br/>
      <TextSummarizer />

    </div>
  )
}