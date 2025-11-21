"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [visibleUsers, setVisibleUsers] = useState(10);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersCol = collection(db, "users");
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllUsers(userList);
        setUsers(userList.slice(0, visibleUsers));
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [visibleUsers]);

  const loadMoreUsers = () => {
    setVisibleUsers((prev) => prev + 10);
    setUsers(allUsers.slice(0, visibleUsers + 10));
  };

  const toggleBanUser = async (userId, isBanned) => {
    const confirmAction = window.confirm(
      `Are you sure you want to ${isBanned ? "unban" : "ban"} this user?`
    );
    if (confirmAction) {
      const userRef = doc(db, "users", userId);
      try {
        await updateDoc(userRef, { isBanned: !isBanned });

        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, isBanned: !isBanned } : user
          )
        );
        setAllUsers(
          allUsers.map((user) =>
            user.id === userId ? { ...user, isBanned: !isBanned } : user
          )
        );

        toast.success(`User ${isBanned ? "unbanned" : "banned"} successfully`);
      } catch (error) {
        console.error("Error updating user status:", error);
        toast.error(
          "There was an error updating the user status. Please try again."
        );
      }
    }
  };

  // Filter users based on search term
  const filteredUsers = searchTerm
    ? users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-gray-400">Manage user accounts and permissions</p>

        <div className="flex items-center gap-6 text-sm mt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-gray-400">Total Users:</span>
            <span className="font-semibold text-white">{allUsers.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-400">Active Users:</span>
            <span className="font-semibold text-white">
              {allUsers.filter((user) => !user.isBanned).length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-gray-400">Banned Users:</span>
            <span className="font-semibold text-white">
              {allUsers.filter((user) => user.isBanned).length}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Search Users</h3>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
          <svg
            className="absolute left-3 top-3.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              No Users Found
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              {allUsers.length === 0
                ? "No users have registered yet."
                : "No users match your search criteria."}
            </p>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="btn-primary">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                  Profile
                </th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center justify-center">
                      {user.profilePic ? (
                        <img
                          src={user.profilePic || "/placeholder.svg"}
                          alt={`${user.name}'s profile`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-white">
                      {user.name || "N/A"}
                    </div>
                  </td>
                  <td>
                    <div className="text-white break-all">{user.email}</div>
                  </td>
                  <td>
                    <div className="text-white">{user.phone || "N/A"}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-300 max-w-xs">
                      {user.address ? (
                        <div className="space-y-1">
                          <div>
                            {user.address.houseNo &&
                              `${user.address.houseNo}, `}
                            {user.address.line1}
                          </div>
                          {user.address.line2 && (
                            <div>{user.address.line2}</div>
                          )}
                          <div>
                            {user.address.city}, {user.address.state} -{" "}
                            {user.address.pin}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">
                          No address provided
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        user.isBanned ? "status-cancelled" : "status-delivered"
                      }`}
                    >
                      {user.isBanned ? "Banned" : "Active"}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleBanUser(user.id, user.isBanned)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        user.isBanned
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {user.isBanned ? "Unban" : "Ban"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {visibleUsers < allUsers.length && !searchTerm && (
        <div className="mt-6 text-center">
          <button className="btn-primary" onClick={loadMoreUsers}>
            Load More Users ({allUsers.length - visibleUsers} remaining)
          </button>
        </div>
      )}

      {/* Results Summary */}
      {filteredUsers.length > 0 && (
        <div className="mt-6 px-6 py-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {filteredUsers.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">
                {allUsers.length}
              </span>{" "}
              users
            </div>
            {searchTerm && (
              <div className="text-gray-500">
                Search results for "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
