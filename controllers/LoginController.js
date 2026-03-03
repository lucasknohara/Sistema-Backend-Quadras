const jwt = require("jsonwebtoken");
const LoginModels = require("../models/loginModels");
const bcrypt = require("bcryptjs");
const JWT_SECRET = "PingoMaisMelhor"; // Senha

class LoginController {
  // Criar um novo usuário (cadastro)
  async criar(req, res) {
    const { NomeUsuario, Email, Senha, CPF, TipoUsuario } = req.body;

    try {
      // Verifica se o email ou CPF já estão cadastrados
      const usuarioExistente = await LoginModels.verificarExistencia(
        Email,
        CPF
      );
      if (usuarioExistente) {
        return res
          .status(400)
          .json({ message: "E-mail ou CPF já cadastrados!" });
      }

      // Criptografa a senha
      const senhaHash = await bcrypt.hash(Senha, 10);

      // Cria o objeto do novo usuário
      const novoLogin = {
        NomeUsuario,
        Email,
        Senha: senhaHash,
        CPF,
        TipoUsuario: TipoUsuario || "Usuario comum",
      };

      // Salva no banco de dados
      const usuarioCriado = await LoginModels.criar(novoLogin);

      // Retorna resposta de sucesso
      return res.status(201).json({
        message: "Usuário registrado com sucesso!",
        usuario: {
          id: usuarioCriado.id,
          nome: usuarioCriado.NomeUsuario,
          email: usuarioCriado.Email,
        },
        success: true,
      });
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Erro ao criar usuário." });
    }
  }

  // Fazer login
  async login(req, res) {
    const { Email, Senha } = req.body;

    try {
      // Busca usuário pelo e-mail
      const usuario = await LoginModels.buscarPorEmail(Email.toLowerCase());
      if (!usuario) {
        return res.status(400).json({ message: "E-Mail ou senha incorretos" });
      }

      // Compara a senha digitada com a do banco
      const senhaCorreta = await bcrypt.compare(Senha, usuario.Senha);
      if (!senhaCorreta) {
        return res.status(400).json({ message: "E-Mail ou senha incorretos" });
      }

      // Gera token JWT válido por 1 hora
      const token = jwt.sign(
        { id: usuario.ID_Usuario, email: usuario.Email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Retorna informações do usuário e token
      return res.status(200).json({
        message: "Login bem-sucedido!",
        usuario: {
          id: usuario.ID_Usuario,
          nome: usuario.NomeUsuario,
          email: usuario.Email,
          tipoUsuario: usuario.TipoUsuario,
        },
        token,
      });
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      res.status(500).json({ message: "Erro ao realizar login." });
    }
  }

  // Buscar um usuário por ID
  async buscar(req, res) {
    const { id } = req.params;
    try {
      const usuario = await LoginModels.buscar(id);
      res.status(200).json(usuario);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  // Atualizar dados do usuário
  async atualizar(req, res) {
    const { id } = req.params;
    const loginAtualizado = req.body;
    try {
      const result = await LoginModels.atualizar(loginAtualizado, id);
      res.status(202).json(result);
    } catch (error) {
      res.status(402).json({ message: error.message });
    }
  }

  // Deletar um usuário
  async deletar(req, res) {
    const { id } = req.params;
    try {
      const result = await LoginModels.deletar(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async pegarUsuarioAutenticado(req, res) {
    try {
      // req.usuario vem do middleware verificarToken, que decodificou o token
      const usuarioLogado = req.usuario;

      if (!usuarioLogado) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Opcional: aqui você pode buscar dados adicionais no banco, usando usuarioLogado.id
      // const usuario = await LoginModels.buscar(usuarioLogado.id);

      return res.status(200).json({ usuario: usuarioLogado });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Erro ao obter usuário autenticado" });
    }
  }
}

module.exports = new LoginController();
