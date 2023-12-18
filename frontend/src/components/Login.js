import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [displayError, setDisplayError] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      // Use 'https' in the URL
      const response = await axios.post('https://localhost:3001/api/login', { username, password });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('homeDirectory', response.data.user.homeDirectory);
        navigate('/dashboard'); // Redirect to the dashboard if login is successful
      } else {
        // Handle the case where login credentials are incorrect
        alert('Incorrect username or password.'); // This is a simple way to show the error. Replace with a better error handling approach.
      }
    } catch (error) {
      console.error('Login failed:', error);
      setDisplayError(true);
      // Handle other errors (network error, server error, etc.)
      // Replace with a better error handling approach.
    }
  };
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>LDAP Server</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label>
          Username:
          <input
            style={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password:
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button style={styles.submitButton} type="submit">Log In</button>
        {displayError && <h2>Inccorect Username or Password</h2>}
      </form>
    </div>
  );
}

export default Login;

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212', // Dark background color
    color: '#0ff', // Bright cyber color for text
  },
  title: {
    marginBottom: '2rem',
    fontSize: '2.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  input: {
    padding: 10,
    marginLeft: 8,
    fontSize: '1rem',
    color: '#fff', // White color for input text
    backgroundColor: '#333', // Darker background for inputs
    border: '1px solid #444',
    borderRadius: '4px',
    width: '250px', // Fixed width, could be responsive
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    color: '#121212', // Dark text for contrast
    backgroundColor: '#0ff', // Bright cyber color for buttons
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
};