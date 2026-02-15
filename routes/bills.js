const express = require("express");
const verifyAuth = require("../middleware/auth");
const { db } = require("../firebase");
const PDFDocument = require("pdfkit");
const path = require("path");

const router = express.Router();

/* ================= CREATE BILL ================= */

router.post("/", verifyAuth, async (req, res) => {
  try {
    const { items, total, paymentMethod, customerMobile } = req.body;

    const billNo = "BILL" + Date.now();

    // 🔥 STOCK DEDUCTION
    for (let item of items) {

      const ref = db.collection("products").doc(item.productId);
      const product = await ref.get();

      if (!product.exists)
        return res.status(404).json({ message: "Product not found" });

      const currentStock = product.data().stock || 0;

      if (currentStock < item.qty)
        return res.status(400).json({ message: "Insufficient stock" });

      await ref.update({
        stock: currentStock - Number(item.qty)
      });
    }

    // 🔥 SAVE BILL
    await db.collection("bills").add({
      billNo,
      items,
      total: Number(total),
      paymentMethod,
      customerMobile,
      createdAt: new Date()
    });

    res.json({ message: "Bill created", billNo });

  } catch (err) {
    console.error("CREATE BILL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET BILLS ================= */

router.get("/", verifyAuth, async (req, res) => {
  try {
    const snapshot = await db.collection("bills")
      .orderBy("createdAt", "desc")
      .get();

    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(bills);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= PROFESSIONAL GST A4 PDF ================= */

router.get("/:id/pdf", verifyAuth, async (req, res) => {

  try {

    const billDoc = await db.collection("bills")
      .doc(req.params.id)
      .get();

    if (!billDoc.exists)
      return res.status(404).json({ message: "Bill not found" });

    const bill = billDoc.data();

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${bill.billNo}.pdf`
    );

    doc.pipe(res);

    /* ===== LOGO ===== */
    const logoPath = path.join(__dirname, "../logo.png");
    doc.image(logoPath, 50, 30, { width: 80 });

    doc.moveDown(3);

    /* ===== HEADER ===== */
    doc.fontSize(20).text("SHIVA BALAJI MEDICAL", { align: "center" });
    doc.fontSize(12).text("GSTIN: XXXXXXXX", { align: "center" });
    doc.moveDown(2);

    doc.fontSize(12).text(`Invoice No: ${bill.billNo}`);
    doc.text(`Date: ${new Date(bill.createdAt).toLocaleString()}`);
    doc.text(`Customer Mobile: ${bill.customerMobile || "-"}`);
    doc.text(`Payment Method: ${bill.paymentMethod}`);
    doc.moveDown();

    doc.text("------------------------------------------------------------");

    /* ===== ITEMS ===== */
    bill.items.forEach((item, index) => {

      doc.fontSize(12).text(`${index + 1}. ${item.productName}`);
      doc.text(`HSN: ${item.hsn || "-"}`);
      doc.text(`Batch: ${item.batchNo || "-"}`);
      doc.text(`Expiry: ${item.expiry || "-"}`);

      doc.text(
        `Qty: ${item.qty}  |  Price: ₹ ${item.price}  |  Total: ₹ ${item.price * item.qty}`
      );

      doc.moveDown();
    });

    doc.text("------------------------------------------------------------");

    /* ===== TOTAL ===== */
    doc.moveDown();
    doc.fontSize(14).text(
      `Grand Total: ₹ ${Number(bill.total).toFixed(2)}`,
      { align: "right" }
    );

    doc.moveDown(3);

    /* ===== FOOTER ===== */
    doc.fontSize(12).text("Thank You! Visit Again.", { align: "center" });
    doc.text("This is a computer generated invoice.", { align: "center" });

    doc.end();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= DELETE BILL WITH ROLLBACK ================= */

router.delete("/:id", verifyAuth, async (req, res) => {
  try {

    const billRef = db.collection("bills").doc(req.params.id);
    const billSnap = await billRef.get();

    if (!billSnap.exists) {
      return res.status(404).json({ message: "Bill not found" });
    }

    const bill = billSnap.data();

    // 🔁 RESTORE STOCK USING productId (SAFE)
    for (let item of bill.items) {

      const productRef = db.collection("products").doc(item.productId);
      const productSnap = await productRef.get();

      if (productSnap.exists) {

        const currentStock = productSnap.data().stock || 0;

        await productRef.update({
          stock: currentStock + Number(item.qty)
        });
      }
    }

    // 🗑 DELETE BILL
    await billRef.delete();

    res.json({ message: "Bill deleted & stock restored" });

  } catch (err) {
    console.error("DELETE BILL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
