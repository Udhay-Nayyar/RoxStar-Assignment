const { Server } = require('socket.io'); // we are here importing the server 

let io; // this variable we are creatingn for storing the instancne of the server of web socket 

function initSocket(httpServer) { // this is the server that was created in the server.js file must know 
  io = new Server(httpServer, { // using thaat server and making the object out of it
    cors: {
      origin: '*', // tighten this to your Android app's origin before final submission && This controls which clients are allowed to connect.
      methods: ['GET', 'POST'],
    },
  });
  return io;
}

// ask the server from this fucntion if the if created then fine return that else error do ki initialized nhi huya abhi  
function getIO() { 
  if (!io) throw new Error('Socket.io not initialized yet — call initSocket() first.');
  return io;
}

module.exports = { initSocket, getIO }; // simple hai bs exporting that function 