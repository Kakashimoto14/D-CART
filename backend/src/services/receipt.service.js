import PDFDocument from "pdfkit";
import { env } from "../config/env.js";

export class ReceiptService {
  createOrderReceipt(order) {
    const document = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `dcart-order-${order.id}-receipt.pdf`;

    document.fontSize(20).text(env.appName, { align: "left" });
    document.moveDown(0.2);
    document.fontSize(11).text("Order Receipt");
    document.moveDown();

    document.fontSize(10).text(`Receipt Date: ${new Date().toLocaleDateString("en-PH")}`);
    document.text(`Order ID: ${order.id}`);
    document.text(`Order Status: ${order.status}`);
    document.text(`Customer: ${order.user.name}`);
    document.text(`Email: ${order.user.email}`);
    document.moveDown();

    if (order.delivery) {
      document.fontSize(12).text("Delivery Details");
      document.fontSize(10).text(`Address: ${order.delivery.address}`);
      document.text(
        `Delivery Window: ${
          order.deliverySlot ? `${order.deliverySlot.startTime} - ${order.deliverySlot.endTime}` : "No slot selected"
        }`
      );
      document.moveDown();
    }

    document.fontSize(12).text("Items");
    document.moveDown(0.5);

    order.items.forEach((item) => {
      const lineTotal = Number(item.price) * item.quantity;
      document
        .fontSize(10)
        .text(
          `${item.product.name} x ${item.quantity} - PHP ${lineTotal.toFixed(2)}`
        );

      if (item.substituteProduct) {
        document
          .fontSize(9)
          .fillColor("#b45309")
          .text(`Substituted with: ${item.substituteProduct.name}`);
        document.fillColor("#000000");
      }
    });

    document.moveDown();
    document.fontSize(12).text("Totals");
    document.fontSize(10).text(`Subtotal: PHP ${Number(order.subtotal).toFixed(2)}`);
    document.text(`Delivery Fee: PHP ${Number(order.deliveryFee).toFixed(2)}`);
    document.text(`Grand Total: PHP ${Number(order.total).toFixed(2)}`);
    document.moveDown();
    document.text(
      `Payment Method: ${order.paymentMethod === "GCASH" ? "GCash via PayMongo" : "Cash on Delivery"}`
    );
    document.text(`Payment Status: ${order.paymentStatus}`);

    return {
      stream: document,
      filename
    };
  }
}
