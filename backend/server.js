const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { mkdirp } = require("mkdirp");
const jwt = require("jsonwebtoken");
const { authenticate } = require("ldap-authentication");
const https = require('https');


const privateKey = fs.readFileSync(path.join(__dirname, 'localhost.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'localhost.cert'), 'utf8');
const credentials = { key: privateKey, cert: certificate };


const app = express();
const HTTPS_PORT = process.env.PORT || 3001;
app.use(cors()); // For simplicity, allowing all origins
app.use(express.json()); // To parse JSON request bodies

require("dotenv").config();
const ldapURL = process.env.LDAP_URL;
const envAdminDN = process.env.LDAP_BIND_DN; // e.g., 'cn=admin,dc=example,dc=com'
const envAdminPassword = process.env.LDAP_BIND_PASSWORD; // e.g., 'adminpassword'
const envUserSearchBase = process.env.LDAP_BASE;

async function ldapAuth(username, password) {
  let options = {
    ldapOpts: {
      url: ldapURL,
    },
    adminDn: envAdminDN,
    adminPassword: envAdminPassword,
    userSearchBase: envUserSearchBase,
    usernameAttribute: "uid", // The attribute against which the username will be matched
    username, // The actual username
    userPassword: password, // The actual password
  };
  try {
    let user = await authenticate(options);
    return { success: true, user };
  } catch (error) {
    console.error("LDAP authentication error:", error);
    return { success: false, error };
  }
}

const jwtMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Authorization header is missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error in token verification:", error);
    res.status(401).json({ message: "Invalid or missing token" });
  }
};

// Function to append audit messages to a file
const audit = (action, filename, user) => {
  const auditDir = path.join(__dirname, "audit");
  const auditFilePath = path.join(auditDir, "record.txt");
  const timestamp = new Date().toISOString();

  // Create audit directory if it doesn't exist
  if (!fs.existsSync(auditDir)) {
    mkdirp.sync(auditDir);
  }

  // Append audit message to the record.txt file
  let auditmessage;
  if (filename == null) {
    auditMessage = `${timestamp} - ${action} by ${user.uid}\n`;
  } else {
    auditMessage = `${timestamp} - ${action} by ${user.uid} on file ${filename}\n`;
  }
  fs.appendFileSync(auditFilePath, auditMessage);
};

// Middleware to handle auditing for file uplaods, downloads, and deletions
const auditMiddleware = (action) => {
  return (req, res, next) => {
    const filename = req.params.filename || (req.file && req.file.filename);
    audit(action, filename, req.user);
    next();
  };
};

// Login endpoint with auditing
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password are required." });
  }

  const authResult = await ldapAuth(username, password);

  if (authResult.success) {
    const uid = authResult.user.uid;
    if (!uid) {
      return res.status(500).json({ error: "User UID is undefined" });
    }

    const userHomeDir = path.join(__dirname, "/home/", uid); // Use uid to create directory name
    const instructionsFilePath = path.join(
      userHomeDir,
      "/uploads/",
      "instructions.txt"
    );
    const instructionsContent =
      "General information about this project:\n\n...";

    try {
      // Create user directory and instructions file
      if (!fs.existsSync(userHomeDir)) {
        // Create user directory and instructions file if it doesn't exist
        await mkdirp(userHomeDir);
        await mkdirp(path.join(userHomeDir, "uploads"));
        fs.writeFileSync(instructionsFilePath, instructionsContent, {
          flag: "wx",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          dn: authResult.user.dn,
          homeDirectory: userHomeDir,
          uid: uid,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Auditing for login
      const loginAction = "login";
      audit(loginAction, null, authResult.user);

      res.status(200).json({
        success: true,
        message: "Authenticated successfully",
        user: { ...authResult.user, homeDirectory: userHomeDir },
        token,
      });
    } catch (err) {
      console.error("Error in creating directory or file:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    // Auditing for failed login
    const loginAction = "failed login";
    audit(loginAction, null, { uid: username });

    // You may want to avoid sending detailed error messages in a production environment
    res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: authResult.error.toString(),
    });
  }
});


// Modify multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(req.user.homeDirectory, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

//console.log(storage);
const upload = multer({ storage });

app.use("/upload", jwtMiddleware);
app.use("/files", jwtMiddleware);
app.use("/delete/:filename", jwtMiddleware);
app.use("/download/:filename", jwtMiddleware);

app.post(
  "/upload",
  upload.single("file"),
  auditMiddleware("upload"),
  (req, res) => {
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
    });
  }
);

app.get("/files", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const userHomeDir = path.join(__dirname, "/home/", user.uid, "uploads");

    const files = await fs.promises.readdir(userHomeDir);
    const fileDetails = files.map((filename) => ({ name: filename }));

    res.json({ files: fileDetails });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Error listing files" });
  }
});

app.delete("/delete/:filename", auditMiddleware("delete"), (req, res) => {
  const homeDir = req.user.homeDirectory; // Extract from user's session or token
  const filePath = path.join(homeDir, "uploads", req.params.filename);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file: ", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ message: "File deleted successfully" });
    }
  });
});

app.get("/download/:filename", auditMiddleware("download"), (req, res) => {
  const homeDir = req.user.homeDirectory; // Extract from user's session or token
  const filePath = path.join(homeDir, "uploads", req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

// Endpoint to get file content
app.get(
  "/view/:filename",
  jwtMiddleware,
  auditMiddleware("view"),
  async (req, res) => {
    const { filename } = req.params;
    const homeDir = req.user.homeDirectory;

    const filePath = path.join(homeDir, "uploads", filename);

    try {
      const content = fs.readFileSync(filePath, "utf8");
      res.json({ content });
    } catch (error) {
      console.error("Error reading file:", error);
      res.status(500).json({ error: "Error reading file" });
    }
  }
);

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});
