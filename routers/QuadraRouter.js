const express = require("express");
const router = express.Router();
const conexao = require("../infraestrutura/conexão");

// Listar todas as quadras com o nome dos esportes
router.get("/", async (req, res) => {
  const sql = `
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
      GROUP_CONCAT(DISTINCT e.Nome) AS NomeEsportes
    FROM Quadra q
    LEFT JOIN QuadraEsportes qe ON q.ID_Quadra = qe.ID_Quadra
    LEFT JOIN Esportes e ON qe.ID_Esporte = e.ID_Esporte
    GROUP BY q.ID_Quadra
    ORDER BY q.Acessos DESC
  `;

  conexao.query(sql, (error, resultados) => {
    if (error) return res.status(500).json({ erro: error.message });
    res.json(resultados);
  });
});

// Filtrar quadras
router.get("/filtrar", async (req, res) => {
  try {
    const { local, esporte, tipoQuadra, pesquisa } = req.query;
    let sql = `
      SELECT 
        q.*, 
        GROUP_CONCAT(DISTINCT e.Nome) AS Esportes
      FROM Quadra q
      LEFT JOIN QuadraEsportes qe ON q.ID_Quadra = qe.ID_Quadra
      LEFT JOIN Esportes e ON qe.ID_Esporte = e.ID_Esporte
      WHERE 1=1
    `;
    const params = [];

    if (pesquisa) {
      const [esportes] = await conexao
        .promise()
        .query("SELECT Nome FROM Esportes WHERE Nome LIKE ?", [
          `%${pesquisa}%`,
        ]);

      if (esportes.length > 0) {
        sql += ` AND e.Nome = ?`;
        params.push(pesquisa);
      } else {
        const termo = `%${pesquisa}%`;
        sql += ` AND (
          q.NomeQuadra LIKE ?
          OR q.Descricao LIKE ?
          OR q.Bairro LIKE ?
          OR q.Cidade LIKE ?
          OR q.Regiao LIKE ?
        )`;
        params.push(termo, termo, termo, termo, termo);
      }
    }

    if (local) {
      sql += " AND (q.Cidade LIKE ? OR q.Bairro LIKE ? OR q.Regiao LIKE ?)";
      params.push(`%${local}%`, `%${local}%`, `%${local}%`);
    }

    if (esporte) {
      const esportesArray = esporte
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (esportesArray.length > 0) {
        sql += ` AND e.Nome IN (${esportesArray.map(() => "?").join(",")})`;
        params.push(...esportesArray);
      }
    }

    if (tipoQuadra) {
      sql += `
    AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(q.TipoQuadra, 'ú', 'u'), 'Ú', 'u'), 'á', 'a'), 'Á', 'a'), ' ', '')) = ?
  `;
      const tipoNormalizado = tipoQuadra
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace("ú", "u")
        .replace("á", "a");
      params.push(tipoNormalizado);
    }

    sql += " GROUP BY q.ID_Quadra";

    if (esporte) {
      const esportesArray = esporte
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (esportesArray.length > 0) {
        sql += ` HAVING SUM(e.Nome IN (${esportesArray
          .map(() => "?")
          .join(",")})) > 0`;
        params.push(...esportesArray);
      }
    }

    const [results] = await conexao.promise().query(sql, params);
    const quadrasFormatadas = results.map((quadra) => ({
      ...quadra,
      Esportes: quadra.Esportes ? quadra.Esportes.split(",") : [],
    }));

    res.json(quadrasFormatadas);
  } catch (error) {
    console.error("Erro ao filtrar quadras:", error);
    res
      .status(500)
      .json({ error: "Erro ao filtrar quadras", details: error.message });
  }
});

// Listar esportes de uma quadra
router.get("/:id/esportes", (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT e.ID_Esporte, e.Nome
    FROM Esportes e
    JOIN QuadraEsportes qe ON e.ID_Esporte = qe.ID_Esporte
    WHERE qe.ID_Quadra = ?
  `;
  conexao.query(sql, [id], (error, resultados) => {
    if (error) return res.status(500).json({ erro: error.message });
    res.json(resultados);
  });
});

// Listar horários disponíveis de uma quadra
router.get("/:id/horarios", async (req, res) => {
  const idQuadra = req.params.id;
  const dataRequisitada = req.query.data;

  if (!dataRequisitada || !/^\d{4}-\d{2}-\d{2}$/.test(dataRequisitada)) {
    return res
      .status(400)
      .json({ erro: "Formato de data inválido. Use YYYY-MM-DD" });
  }

  try {
    const [indisponivel] = await conexao.promise().query(
      `SELECT 1 FROM DiasIndisponiveis 
       WHERE ID_Quadra = ? AND ? BETWEEN DataInicio AND DataFim`,
      [idQuadra, dataRequisitada]
    );

    if (indisponivel.length > 0) {
      return res.json({
        sucesso: true,
        horarios: [],
        mensagem: "Dia indisponível",
      });
    }

    const [horariosConfig] = await conexao.promise().query(
      `SELECT ID_Config, Horarios, Preco 
       FROM HorariosQuadra 
       WHERE ID_Quadra = ? AND ? BETWEEN DataInicio AND DataFim`,
      [idQuadra, dataRequisitada]
    );

    let todosHorarios = [];
    horariosConfig.forEach((item) => {
      try {
        const listaHorarios = JSON.parse(item.Horarios);
        listaHorarios.forEach((horarioStr) => {
          const [inicio, fim] = String(horarioStr)
            .split("-")
            .map((s) => s.trim());
          if (inicio && fim) {
            todosHorarios.push({
              inicio,
              fim,
              preco: item.Preco,
              id: `${item.ID_Config}-${inicio}-${fim}`,
              horarioStr: `${inicio}-${fim}`,
            });
          }
        });
      } catch (e) {
        console.error("Erro ao processar horários:", e);
      }
    });

    const [agendamentos] = await conexao.promise().query(
      `SELECT a.Horarios 
       FROM Agendamento a
       JOIN StatusPagamento sp ON a.ID_StatusPagamento = sp.ID_StatusPagamento
       WHERE a.ID_Quadra = ? 
       AND DATE(a.DataAgendamento) = ?
       AND sp.StatusPagamento IN ('pago', 'pendente')`,
      [idQuadra, dataRequisitada]
    );

    const horariosOcupados = new Set();
    agendamentos.forEach((ag) => {
      try {
        const horariosAg = JSON.parse(ag.Horarios);
        horariosAg.forEach((h) => {
          const horarioNormalizado = String(h).trim().replace(/\s+/g, "");
          horariosOcupados.add(horarioNormalizado);
        });
      } catch (e) {
        console.error("Erro ao processar agendamento:", ag.Horarios, e);
      }
    });

    const horariosLivres = todosHorarios.filter((horario) => {
      const horarioNormalizado = horario.horarioStr.replace(/\s+/g, "");
      return !horariosOcupados.has(horarioNormalizado);
    });

    res.json({ sucesso: true, horarios: horariosLivres });
  } catch (error) {
    console.error("Erro ao buscar horários:", error);
    res
      .status(500)
      .json({ sucesso: false, erro: "Erro interno", detalhes: error.message });
  }
});

// Buscar informações completas de uma quadra
router.get("/:id", (req, res) => {
  const id = req.params.id;
  const sqlQuadra = "SELECT * FROM Quadra WHERE ID_Quadra = ?";

  conexao.query(sqlQuadra, [id], (error, quadraResult) => {
    if (error) return res.status(500).json({ erro: error.message });
    if (quadraResult.length === 0)
      return res.status(404).json({ erro: "Quadra não encontrada" });

    const quadra = quadraResult[0];
    const sqlEsportes = `
      SELECT e.Nome
      FROM Esportes e
      JOIN QuadraEsportes qe ON e.ID_Esporte = qe.ID_Esporte
      WHERE qe.ID_Quadra = ?
    `;

    conexao.query(sqlEsportes, [id], (error, esportesResult) => {
      if (error) return res.status(500).json({ erro: error.message });
      const resposta = {
        ...quadra,
        Esportes: esportesResult.map((e) => e.Nome),
      };
      res.json(resposta);
    });
  });
});

// Listar dias disponíveis para uma quadra
router.get("/:id/dias-disponiveis", async (req, res) => {
  const idQuadra = req.params.id;
  const hoje = new Date();
  hoje.setDate(hoje.getDate() - 1);
  const dataAtual = hoje.toISOString().slice(0, 10);

  try {
    const [configs] = await conexao.promise().query(
      `SELECT DataInicio, DataFim FROM HorariosQuadra 
       WHERE ID_Quadra = ? AND DataFim >= ?`,
      [idQuadra, dataAtual]
    );

    const [indisponiveis] = await conexao.promise().query(
      `SELECT DataInicio, DataFim FROM DiasIndisponiveis 
       WHERE ID_Quadra = ? AND DataFim >= ?`,
      [idQuadra, dataAtual]
    );

    const diasIndisponiveis = new Set();
    indisponiveis.forEach(({ DataInicio, DataFim }) => {
      let data = new Date(DataInicio);
      const fim = new Date(DataFim);
      while (data <= fim) {
        diasIndisponiveis.add(data.toISOString().slice(0, 10));
        data.setDate(data.getDate() + 1);
      }
    });

    const diasDisponiveis = new Set();
    configs.forEach(({ DataInicio, DataFim }) => {
      let data = new Date(DataInicio);
      const fim = new Date(DataFim);
      while (data <= fim) {
        const dia = data.toISOString().slice(0, 10);
        if (!diasIndisponiveis.has(dia)) diasDisponiveis.add(dia);
        data.setDate(data.getDate() + 1);
      }
    });

    res.json([...diasDisponiveis].sort());
  } catch (error) {
    console.error("Erro ao buscar dias disponíveis:", error);
    res.status(500).json({ erro: "Erro interno", detalhes: error.message });
  }
});

module.exports = router;
