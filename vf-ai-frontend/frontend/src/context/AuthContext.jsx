import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("access_token"));
    const [loading, setLoading] = useState(true); // helps waiting for initial re-hydration

    useEffect(() => {
        // Re-hydrate user from localStorage if we just reloaded
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("access_token"); // Get token from localStorage
        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken); // Set token from localStorage
            } catch (error) {
                console.error("Failed to parse stored user or token", error);
                localStorage.removeItem("user"); // Clear potentially corrupted user data
                localStorage.removeItem("access_token"); // Clear potentially corrupted token
                setUser(null);
                setToken(null);
            }
        }
        setLoading(false);
    }, []); // Dependency array changed to empty, as we only want this to run once on mount

    const login = (accessToken, userData) => {
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("user", JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
