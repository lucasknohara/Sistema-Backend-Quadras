const db = require("../infraestrutura/conexão");

class AgendamentoModel {
  async verificarReferencias() {
    try {
      const formasPagamento = await this.queryPromise(
        "SELECT ID_FormaPagamento FROM FormaPagamento LIMIT 1"
      );
      const statusPagamento = await this.queryPromise(
        "SELECT ID_StatusPagamento FROM StatusPagamento LIMIT 1"
      );

      return formasPagamento.length > 0 && statusPagamento.length > 0;
    } catch (error) {
      console.error("Erro ao verificar referências:", error);
      return false;
    }
  }

  async criar({ ID_Usuario, ID_Quadra, horarios, total, data }) {
    const referenciasValidas = await this.verificarReferencias();
    if (!referenciasValidas) {
      throw new Error(
        "Configuração do sistema incompleta - verifique FormaPagamento e StatusPagamento"
      );
    }

    // Garante formatação consistente dos horários
    const horariosFormatados = horarios.map(h => {
      if (typeof h === 'object' && h.horarioStr) {
        return h.horarioStr.trim(); // Se vier do frontend como objeto
      }
      return String(h).trim(); // Converte para string e remove espaços
    });

    return new Promise((resolve, reject) => {
      db.beginTransaction(async (beginErr) => {
        if (beginErr) return reject(beginErr);

        try {
          // 1. Insere o agendamento com horários formatados
          const result = await this.queryPromise(
            `INSERT INTO Agendamento 
             (ID_Usuario, ID_Quadra, ID_FormaPagamento, ID_StatusPagamento, DataAgendamento, Preco, Horarios) 
             VALUES (?, ?, 1, 2, ?, ?, ?)`,
            [ID_Usuario, ID_Quadra, data, total, JSON.stringify(horariosFormatados)]
          );

          // 2. Insere no histórico
          await this.queryPromise(
            `INSERT INTO HistoricoPagamento 
             (ID_Agendamento, Preco, DataPagamento) 
             VALUES (?, ?, NOW())`,
            [result.insertId, total]
          );

          // 3. Busca os dados completos
          const agendamentoCompleto = await this.queryPromise(
            `SELECT a.*, q.NomeQuadra, q.EnderecoQuadra, s.StatusPagamento
             FROM Agendamento a
             JOIN Quadra q ON a.ID_Quadra = q.ID_Quadra
             JOIN StatusPagamento s ON a.ID_StatusPagamento = s.ID_StatusPagamento
             WHERE a.ID_Agendamento = ?`,
            [result.insertId]
          );

          if (agendamentoCompleto.length === 0) {
            throw new Error(
              "Agendamento criado mas não foi possível recuperar os dados"
            );
          }

          await this.commitPromise();

          resolve({
            ...agendamentoCompleto[0],
            horarios: JSON.parse(agendamentoCompleto[0].Horarios || "[]"),
            DataFormatada: this.formatarData(
              agendamentoCompleto[0].DataAgendamento
            ),
            ID_Agendamento: result.insertId,
          });
        } catch (error) {
          await this.rollbackPromise();
          console.error("Erro no modelo:", error);
          reject(new Error(`Falha ao criar agendamento: ${error.message}`));
        }
      });
    });
  }

  async listarPorUsuario(ID_Usuario) {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT 
        a.ID_Agendamento,
        a.ID_Quadra,
        a.DataAgendamento,
        a.Horarios,
        a.Preco,
        q.NomeQuadra,
        q.EnderecoQuadra,
        s.StatusPagamento
       FROM Agendamento a
       LEFT JOIN Quadra q ON a.ID_Quadra = q.ID_Quadra
       LEFT JOIN StatusPagamento s ON a.ID_StatusPagamento = s.ID_StatusPagamento
       WHERE a.ID_Usuario = ?
       ORDER BY a.ID_Agendamento DESC`,
        [ID_Usuario],
        (err, results) => {
          if (err) {
            console.error("Erro ao buscar agendamentos:", err);
            reject(err);
          } else {
            const agendamentos = results.map((ag) => ({
              ...ag,
              Horarios: JSON.parse(ag.Horarios || "[]"),
              DataAgendamento: ag.DataAgendamento
                ? new Date(ag.DataAgendamento).toISOString()
                : null,
            }));
            resolve(agendamentos);
          }
        }
      );
    });
  }

  // Novo método para debug e verificação
  async listarAgendamentosPorData(ID_Quadra, data) {
    try {
      const results = await this.queryPromise(
        `SELECT Horarios FROM Agendamento 
         WHERE ID_Quadra = ? AND DATE(DataAgendamento) = ?`,
        [ID_Quadra, data]
      );
      
      return results.map(r => {
        try {
          return JSON.parse(r.Horarios);
        } catch (e) {
          console.error("Erro ao parsear horários:", r.Horarios);
          return [];
        }
      }).flat();
    } catch (error) {
      console.error("Erro ao listar agendamentos por data:", error);
      return [];
    }
  }

  // Helper methods
  queryPromise(sql, params) {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) {
          console.error("Erro na query:", sql, params, err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  }

  commitPromise() {
    return new Promise((resolve, reject) => {
      db.commit((err) => {
        if (err) {
          console.error("Erro no commit:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  rollbackPromise() {
    return new Promise((resolve, reject) => {
      db.rollback((err) => {
        if (err) {
          console.error("Erro no rollback:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  formatarData(data) {
    try {
      const d = new Date(data);
      return isNaN(d.getTime())
        ? "Data inválida"
        : d.toLocaleDateString("pt-BR");
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
  }
}

module.exports = new AgendamentoModel();