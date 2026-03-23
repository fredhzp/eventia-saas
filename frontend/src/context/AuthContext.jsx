import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // We will install this next

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app loads, check if the user is already logged in (token in local storage)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        setUser({ ...decodedUser, token });
      } catch (error) {
        console.error("Invalid token");
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // The Login Function
  const login = (token) => {
    localStorage.setItem('token', token);
    const decodedUser = jwtDecode(token);
    setUser({ ...decodedUser, token });
  };

  // The Logout Function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};