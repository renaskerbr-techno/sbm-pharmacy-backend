const express = require("express");
const router = express.Router();

const verifyAuth = require("../middleware/auth");

router.get("/me", verifyAuth, function (req, res) {
  res.json({
    uid: req.user.uid,
    role: req.user.role
  });
});

module.exports = router;
