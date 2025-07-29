import { Link } from "react-router-dom";
import TextSummarizer from "../pages/textSummarizer";
import StatusBar from "../components/statusBar";
import { useEffect } from "react";

export default function LandingPage() {
  const getLoginId = () => {
    return sessionStorage.getItem("login") || localStorage.getItem("login");
  };

  useEffect(() => {
    const currentLoginId = getLoginId();

    if (currentLoginId) {
      localStorage.setItem("currentUser", currentLoginId);
      sessionStorage.setItem("login", currentLoginId)
    } else {
      localStorage.removeItem("currentUser");
    }
  }, []);

  return (
    <div>
      <StatusBar />
      <TextSummarizer />
    </div>
  );
}
