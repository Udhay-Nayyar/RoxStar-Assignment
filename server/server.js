const http = require('http');
const app = require('./backend/src/app');
const { initSocket } = require('./backend/src/config/socket');
const registerSocketHandlers = require('./backend/src/sockets');


const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = initSocket(server)


// when ever we start the server we make sure that the socket is avaliable 
registerSocketHandlers(io);


if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`ROXSTAR backend listening on port ${PORT}`);
  });
}

module.exports = server;
