// edit?

import axios from "axios";
import { useEffect, useState } from "react";

export default function ManageUsers() {
  const [userType, setUserType] = useState("all");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);

  const loggedInUser = sessionStorage.getItem("login");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/users");
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

  const filteredUsers = users.filter((user) => {
    const matchesUserType =
      userType === "all" || (user.adminAccess === true && userType === "admin");

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchLower) ||
      user.userName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower);

    return matchesUserType && matchesSearch;
  });

  const openAccessModal = (user) => {
    setSelectedUserForAccess(user);
    setShowAccessModal(true);
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setSelectedUserForAccess(null);
  };

  const handleConfirmAccessChange = async (userId, newAdminStatus) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/users/${userId}/adminAccess`,
        {
          adminAccess: newAdminStatus,
        }
      );

      if (res.status === 200) {
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId
              ? { ...user, adminAccess: newAdminStatus }
              : user
          )
        );
        console.log(
          `User ${userId} admin access updated to: ${newAdminStatus}`
        );
        alert(
          `User access updated to ${newAdminStatus ? "Admin" : "Default User"}.`
        );
      }
    } catch (err) {
      console.error(`Error updating access for user ${userId}:`, err);
      alert(`Failed to update access for user ${userId}.`);
    } finally {
      closeAccessModal(); 
    }
  };

  return (
    <div>
      <h1>ManageUsers</h1>

      <div>
        <h2>Search</h2>
        <div>
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
        <div>No {userType === "admin" ? "admin" : ""} users found.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Profile Picture</th>
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
                <td>
                <a href={`/profile/${user._id}`} target="_blank">
                  <img
                    src={user.profilePicture}
                    style={{ height: "50px", width: "50px" }}
                  ></img>
                  </a>
                </td>
                <td><a href={`/profile/${user._id}`} target="_blank">{user.fullName}</a></td>
                <td><a href={`/profile/${user._id}`} target="_blank">{user.userName}</a></td>
                <td><a href={`/profile/${user._id}`} target="_blank">{user.email}</a></td>
                
                <td>{user.gender}</td>
                <td>{new Date(user.dob).toLocaleDateString()}</td>
                <td>{user.adminAccess ? "Yes" : "No"}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  {(loggedInUser != user._id) && <button onClick={() => openAccessModal(user)}>
                    Modify Access
                  </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAccessModal && selectedUserForAccess && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              maxWidth: "400px",
              width: "90%",
              textAlign: "center",
            }}
          >
            <h3>Change Access for {selectedUserForAccess.fullName}?</h3>
            <p>
              Current Status:
              <strong>
                {selectedUserForAccess.adminAccess ? " Admin" : " Default User"}
              </strong>
            </p>
            <div style={{ marginTop: "20px" }}>
              <button
                onClick={() =>
                  handleConfirmAccessChange(selectedUserForAccess._id, true)
                }
                style={{
                  padding: "10px 15px",
                  marginRight: "10px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Make Admin
              </button>
              <button
                onClick={() =>
                  handleConfirmAccessChange(selectedUserForAccess._id, false)
                }
                style={{
                  padding: "10px 15px",
                  marginRight: "10px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Make Default User
              </button>
              <button
                onClick={closeAccessModal}
                style={{
                  padding: "10px 15px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

