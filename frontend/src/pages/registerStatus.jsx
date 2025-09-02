import { Link } from "react-router-dom";
import StatusBar from "../components/statusBar";
import Footer from "../components/footer";

export default function RegisterStatus(){
  return(
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      textAlign: 'center',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Arial, sans-serif',
      color: '#333'
    }}>
      <StatusBar/>
      <div style={{
        backgroundColor: '#fff',
        paddingTop: "40px",
        padding: '2rem 3rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <p style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#28a745',
          marginBottom: '1rem'
        }}>Register status: Success</p>
        <Link 
          to={'/login'} 
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            transition: 'background-color 0.3s ease',
            fontWeight: 'bold'
          }}
        >
          Log in
        </Link>
      </div>
      <Footer/>
    </div>
  )
}