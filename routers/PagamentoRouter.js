const express = require("express");
const mercadopago = require("mercadopago");
const router = express.Router();

// Access Token de desenvolvimento
mercadopago.configure({
  access_token:
    "TEST-7502362823588099-061214-1353843c320283b63da3f53c88eab748-2177293616",
});

router.post("/criar-pagamento-pix", async (req, res) => {
  const { total, email, descricao } = req.body;

  try {
    const pagamentoPix = await mercadopago.payment.create({
      transaction_amount: Number(total),
      description: descricao,
      payment_method_id: "pix",
      payer: {
        email: email,
        first_name: "Cliente",
      },
    });

    res.status(200).json({
      id: pagamentoPix.body.id,
      qr_code: pagamentoPix.body.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: pagamentoPix.body.point_of_interaction.transaction_data.qr_code_base64,
    });
  } catch (error) {
    console.error("Erro ao criar pagamento Pix:", error);
    res.status(500).json({ error: "Erro ao criar pagamento Pix" });
  }
});

module.exports = router;
