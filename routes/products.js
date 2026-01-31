const express = require("express");
const router = express.Router();

const verifyAuth = require("../middleware/auth");
const { db } = require("../firebase");

/**
 * CREATE PRODUCT (ADMIN ONLY)
 */
router.post("/", verifyAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const {
    name,
    packing,
    productType,
    mrp,
    salePrice,
    ptr,
    gstRate,
    hsn
  } = req.body;

  if (!name || !mrp) {
    return res.status(400).json({ message: "Name & MRP required" });
  }

  const product = {
    name,
    packing: packing || "",
    productType: productType || "",
    mrp: Number(mrp),
    salePrice: Number(salePrice || mrp),
    ptr: Number(ptr || 0),
    gstRate: Number(gstRate || 0),
    hsn: hsn || "",
    stock: 0,
    isActive: true,
    createdAt: new Date()
  };

  const ref = await db.collection("products").add(product);

  res.json({
    id: ref.id,
    message: "Product created"
  });
});

/**
 * LIST PRODUCTS (ALL LOGGED USERS)
 */
router.get("/", verifyAuth, async (req, res) => {
  const snapshot = await db
    .collection("products")
    .orderBy("createdAt", "desc")
    .get();

  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.json(products);
});

/**
 * ACTIVATE / DEACTIVATE PRODUCT (ADMIN ONLY)
 */
router.patch("/:id/status", verifyAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const { isActive } = req.body;

  await db.collection("products")
    .doc(req.params.id)
    .update({ isActive });

  res.json({ message: "Status updated" });
});

module.exports = router;
