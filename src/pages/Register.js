import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import background from '../assets/images/background.jpg';

const API_URL = process.env.REACT_APP_API_URL;
// register component acts much the same way as the lognin component
const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  // This function will run when the user submits the registration form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // No client-side validation checks—everything is sent to the API for validation.
    try {
      // send the JSON package to the server
      // can replace the fetch call with '${API_URL}/api/auth/register' ?
const response = await fetch(`${API_URL}/auth/register`, {
  credentials: 'include',
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password, confirmPassword })
});
      if (!response.ok) { // failed to register
        throw new Error('Registration failed');
      }
      const data = await response.json();
      console.log("Registration successful:", data);
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
    }
  };

  const containerStyle = {
    backgroundImage: `url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, sans-serif'
  };

  const formStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '2rem',
    borderRadius: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    marginTop: '0.5rem',
    marginBottom: '1rem',
    borderRadius: '4px',
    border: '1px solid #ccc'
  };

  const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#61dafb',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1rem'
  };
// what is actually displayed on the screen
  return (
    <div style={containerStyle}>
      <div style={formStyle}>
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Username:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Password:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Confirm Password:</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" style={buttonStyle}>Register</button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login here</Link>.
        </p>
      </div>
    </div>
  );
};

export default Register;
