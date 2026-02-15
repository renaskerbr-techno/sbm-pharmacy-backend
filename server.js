const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./firebase");

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/returns", require("./routes/returns"));
app.use("/api/reports", require("./routes/reports"));

app.get("/api/health", (req, res) => {
  res.json({ status: "Backend running" });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
