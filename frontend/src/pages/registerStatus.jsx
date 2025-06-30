import { Link } from "react-router-dom";

export default function RegisterStatus(){
  return(
    <div>
      <p>Register status: Success</p> 
      <br />
      <Link to={'/login'}>Log in</Link>
    </div>
  )
}