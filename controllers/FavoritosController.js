const FavoritosModel = require("../models/favoritosModels");

class FavoritosController {
  // Alterna entre favoritar e desfavoritar
  async toggleFavorito(req, res) {
    const { ID_Usuario, ID_Quadra } = req.body;

    try {
      const existe = await FavoritosModel.verificarExistencia(ID_Usuario, ID_Quadra);

      if (existe) {
        await FavoritosModel.deletar(ID_Usuario, ID_Quadra);
        return res.status(200).json({ isFavorito: false, message: "Removido dos favoritos" });
      } else {
        await FavoritosModel.criar({ ID_Usuario, ID_Quadra });
        return res.status(201).json({ isFavorito: true, message: "Adicionado aos favoritos" });
      }
    } catch (error) {
      console.error("Erro ao atualizar favorito:", error);
      res.status(500).json({ message: "Erro ao atualizar favorito" });
    }
  }

  // Verifica se a quadra está favoritada pelo usuário
  async verificarFavorito(req, res) {
    const { idUsuario, idQuadra } = req.params;

    try {
      const existe = await FavoritosModel.verificarExistencia(idUsuario, idQuadra);
      res.status(200).json({ isFavorito: existe });
    } catch (error) {
      console.error("Erro ao verificar favorito:", error);
      res.status(500).json({ message: "Erro ao verificar favorito" });
    }
  }

  // Lista todos os favoritos do usuário
  async listarFavoritos(req, res) {
    const { idUsuario } = req.params;

    try {
      const favoritos = await FavoritosModel.listarPorUsuario(idUsuario);
      res.status(200).json(favoritos);
    } catch (error) {
      console.error("Erro ao listar favoritos:", error);
      res.status(500).json({ message: "Erro ao listar favoritos" });
    }
  }
}

module.exports = new FavoritosController();
