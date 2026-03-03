const ConfigModels = require("../models/configModels");

const ConfigController = {
  async getInfo(req, res) {
    try {
      const idUsuario = req.usuario.id;
      const usuario = await ConfigModels.buscarPorId(idUsuario);

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Retorna apenas os dados necessários
      const userData = {
        NomeUsuario: usuario.NomeUsuario,
        Email: usuario.Email,
        CPF: usuario.CPF
      };

      res.json(userData);
    } catch (erro) {
      console.error("Erro ao buscar informações:", erro);
      res.status(500).json({ error: "Erro interno ao buscar informações" });
    }
  },

  async atualizarInfo(req, res) {
    try {
      const idUsuario = req.usuario.id;
      const { NomeUsuario, Email, Senha } = req.body;

      // Validações básicas
      if (NomeUsuario && NomeUsuario.length < 3) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 3 caracteres" });
      }

      if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) {
        return res.status(400).json({ error: "Email inválido" });
      }

      if (Senha && Senha.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      const atualizacoes = {};
      if (NomeUsuario) atualizacoes.NomeUsuario = NomeUsuario;
      if (Email) atualizacoes.Email = Email;
      if (Senha) atualizacoes.Senha = Senha;

      await ConfigModels.atualizarInformacoes(idUsuario, atualizacoes);

      const usuarioAtualizado = await ConfigModels.buscarPorId(idUsuario);
      
      // Retorna os dados atualizados (sem a senha)
      res.json({
        NomeUsuario: usuarioAtualizado.NomeUsuario,
        Email: usuarioAtualizado.Email,
        CPF: usuarioAtualizado.CPF
      });
    } catch (erro) {
      console.error("Erro ao atualizar informações:", erro);
      res.status(500).json({ error: "Erro interno ao atualizar informações" });
    }
  },
};

module.exports = ConfigController;