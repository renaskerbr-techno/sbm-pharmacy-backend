const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Initialize Firebase
require("./firebase");

const app = express();


// ✅ CORS FIX — allow all frontend origins
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sbm-pharmacy-system.web.app",
    "https://sbm-pharmacy-system.firebaseapp.com"
  ],
  credentials: true
}));


app.use(express.json());


// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/returns", require("./routes/returns"));
app.use("/api/reports", require("./routes/reports"));


// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend running" });
});


// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: err.message || "Server error"
  });
});


// IMPORTANT FOR RENDER
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
