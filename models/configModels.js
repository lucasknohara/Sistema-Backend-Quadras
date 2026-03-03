const conexao = require("../infraestrutura/conexão");

class ConfigModels {
  executaQuery(sql, parametros = []) {
    return new Promise((resolve, reject) => {
      conexao.query(sql, parametros, (erro, resultado) => {
        if (erro) {
          return reject(erro);
        }
        return resolve(resultado);
      });
    });
  }

  async buscarPorId(id) {
    const sql = "SELECT ID_Usuario, NomeUsuario, Email, CPF FROM Usuario WHERE ID_Usuario = ?";
    const resultado = await this.executaQuery(sql, [id]);
    return resultado.length ? resultado[0] : null;
  }

  async atualizarInformacoes(id, dadosAtualizados) {
    // Remove campos que não devem ser atualizados
    delete dadosAtualizados.CPF;
    delete dadosAtualizados.ID_Usuario;

    if (dadosAtualizados.Senha) {
    }

    const sql = "UPDATE Usuario SET ? WHERE ID_Usuario = ?";
    return this.executaQuery(sql, [dadosAtualizados, id]);
  }
}

module.exports = new ConfigModels();