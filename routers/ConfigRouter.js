const { Router } = require("express");
const ConfigController = require("../controllers/ConfigControllers");
const verificarToken = require("../Segurança");

const router = Router();

router.get("/", verificarToken, ConfigController.getInfo);
router.put("/", verificarToken, ConfigController.atualizarInfo);

module.exports = router;