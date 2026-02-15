const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../firebase");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const snapshot = await db.collection("users")
    .where("email", "==", email)
    .get();

  if (snapshot.empty)
    return res.status(400).json({ message: "Invalid Credentials" });

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();

  const valid = await bcrypt.compare(password, userData.password);
  if (!valid)
    return res.status(400).json({ message: "Invalid Credentials" });

  const token = jwt.sign(
    { uid: userDoc.id, role: userData.role },
    "MY_SECRET_KEY",
    { expiresIn: "1d" }
  );

  res.json({ token, role: userData.role });
});

module.exports = router;
