const express = require("express");
const router = express.Router();
const FavoritosController = require("../controllers/FavoritosController");

router.post("/", FavoritosController.toggleFavorito);

router.get("/:idUsuario/:idQuadra", FavoritosController.verificarFavorito);

router.get("/:idUsuario", FavoritosController.listarFavoritos);

module.exports = router;
