const { Router } = require("express");
const eventoRouter = require("./EventosRoute");
const loginRouter = require("./LoginRoute");
const esportesRouter = require("./EsportesRouter");
const quadrasRouter = require("./QuadraRouter");
const configRouter = require("./ConfigRouter");
const favoritosRouter = require("./FavoritosRouter");
const pagamento = require("./PagamentoRouter");
const agendamentoRouter = require("./AgendamentoRouter");

module.exports = (app, express) => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/eventos", eventoRouter);
  app.use("/auth", loginRouter);
  app.use("/esportes", esportesRouter);
  app.use("/quadras", quadrasRouter);
  app.use("/Config", configRouter);
  app.use("/favoritos", favoritosRouter);
  app.use("/pagamento", pagamento);
  app.use("/agendamentos", agendamentoRouter);
};
