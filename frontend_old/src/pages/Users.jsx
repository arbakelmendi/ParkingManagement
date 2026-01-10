import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { createUser, deleteUser, getUsers, updateUser } from "../api/users.js";

export default function Users() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("user");
  const [editUserPassword, setEditUserPassword] = useState("");

  const [err, setErr] = useState("");

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await getUsers(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setErr("Access Denied: You must be an admin to view users.");
      return;
    }
    setErr("");
    loadUsers();
  }, [token, isAdmin]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) return;
    try {
      await createUser(token, {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("user");
      await loadUsers();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to create user.");
    }
  };

  const startEditUser = (u) => {
    setEditingUserId(u.id);
    setEditUserName(u.name || "");
    setEditUserEmail(u.email || "");
    setEditUserRole(u.role || "user");
    setEditUserPassword("");
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditUserName("");
    setEditUserEmail("");
    setEditUserRole("user");
    setEditUserPassword("");
  };

  const handleUpdateUser = async (u) => {
    if (!editUserName || !editUserEmail || !editUserRole) return;
    try {
      await updateUser(token, u.id, {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole,
        password: editUserPassword
      });
      cancelEditUser();
      await loadUsers();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to update user.");
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await deleteUser(token, u.id);
      await loadUsers();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to delete user.");
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "var(--status-error)" }}>
        <h3>Access Restricted</h3>
        <p>This page is only visible to administrators.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header>
        <h2 style={{ fontSize: "2rem", marginBottom: "8px" }}>Users</h2>
        <p style={{ color: "var(--text-secondary)" }}>Manage system users.</p>
      </header>

      {err && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "var(--status-error)",
          borderRadius: "8px"
        }}>
          {err}
        </div>
      )}

      <section>
        <form onSubmit={handleCreateUser} style={{ marginBottom: 20, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <input placeholder="Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
            <input placeholder="Email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
            <input placeholder="Password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit">Add User</button>
          </div>
        </form>

        {usersLoading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table border="1" cellPadding="8" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isEditing = editingUserId === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {isEditing ? (
                        <input value={editUserName} onChange={(e) => setEditUserName(e.target.value)} />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input type="email" value={editUserEmail} onChange={(e) => setEditUserEmail(e.target.value)} />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isEditing ? (
                        <>
                          <input
                            placeholder="New password (optional)"
                            type="password"
                            value={editUserPassword}
                            onChange={(e) => setEditUserPassword(e.target.value)}
                            style={{ minWidth: 200 }}
                          />
                          <button type="button" onClick={() => handleUpdateUser(u)}>Update</button>
                          <button type="button" onClick={cancelEditUser}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEditUser(u)}>Edit</button>
                          <button type="button" onClick={() => handleDeleteUser(u)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
