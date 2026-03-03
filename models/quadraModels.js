const conexao = require("../infraestrutura/conexão");

class QuadrasModels {
  async buscarPorFiltros(filtros) {
    const parametros = [];

    let sql = `
    SELECT
      q.ID_Quadra AS ID,
      q.NomeQuadra,
      q.EnderecoQuadra,
      q.TipoQuadraFisica,
      q.Acessos,
      q.Foto,
      q.Cidade,
      q.Bairro,
      q.TipoQuadra AS Tipo,
      e.Nome AS NomeEsporte
    FROM Quadra q
    LEFT JOIN QuadraEsportes qe ON q.ID_Quadra = qe.ID_Quadra
    LEFT JOIN Esportes e ON qe.ID_Esporte = e.ID_Esporte
    WHERE 1=1
  `;

    // Filtros dinâmicos
    if (filtros.esporte) {
      sql += " AND e.Nome LIKE ?";
      parametros.push(`%${filtros.esporte}%`);
    }

    if (filtros.nome) {
      sql += " AND (q.NomeQuadra LIKE ? OR e.Nome LIKE ?)";
      parametros.push(`%${filtros.nome}%`, `%${filtros.nome}%`);
    }

    if (filtros.local) {
      sql += " AND (q.Cidade LIKE ? OR q.Bairro LIKE ?)";
      parametros.push(`%${filtros.local}%`, `%${filtros.local}%`);
    }

    if (filtros.tipoQuadra) {
      sql += " AND q.TipoQuadra = ?";
      parametros.push(filtros.tipoQuadra);
    }

    sql += " ORDER BY q.Acessos DESC";

    return this.executaQuery(sql, parametros);
  }

  executaQuery(sql, parametros = []) {
    return new Promise((resolve, reject) => {
      conexao.query(sql, parametros, (error, resultados) => {
        if (error) {
          return reject(error);
        }
        return resolve(resultados);
      });
    });
  }
}

module.exports = new QuadrasModels();
