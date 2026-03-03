create database PINGO;
use PINGO;

create table Esportes(
	ID_Esporte int auto_increment,
    Nome varchar(100),
    primary key (ID_Esporte)
);

select * from Esportes;

create table Quadra(
	ID_Quadra int auto_increment,
    NomeQuadra varchar(50) not null,
    EnderecoQuadra varchar(50) not null,
    ContatoTelefone varchar(11) null,
    Regiao varchar(255) not null,
    TipoQuadraFisica varchar(255) not null, -- Ex: "Campo", "Salão", "Areia"
	ContatoEmail varchar(255) null,
    ID_Esporte int,
    Acessos int default 0,
    Descricao text,
    Foto varchar(500) null, -- Armazena imagem
    Cidade varchar(50),
    Bairro varchar(50),
    DataCriacao date default (current_date), -- Salva a data a partir da criacao,
    TipoQuadra boolean default 0, -- Se for 1 é Proprietario
    primary key (ID_Quadra)
);

select * from Quadra;

create table QuadraPublica (
    ID_QuadraPublica int auto_increment,
    NomeQuadra varchar(50) not null,
    EnderecoQuadra varchar(50) not null,
    Regiao varchar(255) not null,
    TipoQuadraFisica varchar(255) not null,
    Acessos int default 0,
    Descricao text,
    Foto varchar(500) null, 
    Cidade varchar(50),
    Bairro varchar(50),
    DataCriacao date default (current_date), 
    TipoQuadraPublica boolean default 1, 
    primary key (ID_QuadraPublica)
);

select * from QuadraPublica;

create table QuadraEsportes (
    ID_Quadra int,
    ID_Esporte int,
    PRIMARY KEY (ID_Quadra, ID_Esporte),
    FOREIGN KEY (ID_Quadra) REFERENCES Quadra(ID_Quadra),
    FOREIGN KEY (ID_Esporte) REFERENCES Esportes(ID_Esporte)
);

select * from QuadraEsportes;

create table HorariosQuadra (
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
);

select * from HorariosQuadra;


create table Usuario(
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

select * from Usuario;


create table Favoritos(
	ID_Favoritos int auto_increment,
    ID_Quadra int,
    ID_Usuario int,
    primary key (ID_Favoritos),
    foreign key (ID_Quadra) references Quadra(ID_Quadra),
    foreign key (ID_Usuario) references Usuario(ID_Usuario)
);

select * from Favoritos;


create table FormaPagamento(
    ID_FormaPagamento int auto_increment,
    NomeFormaPagamento varchar(50),  
    Descricao text,  
    primary key (ID_FormaPagamento)
);

select * from FormaPagamento;

create table StatusPagamento(
	ID_StatusPagamento int auto_increment,
    StatusPagamento varchar(20) not null check (StatusPagamento in ('pendente', 'pago', 'falhou', 'estornado')),
    primary key (ID_StatusPagamento)
);

select * from StatusPagamento;

create table Agendamento (
    ID_Agendamento int auto_increment,
    ID_Usuario int,  
    ID_Quadra int, 
    ID_FormaPagamento int,   
    ID_StatusPagamento int,
    DataAgendamento datetime,  
    Preco decimal(10,2),  
    ID_TransacaoPagamento varchar(255),  
    DataPagamento datetime,  
    primary key (ID_Agendamento),
    foreign key (ID_Usuario) references Usuario(ID_Usuario),
    foreign key (ID_Quadra) references Quadra(ID_Quadra),
    foreign key (ID_FormaPagamento) references FormaPagamento(ID_FormaPagamento),
    foreign key (ID_StatusPagamento) references StatusPagamento(ID_StatusPagamento)
);

select * from Agendamento;

create table HistoricoPagamento (
	ID_Historico int auto_increment,
    ID_Agendamento int,
    DataPagamento datetime default current_timestamp,
    Preco decimal(10,2),
    primary key (ID_Historico),
    foreign key (ID_Agendamento) references Agendamento(ID_Agendamento)
);

select * from HistoricoPagamento;

create table FotosQuadra (
	ID_Foto int auto_increment,
    ID_Quadra int,
    URL_Foto text,
    primary key (ID_Foto),
    foreign key (ID_Quadra) references Quadra(ID_Quadra)
);

select * from FotosQuadra;

INSERT INTO Quadra (
    NomeQuadra, EnderecoQuadra, Regiao, ContatoEmail, TipoQuadraFisica, ContatoTelefone, Descricao, Foto, Cidade, Bairro
) VALUES  
('Quadra de Vôlei do Parque das Árvores', 'Rua das Árvores, 201', 'Norte', 'contato@parquedasarvores.com', 'Areia', '11988887777', 'Espaço para competições e treinos de vôlei de praia.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'São Paulo', 'Vila Madalena'),

('Campo de Futebol Sociedade Bela Vista', 'Avenida das Nações, 350', 'Sul', 'belavista@futebolsociety.com', 'Campo', '31998765432', 'Campo de futebol com grama sintética e ótimo acabamento.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'Bela Vista');


INSERT INTO Esportes (Nome) VALUES
('Futebol'),
('Basquete'),
('Vôlei');

INSERT INTO QuadraEsportes (ID_Quadra, ID_Esporte) VALUES
(1, 1), (1, 2), (1, 3),  -- Quadra 1: Futebol, Basquete, Vôlei
(2, 1);                  -- Quadra 2: Futebol

INSERT INTO HorariosQuadra (ID_Quadra, DataInicio, DataFim, Horarios, Preco, Intervalo)
VALUES 
-- Horários para a Quadra 1
(1, '2025-06-15', '2025-06-30', 
  '["08:00-09:00", "09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"]', 
  300.00, '01:00'),

-- Horários para a Quadra 2
(2, '2025-06-16', '2025-06-25', 
  '["18:00-19:00", "19:00-20:00", "20:00-21:00"]', 
  350.00, '01:00');

