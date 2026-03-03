const { Router } = require("express");
const router = Router();
const LoginController = require("../controllers/LoginController");
const verificarToken = require("../Segurança");

router.post("/login", LoginController.login);

router.post("/registro", LoginController.criar);

router.get("/usuario", verificarToken, LoginController.pegarUsuarioAutenticado);

module.exports = router;
