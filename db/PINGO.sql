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

select * from HorariosDisponiveis;


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

('Campo de Futebol Sociedade Bela Vista', 'Avenida das Nações, 350', 'Sul', 'belavista@futebolsociety.com', 'Campo', '31998765432', 'Campo de futebol com grama sintética e ótimo acabamento.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'Bela Vista'),

('Ginásio Poliesportivo Cristal', 'Rua Cristal, 150', 'Oeste', NULL, 'Areia', '61987654320', 'Ginásio moderno para múltiplos esportes e eventos.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Brasília', 'Águas Claras'),

('Campo de Futebol EcoPark', 'Rua do Verde, 33', 'Leste', 'ecopark@futebol.com.br', 'Campo', '41987654300', 'Campo ecológico com sistema de irrigação inteligente.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Curitiba', 'Jardim Botânico'),

('Quadra de Tênis Parque Azul', 'Avenida Azul, 500', 'Sul', 'tenis@parqueazul.com', 'Salão', '21348976543', 'Quadra de tênis coberta com iluminação para noite.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Rio de Janeiro', 'Barra da Tijuca'),

('Pista de Skate Radical Onda', 'Rua das Ondas, 102', 'Norte', NULL, 'Salão', '31987654321', 'Pista de skate com obstáculos radicais.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'Centro'),

('Campo de Futebol Areia Branca', 'Rua das Pedras, 899', 'Oeste', 'areia@futebolsociety.com', 'Areia', '21987654321', 'Campo de futebol de areia com excelente estrutura.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Rio de Janeiro', 'Barra'),

('Ginásio de Basquete Arena Central', 'Avenida Central, 101', 'Sul', NULL, 'Campo', '41349876543', 'Ginásio para competições de basquete, com arquibancada.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Curitiba', 'Centro'),

('Quadra de Tênis Alvorada', 'Rua do Sol, 22', 'Oeste', 'alvorada@tenis.com.br', 'Salão', '41987654322', 'Quadra de tênis com piso de saibro e iluminação.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'São Paulo', 'Alto de Pinheiros'),

('Campo de Futebol Morumbi', 'Avenida Morumbi, 880', 'Norte', 'morumbi@futebolsociety.com', 'Campo', '11943219876', 'Campo de futebol gramado para campeonatos amadores.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'São Paulo', 'Morumbi'),

('Quadra de Futsal Vitória', 'Rua das Flores, 198', 'Leste', NULL, 'Campo', '41987654301', 'Quadra de futsal com piso especial e iluminação LED.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Curitiba', 'Bairro Novo'),

('Pista de Skate Street Revolution', 'Rua Skate, 9', 'Sul', 'skate@street.com', 'Salão', '61976543210', 'Pista de skate com rampas e obstáculos de street.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Brasília', 'Plano Piloto'),

('Quadra de Tênis Clube São Paulo', 'Rua das Acácias, 77', 'Norte', 'clube@tenis.com', 'Salão', '11987654321', 'Quadra de tênis para sócios do clube, com rede profissional.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'São Paulo', 'Jardim Paulista'),

('Campo de Futebol Jardim das Flores', 'Rua das Flores, 789', 'Oeste', NULL, 'Campo', '31976543210', 'Campo de futebol com excelente estrutura para treino.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'Cidade Jardim'),

('Ginásio de Vôlei Praia do Sol', 'Avenida Atlântica, 500', 'Sul', NULL, 'Areia', '21954321098', 'Ginásio para competições de vôlei de praia, com grandes arquibancadas.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Rio de Janeiro', 'Copacabana'),

('Campo de Futebol de Areia Praia dos Anjos', 'Avenida Praia, 123', 'Leste', 'praia@futebolareia.com', 'Areia', '41987654322', 'Campo para futebol de areia em frente ao mar.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Curitiba', 'Praia'),

('Quadra de Tênis Parque Laranjeiras', 'Rua das Laranjeiras, 321', 'Oeste', NULL, 'Salão', '31987654345', 'Quadra de tênis com sistema de marcação automática de pontos.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'Laranjeiras'),

('Ginásio de Futsal Arena Futebol', 'Rua do Futebol, 850', 'Sul', NULL, 'Areia', '21345678901', 'Ginásio multiuso para futsal e outras atividades.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Rio de Janeiro', 'Ipanema'),

('Campo de Futebol Recreativo do Sol', 'Rua da Paz, 45', 'Norte', NULL, 'Campo', '11943219877', 'Campo de futebol para jogos recreativos e treinos leves.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'São Paulo', 'Tucuruvi'),

('Quadra de Basquete Alto da Boa Vista', 'Rua Boa Vista, 300', 'Oeste', NULL, 'Campo', '31976543232', 'Quadra de basquete com piso de alta qualidade e marcações oficiais.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'Boa Vista'),

('Pista de Skate Freedom', 'Avenida Liberdade, 25', 'Sul', NULL, 'Salão', '61987654332', 'Pista de skate para iniciantes e profissionais, com espaço para manobras.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Brasília', 'Liberdade'),

('Campo de Futebol Society Paulista', 'Rua Paulista, 800', 'Norte', 'paulista@futebolsociety.com', 'Campo', '41998765432', 'Campo de futebol de grama sintética com ótimas instalações.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'São Paulo', 'Jardim Paulista'),

('Quadra de Tênis Monte Alegre', 'Avenida Alegre, 950', 'Sul', 'tenis@montealegre.com', 'Salão', '21398765432', 'Quadra de tênis com ótima vista para a cidade.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Rio de Janeiro', 'Barra'),

('Pista de Skate Sunset', 'Rua do Sol, 888', 'Leste', NULL, 'Salão', '41943219876', 'Pista de skate com espaço para eventos e campeonatos.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Curitiba', 'Lagoa'),

('Campo de Futebol Campeão', 'Avenida dos Campeões, 100', 'Oeste', NULL, 'Campo', '31943219877', 'Campo de futebol para competições e grandes torneios.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'São Luiz'),

('Quadra de Futsal Ouro', 'Rua Ouro, 77', 'Sul', 'ouro@futsal.com.br', 'Campo', '21343219865', 'Quadra de futsal com iluminação LED e piso de alta qualidade.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Rio de Janeiro', 'Leblon'),

('Campo de Futebol Grama Real', 'Rua Real, 45', 'Norte', NULL, 'Campo', '11998765432', 'Campo de futebol com grama natural e vestiários.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'São Paulo', 'Mooca'),

('Ginásio de Vôlei Olímpico', 'Avenida Olímpica, 777', 'Leste', NULL, 'Areia', '41987654322', 'Ginásio para competições internacionais de vôlei de praia.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Curitiba', 'Santa Felicidade'),

('Pista de Skate Nova Geração', 'Rua Skate Park, 123', 'Oeste', NULL, 'Salão', '31998765421', 'Pista de skate para iniciantes e veteranos, com rampas e bowls.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Belo Horizonte', 'Nova Granada'),

('Campo de Futebol Cristal', 'Avenida do Cristal, 20', 'Sul', NULL, 'Campo', '21343219888', 'Campo com campo de grama natural e excelente infraestrutura.', 'https://pinturasdequadra.com.br/wp-content/uploads/2023/05/Rio-Claro-Azul-1-1024x461.jpg', 'Rio de Janeiro', 'Cristo Redentor');

INSERT INTO HorariosDisponiveis (ID_Quadra, horario) VALUES 
(1, '16:00:00'), (1, '13:50:00'), (1, '15:00:00'),
(2, '09:00:00'), (2, '11:00:00'), (2, '14:00:00'),
(3, '08:00:00'), (3, '10:00:00'), (3, '14:30:00'),
(4, '12:00:00'), (4, '15:30:00'), (4, '17:00:00'),
(5, '09:30:00'), (5, '11:30:00'), (5, '16:15:00'),
(6, '10:00:00'), (6, '13:00:00'), (6, '15:30:00'),
(7, '08:30:00'), (7, '11:30:00'), (7, '14:30:00'),
(8, '09:00:00'), (8, '12:00:00'), (8, '16:00:00'),
(9, '10:00:00'), (9, '13:30:00'), (9, '16:00:00'),
(10, '09:00:00'), (10, '14:30:00'), (10, '17:30:00'),
(11, '08:30:00'), (11, '11:00:00'), (11, '13:30:00'),
(12, '10:30:00'), (12, '12:30:00'), (12, '16:00:00'),
(13, '09:30:00'), (13, '12:00:00'), (13, '15:00:00'),
(14, '08:00:00'), (14, '10:30:00'), (14, '15:00:00'),
(15, '13:00:00'), (15, '15:30:00'), (15, '17:00:00');


INSERT INTO Esportes (Nome) VALUES
('Futebol'),
('Basquete'),
('Vôlei');

INSERT INTO QuadraEsportes (ID_Quadra, ID_Esporte) VALUES
(1, 1), (1, 2), (1, 3),  -- Quadra 1: Futebol, Basquete, Vôlei
(2, 1),                  -- Quadra 2: Futebol
(3, 3),                  -- Quadra 3: Vôlei
(4, 2),                  -- Quadra 4: Basquete
(5, 3),                  -- Quadra 5: Vôlei
(6, 1), (6, 2),          -- Quadra 6: Futebol, Basquete
(7, 1), (7, 2),          -- Quadra 7: Futebol, Basquete
(8, 2),                  -- Quadra 8: Basquete
(9, 1),                  -- Quadra 9: Futebol
(10, 2),                 -- Quadra 10: Basquete
(11, 3),                 -- Quadra 11: Vôlei
(12, 3),                 -- Quadra 12: Vôlei
(13, 1),                 -- Quadra 13: Futebol
(14, 1),                 -- Quadra 14: Futebol
(15, 2);                 -- Quadra 15: Basquete
