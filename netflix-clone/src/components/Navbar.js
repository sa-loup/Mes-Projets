// src/components/Navbar.js
import React from 'react';
import { Link } from "react-router-dom";
import './Navbar.css';
import logo from "./SALFLIX-24-02-2025.png";
const Navbar = () => {
  return (
    <div className="navbar">
      <Link to="/">
        <img src={logo} alt="Mon Logo" className="logo" />
      </Link>
      <img
        className="navbar__avatar"
        src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
        alt="Avatar"
      />
    </div>
  );
};

export default Navbar;