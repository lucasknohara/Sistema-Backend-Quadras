const jwt = require("jsonwebtoken");
const JWT_SECRET = "PingoMaisMelhor";

function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(403).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded; // salva o usuário decodificado na requisição
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token inválido" });
  }
}

module.exports = verificarToken;