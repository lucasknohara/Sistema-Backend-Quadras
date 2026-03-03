const conexao = require("../infraestrutura/conexão");

class FavoritosModel {
  // Executa a query SQL
  executaQuery(sql, parametros = []) {
    return new Promise((resolve, reject) => {
      conexao.query(sql, parametros, (error, resposta) => {
        if (error) return reject(error);
        resolve(resposta);
      });
    });
  }

  // Verifica se o favorito existe
  async verificarExistencia(ID_Usuario, ID_Quadra) {
    const sql = "SELECT * FROM Favoritos WHERE ID_Usuario = ? AND ID_Quadra = ?";
    const resultado = await this.executaQuery(sql, [ID_Usuario, ID_Quadra]);
    return resultado.length > 0;
  }

  // Cria um novo favorito
  async criar(favorito) {
    const sql = "INSERT INTO Favoritos (ID_Usuario, ID_Quadra) VALUES (?, ?)";
    const resultado = await this.executaQuery(sql, [favorito.ID_Usuario, favorito.ID_Quadra]);
    return { id: resultado.insertId, ...favorito };
  }

  // Deleta um favorito
  async deletar(ID_Usuario, ID_Quadra) {
    const sql = "DELETE FROM Favoritos WHERE ID_Usuario = ? AND ID_Quadra = ?";
    return this.executaQuery(sql, [ID_Usuario, ID_Quadra]);
  }

  // Lista os favoritos de um usuário
  async listarPorUsuario(ID_Usuario) {
    const sql = `
      SELECT q.* FROM Quadra q
      JOIN Favoritos f ON q.ID_Quadra = f.ID_Quadra
      WHERE f.ID_Usuario = ?
    `;
    return this.executaQuery(sql, [ID_Usuario]);
  }
}

module.exports = new FavoritosModel();
