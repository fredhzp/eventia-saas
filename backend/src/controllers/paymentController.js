const processWebhook = async (req, res) => {
  try {
    const payload = req.body;
    console.log("Payment webhook received:", payload);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

module.exports = { processWebhook };
