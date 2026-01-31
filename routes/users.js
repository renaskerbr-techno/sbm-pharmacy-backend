const express = require("express");
const router = express.Router();
const { auth, db } = require("../firebase");
const verifyAuth = require("../middleware/auth");

// Create user (ADMIN ONLY)
router.post("/", verifyAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const { name, email, password, role } = req.body;

  const user = await auth.createUser({
    email,
    password
  });

  await db.collection("users").doc(user.uid).set({
    name,
    email,
    role: role || "staff",
    isActive: true,
    createdAt: new Date()
  });

  res.json({ message: "User created" });
});

// List users (ADMIN ONLY)
router.get("/", verifyAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const snapshot = await db.collection("users").get();

  const users = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.json(users);
});

// Activate / Deactivate (ADMIN ONLY)
router.patch("/:uid/status", verifyAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const { isActive } = req.body;

  await db.collection("users")
    .doc(req.params.uid)
    .update({ isActive });

  res.json({ message: "Status updated" });
});

module.exports = router;
