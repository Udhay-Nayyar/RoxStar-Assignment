# Roxstar Server

This project contains the backend folder structure for the Roxstar application.

## Folder structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── env.js
│   │   └── socket.js
│   ├── db/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── schema.sql
│   ├── models/
│   │   ├── userModel.js
│   │   ├── roomModel.js
│   │   ├── memberModel.js
│   │   ├── draftModel.js
│   │   ├── spinModel.js
│   │   └── spinEventModel.js
│   ├── routes/
│   │   ├── roomRoutes.js
│   │   ├── draftRoutes.js
│   │   ├── spinRoutes.js
│   │   └── healthRoutes.js
│   ├── controllers/
│   │   ├── roomController.js
│   │   ├── draftController.js
│   │   └── spinController.js
│   ├── services/
│   │   ├── roomService.js
│   │   ├── draftService.js
│   │   └── spinEngine.js
│   ├── sockets/
│   │   ├── index.js
│   │   ├── roomSocket.js
│   │   └── spinSocket.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── validateRequest.js
│   │   └── requestLogger.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── idGenerator.js
│   └── app.js
├── tests/
│   ├── unit/
│   │   └── spinEngine.test.js
│   ├── integration/
│   │   └── room.test.js
│   └── setup.js
├── server.js
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```
