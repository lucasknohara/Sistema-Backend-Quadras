const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const app = express();
const port = 5000;
const bcrypt = require("bcrypt");
const saltRounds = 10;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const process = require("process");
const sharp = require("sharp");
//Middleware que permite Cors e tratamento de Json
app.use(
  cors({
    origin: "http://localhost:5173", // ou seu domínio de produção
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

//Conexão Mysql
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Root@123", //1234
  database: "PINGO",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Conectado ao banco de dados!");
});

//Direcionamento dos arquivos de imagem

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/// --> Sessão Quadras Pub

//Rota que vai conter os dados das quadras
app.get("/quadraspub", (req, res) => {
  db.query(`
    SELECT 
      q.*, 
      GROUP_CONCAT(e.Nome SEPARATOR ', ') as Esportes,
      DATE_FORMAT(q.DataCriacao, '%Y-%m-%d') as DataCriacao
    FROM Quadra q
    LEFT JOIN QuadraEsportes qe ON q.ID_Quadra = qe.ID_Quadra
    LEFT JOIN Esportes e ON qe.ID_Esporte = e.ID_Esporte
    WHERE q.TipoQuadra = 'publica'
    GROUP BY q.ID_Quadra
  `, (err, results) => {
    if (err) {
      console.error("Erro ao obter quadras:", err);
      return res.status(500).send("Erro ao obter quadras");
    }
    res.json(results);
  });
});

// Rota para criar uma nova quadra publica
app.post("/quadraspub", (req, res) => {
  const {
    NomeQuadra,
    EnderecoQuadra,
    Regiao,
    TipoQuadraFisica,
    Descricao,
    Cidade,
    Bairro,
    Esportes
  } = req.body;

  // Validação dos campos obrigatórios
  const camposObrigatorios = [
    NomeQuadra,
    EnderecoQuadra,
    Regiao,
    TipoQuadraFisica,
    Cidade,
    Bairro
  ];

  if (camposObrigatorios.some(campo => !campo)) {
    return res.status(400).json({
      error: "Campos obrigatórios faltando",
      requiredFields: ["NomeQuadra", "EnderecoQuadra", "Regiao", "TipoQuadraFisica", "Cidade", "Bairro"]
    });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error("Erro ao iniciar transação:", err);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }

    // Inserir a quadra
    db.query(
      "INSERT INTO Quadra (NomeQuadra, EnderecoQuadra, Regiao, TipoQuadraFisica, Descricao, Cidade, Bairro, TipoQuadra, DataCriacao) VALUES (?,?,?,?,?,?,?,?,CURRENT_DATE)",
      [
        NomeQuadra,
        EnderecoQuadra,
        Regiao,
        TipoQuadraFisica,
        Descricao || null,
        Cidade,
        Bairro,
        'publica'
      ],
      (err, result) => {
        if (err) {
          console.error("Erro ao inserir quadra:", err);
          return db.rollback(() => {
            res.status(500).json({ error: "Erro ao inserir quadra", details: err.message });
          });
        }

        const quadraId = result.insertId;

        // Inserir esportes associados se existirem
        if (Esportes && Esportes.length > 0) {
          const values = Esportes.map(esporteId => [quadraId, esporteId]);

          db.query(
            "INSERT INTO QuadraEsportes (ID_Quadra, ID_Esporte) VALUES ?",
            [values],
            (err) => {
              if (err) {
                console.error("Erro ao inserir esportes:", err);
                return db.rollback(() => {
                  res.status(500).json({ error: "Erro ao associar esportes", details: err.message });
                });
              }

              db.commit(err => {
                if (err) {
                  console.error("Erro ao commitar transação:", err);
                  return db.rollback(() => {
                    res.status(500).json({ error: "Erro ao finalizar transação", details: err.message });
                  });
                }

                res.status(201).json({
                  ID_Quadra: quadraId,
                  NomeQuadra,
                  EnderecoQuadra,
                  Regiao,
                  TipoQuadraFisica,
                  Descricao,
                  Cidade,
                  Bairro,
                  TipoQuadra: 'publica',
                  Esportes
                });
              });
            }
          );
        } else {
          db.commit(err => {
            if (err) {
              console.error("Erro ao commitar transação:", err);
              return db.rollback(() => {
                res.status(500).json({ error: "Erro ao finalizar transação", details: err.message });
              });
            }

            res.status(201).json({
              ID_Quadra: quadraId,
              NomeQuadra,
              EnderecoQuadra,
              Regiao,
              TipoQuadraFisica,
              Descricao,
              Cidade,
              Bairro,
              TipoQuadra: 'publica',
              Esportes: []
            });
          });
        }
      }
    );
  });
});

//Rota para atualizar uma quadra pública existente
app.put("/quadraspub/att/:id", (req, res) => {
  const { id } = req.params;
  const { NomeQuadra, EnderecoQuadra, Regiao, TipoQuadraFisica, Descricao, Cidade, Bairro } = req.body;

  // Validação dos campos obrigatórios
  if (!NomeQuadra || !EnderecoQuadra || !Regiao || !TipoQuadraFisica || !Cidade || !Bairro) {
    return res.status(400).json({
      error: "Campos obrigatórios faltando",
      requiredFields: ["NomeQuadra", "EnderecoQuadra", "Regiao", "TipoQuadraFisica", "Cidade", "Bairro"]
    });
  }

  db.query(
    "UPDATE Quadra SET NomeQuadra = ?, EnderecoQuadra = ?, Regiao = ?, TipoQuadraFisica = ?, Descricao = ?, Cidade = ?, Bairro = ? WHERE ID_Quadra = ?",
    [NomeQuadra, EnderecoQuadra, Regiao, TipoQuadraFisica, Descricao || null, Cidade, Bairro, id],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar quadra:", err);
        return res.status(500).json({
          error: "Erro ao atualizar quadra",
          details: err.message
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Quadra não encontrada" });
      }

      res.json({
        ID_Quadra: id,
        NomeQuadra,
        EnderecoQuadra,
        Regiao,
        TipoQuadraFisica,
        Descricao,
        Cidade,
        Bairro,
        message: "Quadra atualizada com sucesso",
      });
    }
  );
})

//Rota para deletar uma quadra de acordo com o ID
app.delete("/quadras/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Inicia uma transação para garantir atomicidade
    await db.promise().beginTransaction();

    // 1. Deleta os horários da quadra
    await db.promise().query("DELETE FROM HorariosQuadra WHERE ID_Quadra = ?", [id]);

    // 2. Deleta os dias indisponíveis
    await db.promise().query("DELETE FROM DiasIndisponiveis WHERE ID_Quadra = ?", [id]);

    // 3. Deleta os esportes associados
    await db.promise().query("DELETE FROM QuadraEsportes WHERE ID_Quadra = ?", [id]);

    // 4. Deleta os favoritos
    await db.promise().query("DELETE FROM Favoritos WHERE ID_Quadra = ?", [id]);

    // 5. Deleta os agendamentos
    await db.promise().query("DELETE FROM Agendamento WHERE ID_Quadra = ?", [id]);

    // 6. Finalmente deleta a quadra
    await db.promise().query("DELETE FROM Quadra WHERE ID_Quadra = ?", [id]);

    // Confirma a transação
    await db.promise().commit();

    res.json({ message: "Quadra deletada com sucesso" });
  } catch (err) {
    // Desfaz qualquer alteração em caso de erro
    await db.promise().rollback();
    console.error("Erro ao deletar quadra:", err);
    res.status(500).json({
      error: "Erro ao deletar quadra",
      details: err.message
    });
  }
});

//-> Single Page Quadra Pub
// BACKEND - Atualize a rota /quadraspub/:id
app.get("/quadraspub/:id", (req, res) => {
  const { id } = req.params;

  // 1. Obter informações básicas da quadra
  db.query("SELECT * FROM Quadra WHERE ID_Quadra = ?", [id], (err, quadraResults) => {
    if (err) {
      console.error("Erro ao obter quadra:", err);
      return res.status(500).send("Erro ao obter quadra");
    }

    if (quadraResults.length === 0) {
      return res.status(404).send("Quadra não encontrada");
    }

    const quadra = quadraResults[0];

    // 2. Obter esportes associados (igual ao privado)
    db.query(`
      SELECT e.ID_Esporte, e.Nome 
      FROM Esportes e
      JOIN QuadraEsportes qe ON e.ID_Esporte = qe.ID_Esporte
      WHERE qe.ID_Quadra = ?
    `, [id], (err, esportesResults) => {
      if (err) {
        console.error("Erro ao obter esportes:", err);
        return res.status(500).json({ error: "Erro ao obter esportes" });
      }

      // Montar resposta final
      const response = {
        ...quadra,
        Esportes: esportesResults
      };

      res.json({ results: [response] }); // Mantenha a estrutura de results que você está usando
    });
  });
});

/// --> Sessão Quadras Privadas BackEnd

//Rota que vai conter os dados das quadras privadas
app.get("/quadraspriv", (req, res) => {
  db.query(`
    SELECT 
      q.ID_Quadra,
      q.NomeQuadra,
      q.EnderecoQuadra,
      q.Regiao,
      q.TipoQuadraFisica,
      q.ContatoEmail,
      q.ContatoTelefone,
      q.Descricao,
      q.Foto,
      q.Cidade,
      q.Bairro,
      DATE_FORMAT(q.DataCriacao, '%Y-%m-%d') as DataCriacao,
      u.NomeUsuario as NomeProprietario,
      GROUP_CONCAT(DISTINCT e.Nome SEPARATOR ', ') as Esportes
    FROM Quadra q
    LEFT JOIN Usuario u ON q.ID_Proprietario = u.ID_Usuario
    LEFT JOIN QuadraEsportes qe ON q.ID_Quadra = qe.ID_Quadra
    LEFT JOIN Esportes e ON qe.ID_Esporte = e.ID_Esporte
    WHERE q.TipoQuadra = 'privada'
    GROUP BY q.ID_Quadra
    ORDER BY q.ID_Quadra
  `, (err, results) => {
    if (err) {
      console.error("Erro ao obter quadras privadas:", err);
      return res.status(500).json({
        error: "Erro ao obter quadras privadas",
        details: err.message
      });
    }

    console.log('Quadras privadas encontradas:', results.length); // Log para debug
    res.json(results);
  });
});



//Rota para deletar uma quadra de acordo com o ID
app.delete("/quadraspriv/:id", (req, res) => {
  const { id } = req.params;

  // Primeiro verificar se a quadra existe e é privada
  db.query(
    "SELECT ID_Quadra FROM Quadra WHERE ID_Quadra = ? AND TipoQuadra = 'privada'",
    [id],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar quadra:", err);
        return res.status(500).json({ error: "Erro ao verificar quadra" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Quadra privada não encontrada" });
      }

      // Iniciar transação para deletar todos os relacionamentos
      db.beginTransaction(err => {
        if (err) {
          console.error("Erro ao iniciar transação:", err);
          return res.status(500).json({ error: "Erro ao iniciar exclusão" });
        }

        // 1. Deletar horários
        db.query(
          "DELETE FROM HorariosQuadra WHERE ID_Quadra = ?",
          [id],
          (err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Erro ao deletar horários:", err);
                res.status(500).json({ error: "Erro ao deletar horários" });
              });
            }

            // 2. Deletar esportes associados
            db.query(
              "DELETE FROM QuadraEsportes WHERE ID_Quadra = ?",
              [id],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Erro ao deletar esportes:", err);
                    res.status(500).json({ error: "Erro ao deletar esportes" });
                  });
                }

                // 3. Deletar dias indisponíveis
                db.query(
                  "DELETE FROM DiasIndisponiveis WHERE ID_Quadra = ?",
                  [id],
                  (err) => {
                    if (err) {
                      return db.rollback(() => {
                        console.error("Erro ao deletar dias indisponíveis:", err);
                        res.status(500).json({ error: "Erro ao deletar dias indisponíveis" });
                      });
                    }

                    // 4. Finalmente deletar a quadra
                    db.query(
                      "DELETE FROM Quadra WHERE ID_Quadra = ?",
                      [id],
                      (err) => {
                        if (err) {
                          return db.rollback(() => {
                            console.error("Erro ao deletar quadra:", err);
                            res.status(500).json({ error: "Erro ao deletar quadra" });
                          });
                        }

                        db.commit(err => {
                          if (err) {
                            return db.rollback(() => {
                              console.error("Erro ao commitar transação:", err);
                              res.status(500).json({ error: "Erro ao finalizar exclusão" });
                            });
                          }

                          res.json({ message: "Quadra privada deletada com sucesso" });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    }
  );
});


app.get("/quadraspriv/:id", (req, res) => {
  const { id } = req.params;

  // 1. Obter informações básicas da quadra
  db.query(`
    SELECT 
      q.*,
      u.NomeUsuario as NomeProprietario
    FROM Quadra q
    JOIN Usuario u ON q.ID_Proprietario = u.ID_Usuario
    WHERE q.ID_Quadra = ? AND q.TipoQuadra = 'privada'
  `, [id], (err, quadraResults) => {
    if (err) {
      console.error("Erro ao obter quadra:", err);
      return res.status(500).json({ error: "Erro ao obter quadra" });
    }

    if (quadraResults.length === 0) {
      return res.status(404).json({ error: "Quadra privada não encontrada" });
    }

    const quadra = quadraResults[0];

    // 2. Obter esportes associados
    db.query(`
      SELECT e.ID_Esporte, e.Nome 
      FROM Esportes e
      JOIN QuadraEsportes qe ON e.ID_Esporte = qe.ID_Esporte
      WHERE qe.ID_Quadra = ?
    `, [id], (err, esportesResults) => {
      if (err) {
        console.error("Erro ao obter esportes:", err);
        return res.status(500).json({ error: "Erro ao obter esportes" });
      }

      // 3. Obter horários da quadra
      db.query(`
        SELECT * FROM HorariosQuadra 
        WHERE ID_Quadra = ?
        ORDER BY DataInicio
      `, [id], (err, horariosResults) => {
        if (err) {
          console.error("Erro ao obter horários:", err);
          return res.status(500).json({ error: "Erro ao obter horários" });
        }

        // 4. Montar resposta final
        const response = {
          ...quadra,
          Esportes: esportesResults,
          Horarios: horariosResults
        };

        res.json(response);
      });
    });
  });
});


//Rota para atualizar uma quadra privada existente
app.put("/quadraspriv/att/:id", (req, res) => {
  const { id } = req.params;
  const {
    NomeQuadra,
    EnderecoQuadra,
    Bairro,
    Cidade,
    Regiao,
    TipoQuadraFisica,
    Descricao,
    ContatoTelefone,
    ContatoEmail,
    Esportes // Array de IDs de esportes
  } = req.body;

  db.beginTransaction(err => {
    if (err) {
      console.error("Erro ao iniciar transação:", err);
      return res.status(500).json({ error: "Erro ao iniciar transação" });
    }

    // Atualizar informações básicas da quadra
    db.query(
      `UPDATE Quadra SET 
        NomeQuadra = ?, 
        EnderecoQuadra = ?, 
        Bairro = ?, 
        Cidade = ?,
        Regiao = ?,
        TipoQuadraFisica = ?,
        Descricao = ?,
        ContatoTelefone = ?,
        ContatoEmail = ?
      WHERE ID_Quadra = ?`,
      [
        NomeQuadra, EnderecoQuadra, Bairro, Cidade,
        Regiao, TipoQuadraFisica, Descricao,
        ContatoTelefone, ContatoEmail, id
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Erro ao atualizar quadra:", err);
            res.status(500).json({ error: "Erro ao atualizar quadra" });
          });
        }

        // Atualizar esportes (primeiro remove os existentes)
        db.query(
          "DELETE FROM QuadraEsportes WHERE ID_Quadra = ?",
          [id],
          (err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Erro ao remover esportes antigos:", err);
                res.status(500).json({ error: "Erro ao atualizar esportes" });
              });
            }

            // Insere os novos esportes
            if (Esportes && Esportes.length > 0) {
              const values = Esportes.map(esporteId => [id, esporteId]);

              db.query(
                "INSERT INTO QuadraEsportes (ID_Quadra, ID_Esporte) VALUES ?",
                [values],
                (err) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error("Erro ao inserir novos esportes:", err);
                      res.status(500).json({ error: "Erro ao atualizar esportes" });
                    });
                  }

                  db.commit(err => {
                    if (err) {
                      return db.rollback(() => {
                        console.error("Erro ao commitar transação:", err);
                        res.status(500).json({ error: "Erro ao finalizar atualização" });
                      });
                    }

                    res.json({ message: "Quadra atualizada com sucesso" });
                  });
                }
              );
            } else {
              db.commit(err => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Erro ao commitar transação:", err);
                    res.status(500).json({ error: "Erro ao finalizar atualização" });
                  });
                }

                res.json({ message: "Quadra atualizada com sucesso (sem esportes)" });
              });
            }
          }
        );
      }
    );
  });
});

// Criar nova quadra privada
app.post("/quadrapriv/registre", (req, res) => {
  const {
    NomeQuadra,
    EnderecoQuadra,
    Bairro,
    Cidade,
    Regiao,
    TipoQuadraFisica,
    Descricao,
    ContatoTelefone,
    ContatoEmail,
    ID_Proprietario,
    Esportes,
    Foto
  } = req.body;

  // Validação dos campos obrigatórios
  const camposObrigatorios = [
    NomeQuadra,
    EnderecoQuadra,
    Bairro,
    Cidade,
    Regiao,
    TipoQuadraFisica,
    ID_Proprietario
  ];

  if (camposObrigatorios.some(campo => !campo)) {
    return res.status(400).json({
      error: "Campos obrigatórios faltando: NomeQuadra, EnderecoQuadra, Bairro, Cidade, Regiao, TipoQuadraFisica, ID_Proprietario"
    });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error("Erro ao iniciar transação:", err);
      return res.status(500).json({ error: "Erro ao iniciar transação" });
    }

    // Inserir a quadra com valores padrão para campos opcionais
    db.query(
      `INSERT INTO Quadra (
        NomeQuadra, EnderecoQuadra, Bairro, Cidade, Regiao,
        TipoQuadraFisica, Descricao, TipoQuadra, ID_Proprietario,
        ContatoTelefone, ContatoEmail, Foto
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        NomeQuadra,
        EnderecoQuadra,
        Bairro,
        Cidade,
        Regiao,
        TipoQuadraFisica,
        Descricao || '', // Valor padrão para descrição
        'privada',
        ID_Proprietario,
        ContatoTelefone || null,
        ContatoEmail || null,
        Foto || null
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Erro ao inserir quadra:", err);
            res.status(500).json({
              error: "Erro ao criar quadra",
              details: err.message
            });
          });
        }

        const quadraId = result.insertId;

        // Inserir esportes associados se existirem
        if (Esportes && Esportes.length > 0) {
          const values = Esportes.map(esporteId => [quadraId, esporteId]);

          db.query(
            "INSERT INTO QuadraEsportes (ID_Quadra, ID_Esporte) VALUES ?",
            [values],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error("Erro ao inserir esportes:", err);
                  res.status(500).json({ error: "Erro ao associar esportes" });
                });
              }

              db.commit(err => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Erro ao commitar transação:", err);
                    res.status(500).json({ error: "Erro ao finalizar criação" });
                  });
                }

                res.json({
                  message: "Quadra privada criada com sucesso",
                  ID_Quadra: quadraId
                });
              });
            }
          );
        } else {
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error("Erro ao commitar transação:", err);
                res.status(500).json({ error: "Erro ao finalizar criação" });
              });
            }

            res.json({
              message: "Quadra privada criada com sucesso (sem esportes)",
              ID_Quadra: quadraId
            });
          });
        }
      }
    );
  });
});



/// --> Sessão Usuarios BackEnd

//Rota que vai conter os dados dos usuarios
app.get("/users", (req, res) => {
  db.query("SELECT * FROM Usuario", (err, results) => {
    if (err) {
      console.error("Erro ao obter usuarios:", err);
      return res.status(500).send("Erro ao obter usuarios");
    }
    res.json(results);
  });
});

// ---> Rota para deletar um usuario de acordo com o ID
app.delete("/users/delete/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM Usuario WHERE ID_Usuario = ?", [id], (err, result) => {
    if (err) {
      console.error("Erro ao deletar usuario:", err);
      return res.status(500).json({ error: "Erro ao deletar usuario" });
    }
    res.json({ message: "Usuario deletada com sucesso" });
  });
});

// Single Page Quadra Privada
app.get("/user/:id", (req, res) => {
  const { id } = req.params;
  db.query(
    "SELECT * FROM Usuario WHERE ID_Usuario = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Erro ao obter usuario:", err);
        return res.status(500).send("Erro ao obter quadra");
      }
      res.json({ results });
    }
  );
});

//Rota para atualizar um usuario para Proprietario
app.put("/user/attprop/:id", (req, res) => {
  const { id } = req.params;
  db.query(
    "UPDATE Usuario SET TipoUsuario = 'proprietario' WHERE ID_Usuario = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar usuario:", err);
        return res.status(500).json({ error: "Usuario não encontrada" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario não encontrada" });
      }

      res.json({
        ID_Usuario: id,
        TipoUsuario: "Proprietario",
        message: "Usuario atualizada com sucesso",
      });
    }
  );
});

//Rota para atualizar um usuario para Proprietario
app.put("/user/attadmin/:id", (req, res) => {
  const { id } = req.params;
  db.query(
    "UPDATE Usuario SET TipoUsuario = 'admin' WHERE ID_Usuario = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar usuario:", err);
        return res.status(500).json({ error: "Usuario não encontrada" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario não encontrada" });
      }

      res.json({
        ID_Usuario: id,
        TipoUsuario: "Admin",
        message: "Usuario atualizada com sucesso",
      });
    }
  );
});

//Rota para atualizar um usuario para Comum
app.put("/user/attcomum/:id", (req, res) => {
  const { id } = req.params;
  db.query(
    "UPDATE Usuario SET TipoUsuario = 'usuario comum' WHERE ID_Usuario = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar usuario:", err);
        return res.status(500).json({ error: "Usuario não encontrada" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario não encontrada" });
      }

      res.json({
        ID_Usuario: id,
        TipoUsuario: "Usuario comum",
        message: "Usuario atualizada com sucesso",
      });
    }
  );
});

//Rota para atualizar um usuario existente
app.put("/user/att/:id", (req, res) => {
  const { id } = req.params;
  const { NomeUsuario, Email, TipoUsuario } = req.body;
  db.query(
    "UPDATE Usuario SET NomeUsuario = ?, Email = ?, TipoUsuario = ? WHERE ID_Usuario = ?",
    [NomeUsuario, Email, TipoUsuario, id],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar usuario:", err);
        return res.status(500).json({ error: "Usuario não encontrada" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario não encontrada" });
      }

      res.json({
        ID_Usuario: id,
        NomeUsuario,
        Email,
        TipoUsuario,
        message: "Usuario atualizada com sucesso",
      });
    }
  );
});

app.post("/login", (req, res) => {
  const { Email, Senha, manterConectado } = req.body;

  if (!Email || !Senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  //Consulta do db para encontrar o usuario em questao
  db.query(
    "SELECT * FROM Usuario WHERE Email = ? AND Senha = ? AND TipoUsuario IN ('proprietario', 'admin')",
    [Email, Senha],
    (err, results) => {
      if (err) {
        console.error("Erro ao fazer login:", err);
        return res.status(500).json({ error: "Erro ao fazer login" });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const usuario = results[0];

      const tempoExpiracao = manterConectado ? "72h" : "1h";

      //Gera uma sessão JWT
      const token = jwt.sign(
        {
          ID_Usuario: usuario.ID_Usuario,
          Nome: usuario.NomeUsuario,
          Email: usuario.Email,
          TipoUsuario: usuario.TipoUsuario,
          Foto: usuario.FotoUsuario,
        },
        "pingo123", //chave JWT
        { expiresIn: tempoExpiracao }
      );

      res.json({
        message: "Login bem-sucedido",
        token: token,
      });
    }
  );
});

/// -> Parte Perfil Backend

// Rota para atualizar o perfil do usuário
app.put("/perfil/att/:id", (req, res) => {
  const { id } = req.params;
  const { Nome, Email } = req.body;

  db.query(
    "UPDATE Usuario SET NomeUsuario = ?, Email = ? WHERE ID_Usuario = ?",
    [Nome, Email, id],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar perfil:", err);
        return res.status(500).json({ error: "Erro ao atualizar perfil" });
      }

      //Busca os dados atualizado
      db.query(
        "SELECT ID_Usuario, NomeUsuario, Email, TipoUsuario, FotoUsuario FROM Usuario WHERE ID_Usuario = ?",
        [id],
        (err, results) => {
          if (err)
            return res.status(500).json({ error: "Erro ao buscar usuário" });

          const updatedUser = results[0];

          const token = jwt.sign(
            {
              ID_Usuario: updatedUser.ID_Usuario,
              Nome: updatedUser.NomeUsuario,
              Email: updatedUser.Email,
              TipoUsuario: updatedUser.TipoUsuario,
              Foto: updatedUser.FotoUsuario,
            },
            "pingo123",
            { expiresIn: "1h" }
          );

          res.json({
            message: "Perfil atualizado com sucesso",
            user: updatedUser,
            token,
          });
        }
      );
    }
  );
});

/// -> Proprietario

//Rota que verifica o Login do Proprietario
app.get("/login-proprietario/:id", async (req, res) => {
  const { id } = req.params;

  // Verifica se o ID é um número positivo
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      error: "ID inválido",
      details: "O ID deve ser um número positivo",
    });
  }

  try {
    // Verifica se o usuário existe
    const [userExists] = await db
      .promise()
      .query("SELECT ID_Usuario FROM Usuario WHERE ID_Usuario = ?", [id]);

    if (userExists.length === 0) {
      return res.status(404).json({
        error: "Usuário não encontrado",
        details: `O ID ${id} não existe no sistema`,
      });
    }

    //Verifica se é proprietário
    const [results] = await db
      .promise()
      .query(
        "SELECT ID_Usuario, TipoUsuario FROM Usuario WHERE ID_Usuario = ? AND TipoUsuario = 'Proprietario'",
        [id]
      );

    res.json({
      isProprietario: results.length > 0,
      userId: results[0]?.ID_Usuario || null,
    });
  } catch (err) {
    console.error("Erro ao verificar proprietário:", err);
    res.status(500).json({
      error: "Erro interno no servidor",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    });
  }
});

// Rota que vai obter as Quadras daquele Proprietario especifico
app.get("/quadras-proprietario/:proprietarioId", (req, res) => {
  const { proprietarioId } = req.params;
  db.query(
    `SELECT 
      q.*,
      GROUP_CONCAT(DISTINCT e.Nome SEPARATOR ', ') as Esportes,
      u.NomeUsuario as NomeProprietario
    FROM Quadra q
    JOIN Usuario u ON q.ID_Proprietario = u.ID_Usuario
    LEFT JOIN QuadraEsportes qe ON q.ID_Quadra = qe.ID_Quadra
    LEFT JOIN Esportes e ON qe.ID_Esporte = e.ID_Esporte
    WHERE q.ID_Proprietario = ?
    GROUP BY q.ID_Quadra`,
    [proprietarioId],
    (err, results) => {
      if (err) {
        console.error("Erro ao obter quadras do proprietário:", err);
        return res.status(500).send("Erro ao obter quadras do proprietário");
      }
      res.json(results);
    }
  );
});

/// Menu Dinamico
app.get("/menu/:tipoUsuario", (req, res) => {
  const { tipoUsuario } = req.params;

  db.query(
    `
    SELECT 
      m.ID_MenuItem as id,
      m.Titulo as title,
      m.URL as url,
      m.Icone as icon,
      m.TipoUsuarioPermitido as role
    FROM MenuItems m
    WHERE m.TipoUsuarioPermitido = ?
    ORDER BY m.OrdemExibicao
  `,
    [tipoUsuario],
    (err, results) => {
      if (err) {
        console.error("Erro ao obter menu:", err);
        return res.status(500).send("Erro ao obter menu");
      }

      const menuFormatado = formatarMenu(results);
      res.json(menuFormatado);
    }
  );
});

function formatarMenu(items) {
  const categorias = {
    Main: { id: 1, title: "Main", listItems: [] },
    Usuários: { id: 2, title: "Usuários", listItems: [] },
    Quadras: { id: 3, title: "Quadras", listItems: [] },
    "Área Proprietario": { id: 4, title: "Área Proprietario", listItems: [] },
    Configurações: { id: 5, title: "Configurações", listItems: [] },
  };

  items.forEach((item) => {
    if (item.title.includes("Home")) {
      categorias["Main"].listItems.push(item);
    }
    if (item.title.includes("Usuários")) {
      categorias["Usuários"].listItems.push(item);
    }
    if (item.title.includes("Proprietario")) {
      categorias["Usuários"].listItems.push(item);
    }
    if (item.title.includes("Quadras Públicas")) {
      categorias["Quadras"].listItems.push(item);
    }
    if (item.title.includes("Quadras Privadas")) {
      categorias["Quadras"].listItems.push(item);
    }
    if (item.title.includes("Formulários")) {
      categorias["Quadras"].listItems.push(item);
    }
    if (item.title.includes("Configurações")) {
      categorias["Configurações"].listItems.push(item);
    }
    if (item.title.includes("Minhas Quadras")) {
      categorias["Área Proprietario"].listItems.push(item);
    }
    if (item.title.includes("Gerenciamento de Dias e Horários")) {
      categorias["Área Proprietario"].listItems.push(item);
    }
    if (item.title.includes("Reservas")) {
      categorias["Área Proprietario"].listItems.push(item);
    }
  });

  return Object.values(categorias).filter((cat) => cat.listItems.length > 0);
}

/// Atualizar Senha
app.put("/perfil/senha/:id", (req, res) => {
  const { id } = req.params;
  const { senhaAntiga, novaSenha } = req.body;

  //Verifica se a senha antiga está correta
  db.query(
    "SELECT Senha FROM Usuario WHERE ID_Usuario = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar senha:", err);
        return res.status(500).json({ error: "Erro ao verificar senha" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const senhaAtual = results[0].Senha;

      if (senhaAntiga !== senhaAtual) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }

      //Atualiza para a nova senha
      db.query(
        "UPDATE Usuario SET Senha = ? WHERE ID_Usuario = ?",
        [novaSenha, id],
        (err, result) => {
          if (err) {
            console.error("Erro ao atualizar senha:", err);
            return res.status(500).json({ error: "Erro ao atualizar senha" });
          }

          res.json({ message: "Senha Atualiza com sucesso" });
        }
      );
    }
  );
});

///Sessão para Atualizar Foto Usuario

// Configura o Multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/usuarios/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const usuarioId = req.params.id || req.user?.ID_Usuario;
    const ext = path.extname(file.originalname);
    cb(null, `usuario_${usuarioId}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();

    //Verificação mais rigorosa
    const isMimeTypeValid = allowedTypes.includes(file.mimetype);
    const isExtValid = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

    if (!isMimeTypeValid || !isExtValid) {
      req.fileValidationError =
        "Tipo de arquivo não permitido. Use apenas JPEG, PNG ou WebP";
      return cb(null, false, new Error(req.fileValidationError));
    }

    //Verificação para arquivos corrompidos
    if (file.size === 0) {
      req.fileValidationError = "Arquivo corrompido ou vazio";
      return cb(null, false, new Error(req.fileValidationError));
    }

    cb(null, true);
  },
});

//Middleware para processar a imagem com sharp

const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filePath = path.join(req.file.destination, req.file.filename);

    //Otimiza a imagem, redimensiona e converte
    await sharp(filePath)
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
        mozjpeg: true,
      })
      .toFile(filePath + ".processed")
      .then(() => {
        //Substitui o arquivo original pelo processado
        fs.unlinkSync(filePath);
        fs.renameSync(filePath + ".processed", filePath);
        next();
      });
  } catch (err) {
    console.error("Erro no processamento da imagem:", err);
    //remove o arquivo se não passar na verificação
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: "Erro ao proecessar imagem" });
  }
};

const getFullImageUrl = (filename) => {
  return `http://localhost:5000/uploads/usuarios/${filename}`;
};

//Rota para upload de foto do usuário
app.put(
  "/usuario/foto/:id",
  upload.single("foto"),
  processImage,
  async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ error: req.fileValidationError || "Nenhuma imagem enviada" });
    }

    try {
      const fullUrl = getFullImageUrl(file.filename);

      //Busca a foto atual para exclusão
      const [results] = await db
        .promise()
        .query("SELECT FotoUsuario FROM Usuario WHERE ID_Usuario = ?", [id]);

      const fotoAtual = results[0]?.FotoUsuario;

      //Remove a foto antiga se existit
      if (fotoAtual) {
        const filename = path.basename(fotoAtual);
        const filePath = path.join("uploads", "usuarios", filename);

        if ((fs, fs.existsSync(filePath))) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error("Erro ao remover foto antiga:", err);
          }
        }
      }

      // Atualiza o banco com o novo caminho

      await db
        .promise()
        .query("UPDATE Usuario SET FotoUsuario = ? WHERE ID_Usuario = ?", [
          fullUrl,
          id,
        ]);

      // Busca os dados atualizados para gerar novo token
      const [updatedResults] = await db
        .promise()
        .query(
          "SELECT ID_Usuario, NomeUsuario, Email, TipoUsuario, FotoUsuario FROM Usuario WHERE ID_Usuario = ?",
          [id]
        );

      const updatedUser = updatedResults[0];

      const token = jwt.sign(
        {
          ID_Usuario: updatedUser.ID_Usuario,
          Nome: updatedUser.NomeUsuario,
          Email: updatedUser.Email,
          TipoUsuario: updatedUser.TipoUsuario,
          Foto: updatedUser.FotoUsuario,
        },
        "pingo123",
        { expiresIn: "1h" }
      );

      res.json({
        message: "Foto atualizado com sucesso",
        fotoUrl: updatedUser.FotoUsuario,
        token,
      });
    } catch (err) {
      console.error("Erro no processo de upload:", err);

      //Remove o arquivo enviado em caso de erro
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      res.status(500).json({
        error: "Erro interno no servidor",
        details: process.env.NODE_ENV === "development" ? err.message : null,
      });
    }
  }
);

/// Sessão Atualizar Foto Quadra (Publica e Privada)

//Configuração do Multer para Quadras
const storageQuadras = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/quadras/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const quadraId = req.params.id;
    const ext = path.extname(file.originalname);
    cb(null, `quadra_${quadraId}${ext}`);
  },
});

const uploadQuadra = multer({
  storage: storageQuadras,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();

    const isMimeTypeValid = allowedTypes.includes(file.mimetype);
    const isExtValid = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

    if (!isMimeTypeValid || !isExtValid) {
      req.fileValidationError =
        "Tipo de arquivo não permitido. Use apenas JPEG, PNG ou WEBP";
      return cb(null, false, new Error(req.fileValidationError));
    }

    if (file.size === 0) {
      req.fileValidationError = "Arquivo corrompido ou vazio";
      return cb(null, false, new Error(req.fileValidationError));
    }

    cb(null, true);
  },
});

// Middleware para processar imagem da quadra
const processQuadraImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filePath = path.join(req.file.destination, req.file.filename);

    await sharp(filePath)
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
        mozjpeg: true,
      })
      .toFile(filePath + ".processed")
      .then(() => {
        fs.unlinkSync(filePath);
        fs.renameSync(filePath + ".processed", filePath);
        next();
      });
  } catch (err) {
    console.error("Erro no processamento da imagem da quadra:", err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res
      .status(500)
      .json({ error: "Erro ao processar imagem da quadra" });
  }
};

const getFullQuadraImageUrl = (filename) => {
  return `http://localhost:5000/uploads/quadras/${filename}`;
};

//Rota para upload de foto da quadra (funciona para ambos tipos)
app.put(
  "/quadra/foto/:id",
  uploadQuadra.single("foto"),
  processQuadraImage,
  async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ error: req.fileValidationError || "Nenhuma imagem enviada" });
    }

    try {
      const fullUrl = getFullQuadraImageUrl(file.filename);

      // Busca a foto atual para exclusão
      const [results] = await db
        .promise()
        .query("SELECT Foto FROM Quadra WHERE ID_Quadra = ?", [id]);
      const fotoAtual = results[0]?.Foto;

      // Remove a foto antiga se existir
      if (fotoAtual) {
        const filename = path.basename(fotoAtual);
        const filePath = path.join("uploads", "quadras", filename);

        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error("Erro ao remover foto antiga da quadra:", err);
          }
        }
      }

      // Atualiza o banco com novo caminho
      await db
        .promise()
        .query("UPDATE Quadra SET Foto = ? WHERE ID_Quadra = ?", [fullUrl, id]);

      // Busca os dados atualizados
      const [updatedResults] = await db
        .promise()
        .query("SELECT * FROM Quadra WHERE ID_Quadra = ?", [id]);

      res.json({
        message: "Foto da quadra atualizada com sucesso",
        fotoUrl: updatedResults[0].Foto,
      });
    } catch (err) {
      console.error("Erro no processo de upload da quadra:", err);

      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      res.status(500).json({
        error: "Erro interno no servidor",
        details: process.env.NODE_ENV === "development" ? err.message : null,
      });
    }
  }
);

/// Sessão para Gráficos

//Gráfico Pizza contagem de usuários por tipo
app.get("/dashboard/users-type", (req, res) => {
  db.query(
    `
    SELECT
      CASE 
        WHEN TipoUsuario = 'admin' THEN 'Admin'
        WHEN TipoUsuario = 'proprietario' THEN 'Proprietário'
        WHEN TipoUsuario = 'funcionario do proprietario' THEN 'Funcionário'
        WHEN TipoUsuario = 'usuario comum' THEN 'Usuário Comum'
        ELSE TipoUsuario
      END as name,
      COUNT(*) as value,
      CASE
        WHEN TipoUsuario = 'admin' THEN '#7D5BA6'
        WHEN TipoUsuario = 'proprietario' THEN '#E96969'
        WHEN TipoUsuario = 'funcionario do proprietario' THEN '#FFA500'
        ELSE '#4E94FF'
      END as color
    FROM Usuario
    GROUP BY TipoUsuario
    ORDER BY value DESC
    `,
    (err, results) => {
      if (err) {
        console.error("Erro ao obter contagem de usuários:", err);
        return res.status(500).send("Erro ao obter contagem de usuários");
      }

      // Formatando os nomes para exibição consistente
      const formattedResults = results.map(item => ({
        ...item,
        name: item.name.replace('Proprietario', 'Proprietário')
          .replace('usuario comum', 'Usuário Comum')
      }));

      res.json(formattedResults);
    }
  );
});

//Gráfico que obtém dados da quadra pública
app.get("/dashboard/quadras-publicas", (req, res) => {
  // Consulta que obtem o total de quadras publicas
  db.query(
    `
    SELECT
      COUNT(*) as totalQuadras,
      SUM(CASE WHEN MONTH(DataCriacao) = MONTH(CURRENT_DATE()) THEN 1 ELSE 0 END) as quadrasEsteMes
    FROM Quadra
    WHERE TipoQuadra = 'publica'
    `,
    (err, totalResults) => {
      if (err) {
        console.error("Erro ao obter total de quadras:", err);
        return res.status(500).send("Erro ao obter total de quadras");
      }

      // Consulta para obter quadras criadas por mês (últimos 3 meses)
      db.query(
        `
        SELECT
          MONTHNAME(DataCriacao) as name,
          COUNT(*) as quadras
        FROM Quadra
        WHERE TipoQuadra = 'publica'
          AND DataCriacao >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
        GROUP BY MONTH(DataCriacao), MONTHNAME(DataCriacao)
        ORDER BY MONTH(DataCriacao)
        `,
        (err, monthlyResults) => {
          if (err) {
            console.error("Erro ao obter quadras por mês:", err);
            return res.status(500).send("Erro ao obter quadras por mês");
          }

          // Calcula a porcentagem de crescimento
          const totalQuadras = totalResults[0].totalQuadras;
          const quadrasEsteMes = totalResults[0].quadrasEsteMes;
          const ultimoMes =
            monthlyResults.length > 1
              ? monthlyResults[monthlyResults.length - 2].quadras
              : 0;

          const porcentagem =
            ultimoMes > 0
              ? Math.round(((quadrasEsteMes - ultimoMes) / ultimoMes) * 100)
              : 100;

          res.json({
            totalQuadras,
            porcentagem,
            chartData: monthlyResults,
          });
        }
      );
    }
  );
});

//Gráfico que obtém dados da quadra privada
app.get("/dashboard/quadras-privadas", (req, res) => {
  // Consulta que obtem o total de quadras privadas
  db.query(
    `
    SELECT
      COUNT(*) as totalQuadras,
      SUM(CASE WHEN MONTH(DataCriacao) = MONTH(CURRENT_DATE()) THEN 1 ELSE 0 END) as quadrasEsteMes
    FROM Quadra
    WHERE TipoQuadra = 'privada'
    `,
    (err, totalResults) => {
      if (err) {
        console.error("Erro ao obter total de quadras:", err);
        return res.status(500).send("Erro ao obter total de quadras");
      }

      // Consulta para obter quadras criadas por mês (últimos 3 meses)
      db.query(
        `
        SELECT
          MONTHNAME(DataCriacao) as name,
          COUNT(*) as quadras
        FROM Quadra
        WHERE TipoQuadra = 'privada'
          AND DataCriacao >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
        GROUP BY MONTH(DataCriacao), MONTHNAME(DataCriacao)
        ORDER BY MONTH(DataCriacao)
        `,
        (err, monthlyResults) => {
          if (err) {
            console.error("Erro ao obter quadras por mês:", err);
            return res.status(500).send("Erro ao obter quadras por mês");
          }

          // Calcula a porcentagem de crescimento
          const totalQuadras = totalResults[0].totalQuadras;
          const quadrasEsteMes = totalResults[0].quadrasEsteMes;
          const ultimoMes =
            monthlyResults.length > 1
              ? monthlyResults[monthlyResults.length - 2].quadras
              : 0;

          const porcentagem =
            ultimoMes > 0
              ? Math.round(((quadrasEsteMes - ultimoMes) / ultimoMes) * 100)
              : 100;

          res.json({
            totalQuadras,
            porcentagem,
            chartData: monthlyResults,
          });
        }
      );
    }
  );
});

// Gráfico onde vai conter o Total de Usuários
app.get("/dashboard/total-usuarios", (req, res) => {
  db.query(
    `
    SELECT
      COUNT(*) as totalUsuarios,
      SUM(CASE WHEN MONTH(Criado_em) = MONTH(CURRENT_DATE()) 
                AND YEAR(Criado_em) = YEAR(CURRENT_DATE()) 
           THEN 1 ELSE 0 END) as usuariosEsteMes,
      SUM(CASE WHEN MONTH(Criado_em) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
                AND YEAR(Criado_em) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
           THEN 1 ELSE 0 END) as usuariosMesAnterior
    FROM Usuario
    `,
    (err, totalResults) => {
      if (err) {
        console.error("Erro ao obter total de usuários:", err);
        return res.status(500).send("Erro ao obter total de usuários");
      }

      // Consulta simplificada para obter usuários dos últimos 3 meses
      db.query(
        `
        SELECT
          DATE_FORMAT(Criado_em, '%Y-%m') as monthYear,
          MONTHNAME(Criado_em) as name,
          COUNT(*) as usuarios
        FROM Usuario
        WHERE Criado_em >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
        GROUP BY monthYear, name
        ORDER BY monthYear
        `,
        (err, monthlyResults) => {
          if (err) {
            console.error("Erro ao obter usuários por mês:", err);
            return res.status(500).send("Erro ao obter usuários por mês");
          }

          const totalUsuarios = totalResults[0].totalUsuarios;
          const usuariosEsteMes = totalResults[0].usuariosEsteMes;
          const usuariosMesAnterior = totalResults[0].usuariosMesAnterior;

          // Calcula porcentagem de crescimento de forma mais precisa
          const porcentagem = usuariosMesAnterior > 0
            ? Math.round(((usuariosEsteMes - usuariosMesAnterior) / usuariosMesAnterior) * 100)
            : usuariosEsteMes > 0 ? 100 : 0;

          res.json({
            totalUsuarios,
            porcentagem,
            chartData: monthlyResults,
          });
        }
      );
    }
  );
});

/// -> Horários Quadras

// Rota para salvar configurações de horários
app.post("/quadra/horarios", (req, res) => {
  const {
    quadraId,
    startDate,
    endDate,
    timeSlots,
    price,
    timeInterval,
    proprietarioId
  } = req.body;

  // Verifica se o usuário é o proprietário da quadra
  db.query(
    `SELECT 1 FROM Quadra 
     WHERE ID_Quadra = ? AND ID_Proprietario = ?`,
    [quadraId, proprietarioId],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar proprietário:", err);
        return res.status(500).json({ error: "Erro ao verificar proprietário" });
      }

      if (results.length === 0) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      // Validação do preço
      if (price === undefined || price === null) {
        return res.status(400).json({ error: "O preço é obrigatório" });
      }

      // Insere a configuração no BD
      db.query(
        `INSERT INTO HorariosQuadra
        (ID_Quadra, DataInicio, DataFim, Horarios, Preco, Intervalo)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          quadraId,
          startDate,
          endDate,
          JSON.stringify(timeSlots),
          price,
          timeInterval,
        ],
        (err, result) => {
          if (err) {
            console.error("Erro ao salvar horários:", err);
            return res.status(500).json({ error: "Erro ao salvar horários" });
          }

          res.json({
            message: "Horários configurados com sucesso",
            configId: result.insertId,
          });
        }
      );
    }
  );
});

// Rota para obter as configurações de horários de uma quadra
app.get("/quadra/horarios/:quadraId", (req, res) => {
  const { quadraId } = req.params;

  db.query(
    "SELECT * FROM HorariosQuadra WHERE ID_Quadra = ? ORDER BY DataInicio DESC",
    [quadraId],
    (err, results) => {
      if (err) {
        console.error("Erro ao obter horários:", err);
        return res.status(500).json({ error: "Erro ao obter horários" });
      }

      // Formata os resultados
      const parsedResults = results.map((config) => {
        // Converte as datas para objetos Date
        const dataInicio = new Date(config.DataInicio);
        const dataFim = new Date(config.DataFim);

        // Formata as datas para 'dd/MM/yyyy'
        const formatarData = (date) => {
          const dia = date.getDate().toString().padStart(2, "0");
          const mes = (date.getMonth() + 1).toString().padStart(2, "0");
          const ano = date.getFullYear();
          return `${dia}/${mes}/${ano}`;
        };

        // Formata o intervalo para texto amigável
        const formatarIntervalo = (intervalo) => {
          switch (intervalo) {
            case "30min":
              return "30 minutos";
            case "1h":
              return "1 hora";
            case "2h":
              return "2 horas";
            default:
              return intervalo;
          }
        };

        return {
          ...config,
          DataInicioFormatada: formatarData(dataInicio),
          DataFimFormatada: formatarData(dataFim),
          Horarios: JSON.parse(config.Horarios),
          IntervaloFormatado: formatarIntervalo(config.Intervalo),
        };
      });

      res.json(parsedResults);
    }
  );
}
)

// Nova rota para verificar horários ocupados
app.get("/quadra/horarios/ocupados/:quadraId", (req, res) => {
  const { quadraId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "Datas de início e fim são obrigatórias" });
  }

  db.query(
    `SELECT Horarios FROM HorariosQuadra 
     WHERE ID_Quadra = ? 
     AND (
       (DataInicio BETWEEN ? AND ?) 
       OR (DataFim BETWEEN ? AND ?) 
       OR (? BETWEEN DataInicio AND DataFim) 
       OR (? BETWEEN DataInicio AND DataFim)
     )`,
    [quadraId, startDate, endDate, startDate, endDate, startDate, endDate],
    (err, results) => {
      if (err) {
        console.error("Erro ao buscar horários ocupados:", err);
        return res
          .status(500)
          .json({ error: "Erro ao buscar horários ocupados" });
      }

      // Extrai todos os horários ocupados
      const occupiedSlots = results.flatMap((config) =>
        JSON.parse(config.Horarios)
      );

      res.json({ occupiedSlots });
    }
  );
});


//// -> Sessão de esportes

// Obter todos os esportes disponíveis
app.get("/esportes", (req, res) => {
  db.query("SELECT * FROM Esportes", (err, results) => {
    if (err) {
      console.error("Erro ao obter esportes:", err);
      return res.status(500).send("Erro ao obter esportes");
    }
    res.json(results);
  });
});

// Obter esporte de uma quadra específica
app.get("/quadraspub/:id/esporte", (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT e.Nome 
    FROM QuadraEsportes qe
    JOIN Esportes e ON qe.ID_Esporte = e.ID_Esporte
    WHERE qe.ID_Quadra = ?
  `, [id], (err, results) => {
    if (err) {
      console.error("Erro ao obter esporte da quadra:", err);
      return res.status(500).send("Erro ao obter esporte da quadra");
    }
    res.json(results[0] || null);
  });
});

// Atualizar esporte de uma quadra
app.put("/quadraspub/:id/esporte", (req, res) => {
  const { id } = req.params;
  const { esportes } = req.body;

  if (!esportes || !Array.isArray(esportes)) {
    return res.status(400).json({ error: "Formato de esportes inválido" });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error("Erro ao iniciar transação:", err);
      return res.status(500).json({ error: "Erro ao atualizar esportes" });
    }

    // Remove associações existentes
    db.query("DELETE FROM QuadraEsportes WHERE ID_Quadra = ?", [id], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error("Erro ao remover esportes:", err);
          res.status(500).json({ error: "Erro ao atualizar esportes" });
        });
      }

      if (esportes.length === 0) {
        return db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error("Erro ao commitar:", err);
              res.status(500).json({ error: "Erro ao atualizar esportes" });
            });
          }
          res.json({ message: "Esportes atualizados com sucesso", esportes: [] });
        });
      }

      const values = esportes.map(esporteId => [id, esporteId]);
      const query = "INSERT INTO QuadraEsportes (ID_Quadra, ID_Esporte) VALUES ?";

      db.query(query, [values], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error("Erro ao adicionar esportes:", err);
            res.status(500).json({ error: "Erro ao atualizar esportes" });
          });
        }

        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error("Erro ao commitar:", err);
              res.status(500).json({ error: "Erro ao atualizar esportes" });
            });
          }
          res.json({
            message: "Esportes atualizados com sucesso",
            esportes: esportes
          });
        });
      });
    });
  });
});

/// -> Sessão Dias Indisponíveis

// Rota para adicionar dias indisponíveis
app.post('/quadra/dias-indisponiveis', (req, res) => {
  const { quadraId, startDate, endDate, motivo, proprietarioId } = req.body;

  // Verifica se o usuário é o proprietário da quadra
  db.query(
    `SELECT 1 FROM Quadra 
     WHERE ID_Quadra = ? AND ID_Proprietario = ?`,
    [quadraId, proprietarioId],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar proprietário:", err);
        return res.status(500).json({ error: "Erro ao verificar permissões" });
      }

      if (results.length === 0) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      // Verifica conflitos com agendamentos existentes
      db.query(
        `SELECT 1 FROM Agendamento 
         WHERE ID_Quadra = ? 
         AND DataAgendamento BETWEEN ? AND ?`,
        [quadraId, startDate, endDate],
        (err, agendamentos) => {
          if (err) {
            console.error("Erro ao verificar agendamentos:", err);
            return res.status(500).json({ error: "Erro ao verificar agendamentos existentes" });
          }

          if (agendamentos.length > 0) {
            return res.status(409).json({
              error: "Conflito com agendamentos existentes",
              message: "Existem agendamentos neste período. Cancele-os primeiro.",
              count: agendamentos.length
            });
          }

          // Insere a indisponibilidade no BD
          db.query(
            `INSERT INTO DiasIndisponiveis 
            (ID_Quadra, DataInicio, DataFim, Motivo, ID_Proprietario)
            VALUES (?, ?, ?, ?, ?)`,
            [quadraId, startDate, endDate, motivo || null, proprietarioId],
            (err, result) => {
              if (err) {
                console.error("Erro ao salvar dias indisponíveis:", err);
                return res.status(500).json({ error: "Erro ao salvar configuração" });
              }

              res.json({
                success: true,
                message: "Dias indisponíveis configurados com sucesso",
                indisponibilidadeId: result.insertId
              });
            }
          );
        }
      );
    }
  );
});


app.post('/quadra/verificar-indisponibilidade/:quadraId', (req, res) => {
  const { quadraId } = req.params;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Datas são obrigatórias" });
  }

  // Verifica sobreposição com dias indisponíveis existentes
  db.query(
    `SELECT 1 FROM DiasIndisponiveis 
     WHERE ID_Quadra = ? 
     AND (
       (? BETWEEN DataInicio AND DataFim) OR
       (? BETWEEN DataInicio AND DataFim) OR
       (DataInicio BETWEEN ? AND ?) OR
       (DataFim BETWEEN ? AND ?)
     )`,
    [quadraId, startDate, endDate, startDate, endDate, startDate, endDate],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar indisponibilidade:", err);
        return res.status(500).json({ error: "Erro ao verificar disponibilidade" });
      }

      res.json({
        existeIndisponibilidade: results.length > 0,
        mensagem: results.length > 0 ? "Já existe indisponibilidade para este período" : "Período disponível"
      });
    }
  );
});

app.get('/quadra/dias-indisponiveis/:quadraId', (req, res) => {
  const { quadraId } = req.params;

  // Validação do ID da quadra
  if (!quadraId || isNaN(quadraId)) {
    return res.status(400).json({ error: "ID da quadra inválido" });
  }

  db.query(
    `SELECT di.*, q.NomeQuadra 
     FROM DiasIndisponiveis di
     JOIN Quadra q ON di.ID_Quadra = q.ID_Quadra
     WHERE di.ID_Quadra = ? 
     ORDER BY di.DataInicio DESC`,
    [quadraId],
    (err, results) => {
      if (err) {
        console.error("Erro ao obter dias indisponíveis:", err);
        return res.status(500).json({
          error: "Erro no servidor ao buscar dias indisponíveis",
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      try {
        // Formata os resultados
        const parsedResults = results.map(config => ({
          ...config,
          DataInicioFormatada: formatDateToBR(config.DataInicio),
          DataFimFormatada: formatDateToBR(config.DataFim),
          NomeQuadra: config.NomeQuadra
        }));

        res.json(parsedResults);
      } catch (formatError) {
        console.error("Erro ao formatar resultados:", formatError);
        res.status(500).json({ error: "Erro ao processar dados" });
      }
    }
  );
});



// Rota para verificar conflitos de agendamento
app.get('/quadra/verificar-disponibilidade/:quadraId', (req, res) => {
  const { quadraId } = req.params;
  const { data } = req.query;

  if (!data) {
    return res.status(400).json({ error: "Data é obrigatória" });
  }

  // Primeiro verifica dias indisponíveis (prioridade máxima)
  db.query(
    `SELECT 1 FROM DiasIndisponiveis 
       WHERE ID_Quadra = ? 
       AND ? BETWEEN DataInicio AND DataFim`,
    [quadraId, data],
    (err, indisponivelResults) => {
      if (err) {
        console.error("Erro ao verificar disponibilidade:", err);
        return res.status(500).json({ error: "Erro ao verificar disponibilidade" });
      }

      if (indisponivelResults.length > 0) {
        return res.json({
          disponivel: false,
          motivo: "Dia marcado como indisponível pelo proprietário"
        });
      }

      // Se não estiver indisponível, verifica agendamentos
      db.query(
        `SELECT 1 FROM Agendamento 
               WHERE ID_Quadra = ? 
               AND DATE(DataAgendamento) = ?`,
        [quadraId, data],
        (err, agendamentoResults) => {
          if (err) {
            console.error("Erro ao verificar agendamentos:", err);
            return res.status(500).json({ error: "Erro ao verificar agendamentos" });
          }

          res.json({
            disponivel: agendamentoResults.length === 0,
            motivo: agendamentoResults.length > 0 ? "Já existem agendamentos neste dia" : null
          });
        }
      );
    }
  );
});


// Função auxiliar para formatar data
function formatDateToBR(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}


/// -> Rotas para Controle de Horarios e Dias Indisponiveis

// Rota para deletar horários disponíveis
app.delete("/quadra/horarios/:configId", (req, res) => {
  const { configId } = req.params;
  const { proprietarioId } = req.body;

  // Verifica se o usuário é o proprietário (usando a tabela Quadra)
  db.query(
    `SELECT q.ID_Proprietario 
     FROM HorariosQuadra hq
     JOIN Quadra q ON hq.ID_Quadra = q.ID_Quadra
     WHERE hq.ID_Config = ? AND q.TipoQuadra = 'privada'`,
    [configId],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar permissões:", err);
        return res.status(500).json({ error: "Erro ao verificar permissões" });
      }

      if (results.length === 0 || results[0].ID_Proprietario != proprietarioId) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      // Deleta o registro
      db.query(
        `DELETE FROM HorariosQuadra WHERE ID_Config = ?`,
        [configId],
        (err, result) => {
          if (err) {
            console.error("Erro ao deletar configuração:", err);
            return res.status(500).json({ error: "Erro ao deletar configuração" });
          }

          res.json({ success: true, message: "Configuração deletada com sucesso" });
        }
      );
    }
  );
});

// Rota para deletar dias indisponíveis
app.delete("/quadra/dias-indisponiveis/:indisponibilidadeId", (req, res) => {
  const { indisponibilidadeId } = req.params;
  const { proprietarioId } = req.body;

  // Verifica se o usuário é o proprietário
  db.query(
    `SELECT ID_Proprietario FROM DiasIndisponiveis WHERE ID_Indisponibilidade = ?`,
    [indisponibilidadeId],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar permissões:", err);
        return res.status(500).json({ error: "Erro ao verificar permissões" });
      }

      if (results.length === 0 || results[0].ID_Proprietario != proprietarioId) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      // Deleta o registro
      db.query(
        `DELETE FROM DiasIndisponiveis WHERE ID_Indisponibilidade = ?`,
        [indisponibilidadeId],
        (err, result) => {
          if (err) {
            console.error("Erro ao deletar dia indisponível:", err);
            return res.status(500).json({ error: "Erro ao deletar dia indisponível" });
          }

          res.json({ success: true, message: "Dia indisponível deletado com sucesso" });
        }
      );
    }
  );
});

// Rota para obter todas as configurações de horários (para o gerenciador)
app.get("/quadra/horarios-admin", (req, res) => {
  const { proprietarioId } = req.query;

  if (!proprietarioId) {
    return res.status(400).json({ error: "ID do proprietário é obrigatório" });
  }

  db.query(
    `SELECT hq.*, q.NomeQuadra 
   FROM HorariosQuadra hq
   JOIN Quadra q ON hq.ID_Quadra = q.ID_Quadra
   WHERE q.ID_Proprietario = ? AND q.TipoQuadra = 'privada'
   ORDER BY hq.DataInicio DESC`,
    [proprietarioId],
    (err, results) => {
      if (err) {
        console.error("Erro ao obter horários:", err);
        return res.status(500).json({ error: "Erro ao obter horários" });
      }

      // Formata os resultados
      const parsedResults = results.map((config) => {
        return {
          ...config,
          DataInicioFormatada: formatDateToBR(config.DataInicio),
          DataFimFormatada: formatDateToBR(config.DataFim),
          Horarios: typeof config.Horarios === 'string' ?
            JSON.parse(config.Horarios) :
            config.Horarios,
          PrecoFormatado: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(config.Preco)
        };
      });

      res.json(parsedResults);
    }
  );
});


// Rota para obter todos os dias indisponíveis (para o gerenciador admin)
app.get("/quadra/dias-indisponiveis-admin", (req, res) => {
  const { proprietarioId } = req.query;

  if (!proprietarioId) {
    return res.status(400).json({ error: "ID do proprietário é obrigatório" });
  }

  db.query(
    `SELECT di.*, q.NomeQuadra 
   FROM DiasIndisponiveis di
   JOIN Quadra q ON di.ID_Quadra = q.ID_Quadra
   WHERE di.ID_Proprietario = ? AND q.TipoQuadra = 'privada'
   ORDER BY di.DataInicio DESC`,
    [proprietarioId],
    (err, results) => {
      if (err) {
        console.error("Erro ao obter dias indisponíveis:", err);
        return res.status(500).json({ error: "Erro ao obter dias indisponíveis" });
      }

      // Formata os resultados
      const parsedResults = results.map((item) => ({
        ...item,
        DataInicioFormatada: formatDateToBR(item.DataInicio),
        DataFimFormatada: formatDateToBR(item.DataFim),
        NomeQuadra: item.NomeQuadra || `Quadra ${item.ID_Quadra}`
      }));

      res.json(parsedResults);
    }
  );
});


/// Sessão Reservas
// Backend - ajuste a rota para retornar campos separados
// Rota para obter agendamentos do proprietário
app.get('/proprietario/agendamentos/:proprietarioId', (req, res) => {
  const { proprietarioId } = req.params;

  db.query(`
    SELECT 
      a.ID_Agendamento as id,
      u.NomeUsuario as name,
      q.NomeQuadra as quadra,
      DATE_FORMAT(a.DataAgendamento, '%d/%m/%Y') as dia_formatada,
      a.DataAgendamento as dia,
      JSON_UNQUOTE(JSON_EXTRACT(a.Horarios, '$[0]')) as horario_completo,
      CAST(a.Preco AS DECIMAL(10,2)) as preco,  -- Garante que é decimal com 2 casas
      sp.StatusPagamento as status
    FROM Agendamento a
    JOIN Quadra q ON a.ID_Quadra = q.ID_Quadra
    JOIN Usuario u ON a.ID_Usuario = u.ID_Usuario
    JOIN StatusPagamento sp ON a.ID_StatusPagamento = sp.ID_StatusPagamento
    WHERE q.ID_Proprietario = ?
    ORDER BY a.DataAgendamento DESC
  `, [proprietarioId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
    
    // Garante que o preço nunca seja null/undefined
    const processedResults = results.map(item => ({
      ...item,
      preco: item.preco || 0
    }));
    
    res.json(processedResults);
  });
});

// Funções auxiliares atualizadas
const formatDate = (dateStr) => {
  if (!dateStr) return 'Data não informada'; // ou return '';
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return dateStr; // Retorna o valor original se não conseguir formatar
  }
};

function formatTime(timeStr) {
  return timeStr.substring(0, 5); // Retorna apenas HH:MM
}

//Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na rota ${port}`);
});
