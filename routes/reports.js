const express = require("express");
const verifyAuth = require("../middleware/auth");
const { db } = require("../firebase");

const router = express.Router();

/* ================= LOW STOCK PREDICTION ================= */

router.get("/low-stock-prediction", verifyAuth, async (req, res) => {

  const billsSnap = await db.collection("bills").get();
  const productsSnap = await db.collection("products").get();

  const bills = billsSnap.docs.map(d => d.data());
  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const usageMap = {};

  // Usage in last 30 days
  bills.forEach(b => {
    const billDate = new Date(b.createdAt);
    const today = new Date();
    const diff = (today - billDate) / (1000 * 60 * 60 * 24);

    if (diff <= 30) {
      b.items.forEach(i => {
        if (!usageMap[i.productId])
          usageMap[i.productId] = 0;
        usageMap[i.productId] += i.qty;
      });
    }
  });

  const predictions = products.map(p => {
    const monthlyUsage = usageMap[p.id] || 0;
    const dailyUsage = monthlyUsage / 30;
    const daysLeft = dailyUsage > 0
      ? Math.floor(p.stock / dailyUsage)
      : 999;

    return {
      product: p.name,
      currentStock: p.stock,
      avgDailyUsage: dailyUsage.toFixed(2),
      estimatedDaysLeft: daysLeft
    };
  });

  res.json(predictions);
});

/* ================= EXPIRY REPORT ================= */

router.get("/expiry-report", verifyAuth, async (req, res) => {

  const snapshot = await db.collection("products").get();

  const products = snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  const today = new Date();

  const expiring = products.filter(p => {
    if (!p.expiry) return false;
    const exp = new Date(p.expiry);
    const diff = (exp - today) / (1000 * 60 * 60 * 24);
    return diff <= 60;
  });

  res.json(expiring);
});

/* ================= STOCK VALUATION ================= */

router.get("/stock-valuation", verifyAuth, async (req, res) => {

  const snapshot = await db.collection("products").get();

  let totalValue = 0;

  const products = snapshot.docs.map(d => {
    const data = d.data();
    const value = Number(data.stock) * Number(data.ptr);
    totalValue += value;

    return {
      name: data.name,
      stock: data.stock,
      ptr: data.ptr,
      value
    };
  });

  res.json({ totalStockValue: totalValue, products });
});

/* ================= PROFIT REPORT ================= */

router.get("/profit-report", verifyAuth, async (req, res) => {

  const billsSnap = await db.collection("bills").get();
  const productsSnap = await db.collection("products").get();

  const productsMap = {};
  productsSnap.docs.forEach(d => {
    productsMap[d.id] = d.data();
  });

  let totalProfit = 0;

  billsSnap.docs.forEach(b => {
    const bill = b.data();

    bill.items.forEach(i => {
      const product = productsMap[i.productId];
      if (!product) return;

      const profitPerUnit =
        Number(i.price) - Number(product.ptr);

      totalProfit += profitPerUnit * i.qty;
    });
  });

  res.json({ totalProfit });
});

module.exports = router;
