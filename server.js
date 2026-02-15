const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./firebase");

const app = express();

/* ✅ FIXED CORS CONFIG */
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sbm-pharmacy-system.web.app",
    "https://sbm-pharmacy-system.firebaseapp.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

/* ROUTES */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/returns", require("./routes/returns"));
app.use("/api/reports", require("./routes/reports"));

/* HEALTH CHECK */
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend running" });
});

/* ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error" });
});

/* PORT FIX FOR RENDER */
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
