const express = require("express");
const router = express.Router();
const { db, admin } = require("../firebase");

/* ================= GET ALL BILLS ================= */

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    let queryRef = db.collection("bills");

    if (search) {
      // Search by Bill No OR Mobile
      const snapshot = await queryRef.get();

      const filtered = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(bill =>
          bill.billNo?.toLowerCase().includes(search.toLowerCase()) ||
          bill.customerMobile?.includes(search)
        );

      return res.json(filtered);
    }

    // Default load all
    const snapshot = await queryRef
      .orderBy("createdAt", "desc")
      .get();

    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(bills);

  } catch (error) {
    console.error("GET BILLS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});
/* ================= CALCULATION ================= */

const calculateItemTotal = (item) => {
  const packSize = Number(item.packSize || 0);
  const unitCost = Number(item.unitCost || 0);
  const quantity = Number(item.quantity || 0);

  if (item.hsnCode === "3004") {
    if (item.mode === "Pack") {
      return packSize * unitCost * quantity;
    }
    return unitCost * quantity;
  }

  return unitCost * quantity;
};

/* ================= CREATE BILL ================= */

router.post("/", async (req, res) => {
  try {

    const { items, customerMobile, paymentMethod } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ error: "No items added" });

    let grandTotal = 0;

    const processedItems = items.map(item => {

      const cleanItem = {
        productId: item.productId || "",
        productName: item.productName || "",
        hsnCode: item.hsnCode || "",
        packSize: Number(item.packSize || 0),
        unitCost: Number(item.unitCost || 0),
        quantity: Number(item.quantity || 0),
        mode: item.mode || "Loose"
      };

      const total = calculateItemTotal(cleanItem);
      grandTotal += total;

      return {
        ...cleanItem,
        total
      };
    });

    const billNo = "BILL" + Date.now();

    const billRef = await db.collection("bills").add({
      billNo,
      items: processedItems,
      customerMobile: customerMobile || "",
      paymentMethod: paymentMethod || "Cash",
      total: grandTotal,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    /* ================= STOCK REDUCTION ================= */

    const batch = db.batch();

    processedItems.forEach(item => {

      if (!item.productId) return;

      const productRef = db.collection("products").doc(item.productId);

      let stockReduce = 0;

      if (item.hsnCode === "3004") {
        if (item.mode === "Pack") {
          stockReduce = item.packSize * item.quantity;
        } else {
          stockReduce = item.quantity;
        }
      } else {
        stockReduce = item.quantity;
      }

      batch.update(productRef, {
        stock: admin.firestore.FieldValue.increment(-stockReduce)
      });
    });

    await batch.commit();

    res.status(201).json({
      id: billRef.id,
      billNo,
      total: grandTotal
    });

  } catch (err) {
    console.error("🔥 BILL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
