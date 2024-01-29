require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());

app.use(cors());

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: req.body.items.map((item) => {
        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: item.name,
            },
            unit_amount: item.price * 100,
          },
          quantity: item.quantity,
        };
      }),
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel",
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/webhook", async (req, res) => {
  const payload = req.body;

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      req.headers["stripe-signature"],
      process.env.STRIPE_ENDPOINT_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      session.display_items.forEach((item) => {
        const productType = item.custom.productType;
        const amountPaid = item.amount_total;

        distributeFunds(productType, amountPaid);
      });
    }

    res.status(200).end();
  } catch (err) {
    console.error("Error handling webhook:", err.message);
    res.status(400).end();
  }
});

function distributeFunds(productType, amountPaid) {
  if (productType === "A") {
    const vendorShare = Math.round(amountPaid * 0.9);
    const platformShare = Math.round(amountPaid * 0.1);

    sendFundsToVendor(process.env.VENDOR_STRIPE_ACCOUNT_ID, vendorShare);
    sendFundsToPlatform(process.env.PLATFORM_STRIPE_ACCOUNT_ID, platformShare);
  } else if (productType === "B") {
    const platformShare = 25;
    const vendorShare = 25;

    sendFundsToVendor(process.env.VENDOR_STRIPE_ACCOUNT_ID, vendorShare);
    sendFundsToPlatform(process.env.PLATFORM_STRIPE_ACCOUNT_ID, platformShare);
  }
}

async function sendFundsToVendor(vendorAccountId, amount) {
  await stripe.transfers.create({
    amount,
    currency: "usd",
    destination: vendorAccountId,
  });
}

async function sendFundsToPlatform(platformAccountId, amount) {
  await stripe.transfers.create({
    amount,
    currency: "usd",
    destination: platformAccountId,
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
