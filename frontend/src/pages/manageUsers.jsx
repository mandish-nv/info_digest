import axios from "axios";
import { useEffect, useState } from "react";
import '../css/ManageUsers.css'; // Import the CSS file

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
    return <div className="error-message">Error: {error}</div>;
  }

  if (users.length === 0) {
    return <div className="info-message">No users found.</div>;
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
    <div className="manage-users-container">
      <h1 className="page-title">Manage Users</h1>
      
      <div className="controls-section">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <span 
            className={`filter-button ${userType === "all" ? "active" : ""}`} 
            onClick={() => setUserType("all")}
          >
            All users
          </span>
          <span 
            className={`filter-button ${userType === "admin" ? "active" : ""}`} 
            onClick={() => setUserType("admin")}
          >
            Admin
          </span>
        </div>
      </div>
      
      <h2 className="table-title">
        {userType === "admin" ? "Registered Admins" : "All Registered Users"}
      </h2>

      {filteredUsers.length === 0 ? (
        <div className="no-users-message">
          No {userType === "admin" ? "admin" : ""} users found.
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Profile Picture</th>
                <th>Full Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Admin</th>
                <th>Registered On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>
                    <a href={`/profile/${user._id}`} target="_blank" rel="noopener noreferrer">
                      <img
                        src={user.profilePicture && user.profilePicture !== "null" 
                          ? user.profilePicture 
                          : "../assets/no_profile.jpg"
                        }
                        className="profile-picture"
                      />
                    </a>
                  </td>
                  <td><a href={`/profile/${user._id}`} target="_blank" rel="noopener noreferrer">{user.fullName}</a></td>
                  <td><a href={`/profile/${user._id}`} target="_blank" rel="noopener noreferrer">{user.userName}</a></td>
                  <td><a href={`/profile/${user._id}`} target="_blank" rel="noopener noreferrer">{user.email}</a></td>
                  <td>{user.gender}</td>
                  <td>{new Date(user.dob).toLocaleDateString()}</td>
                  <td>{user.adminAccess ? "Yes" : "No"}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    {loggedInUser !== user._id && (
                      <button 
                        onClick={() => openAccessModal(user)}
                        className="modify-access-button"
                      >
                        Modify Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAccessModal && selectedUserForAccess && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Change Access for {selectedUserForAccess.fullName}?</h3>
            <p>
              Current Status:
              <strong>
                {selectedUserForAccess.adminAccess ? " Admin" : " Default User"}
              </strong>
            </p>
            <div className="modal-actions">
              <button
                onClick={() =>
                  handleConfirmAccessChange(selectedUserForAccess._id, true)
                }
                className="modal-button-admin"
              >
                Make Admin
              </button>
              <button
                onClick={() =>
                  handleConfirmAccessChange(selectedUserForAccess._id, false)
                }
                className="modal-button-default"
              >
                Make Default User
              </button>
              <button
                onClick={closeAccessModal}
                className="modal-button-cancel"
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