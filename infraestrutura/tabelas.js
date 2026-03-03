class Tabelas {
  init(conexao) {
    this.conexao = conexao;
    this.criarTabelaEvento();
    this.criarTabelaLogin();
    this.criarTabelaEsportes();
    this.criarTabelaPerfil();
  }

  criarTabelaEvento() {
    const sql2 = `
    create table if not exists Eventos(
	  ID_Eventos int auto_increment,
    Nome_Evento varchar(50) not null,
    ID_Esporte int not null,
    DataHora datetime,
    Descricao text not null,
    primary key (ID_Eventos)
    );
        `;
    this.conexao.query(sql2, (error) => {
      if (error) {
        console.log("Eita sentou viu, bem no evento");
        console.log(error.message);
        return;
      }
    });
  }

  criarTabelaLogin() {
    const sql2 = `
    create table if not exists Usuario(
	  ID_Usuario int auto_increment,
    NomeUsuario varchar(40) not null,
    CPF char(11) unique  null,
    Email varchar(150) unique null,
    Senha varchar(225) not null,
    Google_ID varchar(255) unique null,
    Criado_em timestamp default current_timestamp,
    primary key (ID_Usuario)
);
  `;
    this.conexao.query(sql2, (error) => {
      if (error) {
        console.log("Eita sentou viu, bem no login");
        console.log(error.message);
        return;
      }
    });
  }

  criarTabelaEsportes() {
    const sql2 = `
    create table if not exists Esportes(
	  ID_Esporte int auto_increment,
    NomeEsporte varchar(100),
    primary key (ID_Esporte)
);
    `;
    this.conexao.query(sql2, (error) => {
      if (error) {
        console.log("Eita sentou viu, bem no esportes");
        console.log(error.message);
        return;
      }
    });
  }

  criarTabelaPerfil() {
    const sql2 = `
    create table if not exists Usuario(
	ID_Usuario int auto_increment,
    NomeUsuario varchar(100) not null,
    Biografia varchar(225) null,
    FotoUsuario varchar(255) null,
    CPF char(11) unique  null,
    Email varchar(150) unique null,
    Senha varchar(225) not null,
    Google_ID varchar(255) unique null,
    Criado_em timestamp default current_timestamp,
    TipoUsuario varchar(20) check (TipoUsuario in ('proprietario', 'funcionario do proprietario', 'admin', 'usuario comum')) not null,  -- Tipo de usuário
    primary key (ID_Usuario)
);
    `;
    this.conexao.query(sql2, (error) => {
      if (error) {
        console.log("Eita sentou viu, bem no perfil");
        console.log(error.message);
        return;
      }
    });
  }

  criarTabelaHorariosQuadra() {
    const sql2 = `create table HorariosQuadra (
	ID_Config int auto_increment,
	ID_Quadra int not null,
	DataInicio date not null,
	DataFim date not null,
	Horarios text not null, -- Armazena em JSON
	Preco decimal(10,2) not null default 0,
	Intervalo varchar(10) not null,
	DataCriacao timeStamp default current_timestamp,
	primary key (ID_Config),
	foreign key (ID_Quadra) references Quadra(ID_Quadra) on delete cascade
);`;
    this.conexao.query(sql2, (error) => {
      if (error) {
        console.log("Eita sentou viu, bem na quadraHorarios");
        console.log(error.message);
        return;
      }
    });
  }
}

module.exports = new Tabelas();
