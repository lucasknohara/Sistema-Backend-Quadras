const agendamentoModel = require("../models/agendamentoModels");

module.exports = {
  criarAgendamento: async function (req, res) {
    try {
      const { ID_Usuario, ID_Quadra, horarios, total, data } = req.body;

      // Validação dos dados de entrada
      if (!ID_Usuario || !ID_Quadra || !total || !data) {
        return res.status(400).json({
          success: false,
          error: "Dados incompletos",
          campos_necessarios: {
            ID_Usuario: "number",
            ID_Quadra: "number",
            total: "number",
            data: "string (formato YYYY-MM-DD)",
            horarios: "array",
          },
          dados_recebidos: req.body,
        });
      }

      // Validação adicional dos horários
      if (!Array.isArray(horarios)) {
        return res.status(400).json({
          success: false,
          error: "Horários devem ser um array",
          horarios_recebidos: horarios,
        });
      }

      // Cria o agendamento
      const novoAgendamento = await agendamentoModel.criar({
        ID_Usuario,
        ID_Quadra,
        horarios,
        total,
        data,
      });

      // Resposta de sucesso
      return res.status(201).json({
        success: true,
        message: "Agendamento criado com sucesso",
        data: {
          ID_Agendamento: novoAgendamento.ID_Agendamento,
          Quadra: novoAgendamento.NomeQuadra,
          Endereco: novoAgendamento.EnderecoQuadra,
          Data: novoAgendamento.DataFormatada,
          Horarios: novoAgendamento.horarios,
          Status: novoAgendamento.StatusPagamento,
          Preco: novoAgendamento.Preco,
        },
      });
    } catch (error) {
      console.error("Erro no controller de agendamento:", {
        error: error.message,
        stack: error.stack,
        body: req.body,
      });

      // Tratamento específico para erros de validação do modelo
      if (error.message.includes("Configuração do sistema incompleta")) {
        return res.status(500).json({
          success: false,
          error: "Erro de configuração do sistema",
          details: "Verifique as tabelas FormaPagamento e StatusPagamento",
        });
      }

      // Resposta genérica de erro
      return res.status(500).json({
        success: false,
        error: "Erro ao processar agendamento",
        details:
          process.env.NODE_ENV === "development"
            ? {
                message: error.message,
                stack: error.stack,
              }
            : undefined,
      });
    }
  },

  listarPorUsuario: async function (req, res) {
    try {
      const ID_Usuario = req.params.ID_Usuario;

      if (!ID_Usuario || isNaN(ID_Usuario)) {
        return res.status(400).json({
          success: false,
          error: "ID_Usuario inválido",
        });
      }

      const agendamentos = await agendamentoModel.listarPorUsuario(ID_Usuario);

      // Formatação robusta da resposta
      const resposta = agendamentos.map((ag) => {
        let dataFormatada = "Data inválida";
        try {
          if (ag.DataAgendamento) {
            const data = new Date(ag.DataAgendamento);
            if (!isNaN(data.getTime())) {
              dataFormatada = data.toLocaleDateString("pt-BR");
            }
          }
        } catch (e) {
          console.error("Erro ao formatar data:", e);
        }

        return {
          ID_Agendamento: ag.ID_Agendamento,
          Quadra: ag.NomeQuadra,
          Endereco: ag.EnderecoQuadra,
          Data: dataFormatada,
          Horarios: Array.isArray(ag.Horarios) ? ag.Horarios : [],
          Status: ag.StatusPagamento,
          Preco: ag.Preco ? parseFloat(ag.Preco).toFixed(2) : "0.00",
        };
      });

      return res.json({
        success: true,
        data: resposta,
      });
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar agendamentos",
      });
    }
  },
};
