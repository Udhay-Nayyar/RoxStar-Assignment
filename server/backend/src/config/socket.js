// this follows the single design pattern bhai 
// steps import the specfic lib or  depenndecy 
// create the server and the give it when asked 

const { Server } = require('socket.io');

let io;  

function initSocket(httpServer) { 
  io = new Server(httpServer, { 
    cors: {
      origin: '*',  // allowing all the orgin to pass the request 
      methods: ['GET', 'POST'], // only these 2 are allowed reason is clear that when this start its sockect io in start then it upgrade to the web socket 
      // but the socket io using the https methods to load so the permission is needed
      // HTTP long polling as a transport 
    },
  });
  return io;
}


function getIO() { 
  if (!io) throw new Error('Socket.io not initialized yet — call initSocket() first.');
  return io;
}

module.exports = { initSocket, getIO };