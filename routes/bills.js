const express = require("express");
const router = express.Router();
const verifyAuth = require("../middleware/auth");
const { db } = require("../firebase");

// Create bill
router.post("/", verifyAuth, async (req, res) => {
  const { items, paymentMode, discount = 0, customerMobile = "" } = req.body;

  let subTotal = 0;
  const batch = db.batch();

  for (const item of items) {
    const productRef = db.collection("products").doc(item.productId);
    const snap = await productRef.get();

    if (!snap.exists) {
      return res.status(400).json({ message: "Product not found" });
    }

    const product = snap.data();

    if (product.stock < item.qty) {
      return res.status(400).json({
        message: `Insufficient stock for ${product.name}`
      });
    }

    const total = product.salePrice * item.qty;
    item.name = product.name;
    item.price = product.salePrice;
    item.total = total;

    subTotal += total;

    batch.update(productRef, {
      stock: product.stock - item.qty
    });
  }

  const grandTotal = subTotal - discount;

  const billRef = db.collection("bills").doc();

  batch.set(billRef, {
    billNo: "INV-" + Date.now(),
    items,
    subTotal,
    discount,
    grandTotal,
    paymentMode,
    customerMobile,
    createdBy: req.user.uid,
    createdAt: new Date()
  });

  await batch.commit();

  res.json({ message: "Bill created", billId: billRef.id });
});

// Bill history
router.get("/", verifyAuth, async (req, res) => {
  const snap = await db
    .collection("bills")
    .orderBy("createdAt", "desc")
    .get();

  res.json(
    snap.docs.map(d => ({ id: d.id, ...d.data() }))
  );
});

// Single bill
router.get("/:id", verifyAuth, async (req, res) => {
  const doc = await db.collection("bills").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ message: "Not found" });
  res.json({ id: doc.id, ...doc.data() });
});

module.exports = router;
