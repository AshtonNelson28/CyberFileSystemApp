import React from 'react';
import axios from 'axios';
import { FaDownload, FaTrash, FaEye } from 'react-icons/fa';
//import { useEffect } from 'react';
function Dashboard() {
  // Temporary data for file listings
  const [files, setFiles] = React.useState([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewingFileContent, setViewingFileContent] = React.useState('');

  const [selectedFile, setSelectedFile] = React.useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const refreshFileList = () => {
    axios.get('https://localhost:3001/files', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    })
    .then(response => {
      setFiles(response.data.files);
    })
    .catch(error => {
      console.error('Error fetching files:', error);
    });
  }

  // Function to handle file upload, to be implemented
  const handleFileUpload = (event) => {
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    axios.post('https://localhost:3001/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    })
    .then(response => {
      console.log('File uploaded successfully');
      refreshFileList();
      // Refresh file list or notify user
    })
    .catch(error => {
      console.error('Error uploading file:', error);
    });
  };

  const handleFileDownload = (fileName) => {
    axios({
      url: `https://localhost:3001/download/${fileName}`,
      method: 'GET',
      responseType: 'blob', // Important
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    })
    .catch(error => {
      console.error('Error downloading file:', error);
    });
  };
  
  const handleFileDelete = (fileName) => {
    axios.delete(`https://localhost:3001/delete/${fileName}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(() => {
      console.log('File deleted successfully');
      // Refresh file list or notify user
      setFiles(files.filter(file => file.name !== fileName)); 
    })
    .catch(error => {
      console.error('Error deleting file:', error);
    });
  };

  const handleFileView = (fileName) => {
    axios.get(`https://localhost:3001/view/${fileName}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => {
      setViewingFileContent(response.data.content);
      setIsModalOpen(true);
    })
    .catch(error => {
      console.error('Error viewing file:', error);
    });
  };

  React.useEffect(() => {
    axios.get('https://localhost:3001/files', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    })
    .then(response => {
      setFiles(response.data.files); // Assuming response contains an array of file objects
    })
    .catch(error => {
      console.error('Error fetching files:', error);
    });
  }, []);
  

  return (
    <div style={styles.container}>
    <h1 style={styles.title}>File Management Dashboard</h1>
    {isModalOpen && (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <h2>File Content</h2>
          <pre style={styles.fileContent}>{viewingFileContent}</pre>
          <button onClick={() => setIsModalOpen(false)}>Close</button>
        </div>
      </div>
    )}

    <div>
      <input 
        type="file" 
        onChange={handleFileChange} 
        style={styles.uploadInput}
      />
      <button 
        onClick={handleFileUpload} 
        style={styles.submitButton}
      >
        Upload File
      </button>
    </div>
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.fileNameHeader}>File Name</th>
          <th style={styles.iconHeader}>Actions</th>
        </tr>
      </thead>
      <tbody>
      {files.map((file, index) => (
          <tr key={index} style={styles.tableRow}>
            <td style={styles.fileName}>{file.name}</td>
            <td style={styles.iconCell}>
            <FaEye
              style={{ ...styles.icon, ...styles.viewIcon }}
              onClick={() => handleFileView(file.name)}
            />
              <FaDownload 
                style={{ ...styles.icon, ...styles.downloadIcon }}
                onClick={() => handleFileDownload(file.name)}
              />
              <FaTrash 
                style={{ ...styles.icon, ...styles.deleteIcon }}
                onClick={() => handleFileDelete(file.name)}
              />
             
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
);
}

export default Dashboard;

// You can continue to use the styles object from your Login component
// and just add/adjust styles specific to the Dashboard.
const styles = {
  // ... (reuse styles from your Login component here)
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
  uploadInput: {
    margin: '0px 10px',
    padding: '10px',
    fontSize: '1rem',
    color: '#fff',
    backgroundColor: '#333',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  table: {
    width: '80%',
    marginTop: '20px',
    alignItems: 'center',
    borderCollapse: 'collapse',
    color: '#fff'
  },
  tableRow: {
    backgroundColor: '#333',
    borderBottom: '1px solid #444'
  },
  button: {
    padding: '5px 15px',
    fontSize: '0.8rem',
    color: '#121212',
    backgroundColor: '#0ff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    margin: '5px'
  },
  fileNameHeader: {
    textAlign: 'left',
    width: '70%',
  },
  iconHeader: {
    textAlign: 'right',
    paddingRight: '1rem',
    width: '30%',
  },
  fileName: {
    // Adjust styling for file name column
    padding: '10px',
    textAlign: 'left',
  },
  iconCell: {
    // Adjust styling for icon buttons column
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '20px', // Space out icons
    padding: '10px',
  },
  icon: {
    cursor: 'pointer',
    transition: 'color 0.2s',
    // Adjust icon size as necessary, maybe smaller for the table layout
    fontSize: '1.2rem',
  },
  downloadIcon: {
    color: '#0ff', // Style color for download icon
    // More styles specific to the download icon
  },
  deleteIcon: {
    color: '#0ff', // Style color for delete icon
    // More styles specific to the delete icon
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#333',
    padding: '20px',
    borderRadius: '5px',
    maxWidth: '500px',
    maxHeight: '80%',
    overflowY: 'auto'
  },
  fileContent: {
    whiteSpace: 'pre-wrap', // Keeps the formatting of the text
    wordBreak: 'break-word', // Ensures long text wraps
    maxHeight: '300px', // Set a max height for the content area
    overflowY: 'auto' // Add scrollbar if content is too long
  },
  uploadSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '20px 0',
  },
  hiddenInput: {
    display: 'none',
  },
  uploadLabel: {
    padding: '10px 20px',
    fontSize: '1rem',
    color: '#121212',
    backgroundColor: '#0ff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  viewIcon: {
    color: '#0ff',
    cursor: 'pointer',
    transition: 'transform 0.2s, color 0.2s',
    '&:hover': {
      transform: 'scale(1.1)',
      color: '#fff',
    },
  },
};
