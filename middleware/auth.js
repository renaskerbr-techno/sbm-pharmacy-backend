const { auth, db } = require("../firebase");

async function verifyAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = header.split(" ")[1];
    const decoded = await auth.verifyIdToken(token);

    const userDoc = await db.collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(401).json({ message: "User not registered" });
    }

    const userData = userDoc.data();

    if (!userData.isActive) {
      return res.status(403).json({ message: "User inactive" });
    }

    req.user = {
      uid: decoded.uid,
      role: userData.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = verifyAuth;
