import { Link } from "react-router-dom";

export default function RegisterStatus(){
  return(
    <div>
      <p>Register status:</p> 
      <br />
      <Link to={'/login'}>Log in</Link>
    </div>
  )
}