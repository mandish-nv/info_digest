import axios from "axios";
import { useEffect, useState } from "react";

export default function ManageUsers() {
  const [userType, setUserType] = useState("all");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/users"); // Double-check your backend URL
        setUsers(response.data);
      } catch (err) {
        setError("Failed to fetch users. Please try again later.");
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  if (error) {
    return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  }

  if (users.length === 0) {
    return <div style={{ padding: "20px" }}>No users found.</div>;
  }

  const filteredUsers = users.filter(user => {
    if (userType === "admin") {
      return user.adminAccess === true;
    }
    // If userType is "all" or anything else, include all users
    return true;
  });

  return (
    <div>
      <h1>ManageUsers</h1>

      <div>
        <h2>Search</h2>
      </div>

      <div>
        <span onClick={() => setUserType("all")}>All users</span>
      </div>
      <div>
        <span onClick={() => setUserType("admin")}>Admin</span>
      </div>

      <h2>
        {userType === "admin" ? "Registered Admins" : "All Registered Users"}
      </h2>
      
      {filteredUsers.length === 0 ? (
        <div>
          No {userType === "admin" ? "admin" : ""} users found.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Gender</th>
              <th>Date of Birth</th>
              <th>Admin Access</th>
              <th>Registered On</th>
              <th>Actions</th> 
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.fullName}</td>
                <td>{user.userName}</td>
                <td>{user.email}</td>
                <td>{user.gender}</td>
                <td>{new Date(user.dob).toLocaleDateString()}</td>
                <td>{user.adminAccess ? "Yes" : "No"}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="modify-access-button">Modify access</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

{
  /* admin access, view user history, search, include master admin */
}
