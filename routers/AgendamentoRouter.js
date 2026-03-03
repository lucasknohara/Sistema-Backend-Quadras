const express = require('express');
const router = express.Router();
const AgendamentoController = require('../controllers/AgendamentoController');

router.post('/', AgendamentoController.criarAgendamento);
router.get('/usuario/:ID_Usuario', AgendamentoController.listarPorUsuario);

module.exports = router;