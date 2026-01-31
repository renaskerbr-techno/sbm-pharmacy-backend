const express = require("express");
const router = express.Router();
const verifyAuth = require("../middleware/auth");
const { db } = require("../firebase");

/**
 * CREATE RETURN
 */
router.post("/", verifyAuth, async (req, res) => {
  const { billId, items } = req.body;

  if (!billId || !items || items.length === 0) {
    return res.status(400).json({ message: "Invalid return data" });
  }

  const billRef = db.collection("bills").doc(billId);
  const billSnap = await billRef.get();

  if (!billSnap.exists) {
    return res.status(404).json({ message: "Bill not found" });
  }

  const bill = billSnap.data();
  let refundAmount = 0;

  const batch = db.batch();

  for (const item of items) {
    const productRef = db.collection("products").doc(item.productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) continue;

    const product = productSnap.data();

    // Increase stock back
    batch.update(productRef, {
      stock: product.stock + item.qty
    });

    refundAmount += item.qty * item.price;
  }

  const returnRef = db.collection("returns").doc();

  batch.set(returnRef, {
    billId,
    billNo: bill.billNo,
    items,
    refundAmount,
    createdBy: req.user.uid,
    createdAt: new Date()
  });

  await batch.commit();

  res.json({
    message: "Return processed",
    refundAmount
  });
});

/**
 * LIST RETURNS
 */
router.get("/", verifyAuth, async (req, res) => {
  const snap = await db
    .collection("returns")
    .orderBy("createdAt", "desc")
    .get();

  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

module.exports = router;
