# Poker Game Backend (Node.js + TypeScript)

## 🏗 Project Structure

```
src/
├── controllers/         # Route handlers
├── models/              # Type definitions (Room, User)
├── routes/              # Express routes
├── services/            # Core logic (game, users, rewards)
├── socket/              # Socket.IO event handlers
│   └── socketListeners/ # Socket event files by feature
├── utils/               # Helper functions (shuffle, cards)
├── config/              # Constants and environment bindings
└── index.ts             # Entry point, loads env & starts server
```

## 🚀 Getting Started

1. **Clone & install**
```bash
git clone <repo>
cd project-folder
npm install
```

2. **Setup environment**
Create a `.env` file in project root:
```bash
cp .env.example .env
```

3. **Start server**
```bash
npm run dev    # using ts-node-dev
# or
npm run build && npm start
```

## 🔌 WebSocket Events
- `createRoom`
- `joinRoom`
- `leaveRoom`
- `agreeGame`
- `userConfirmBet`
- `userCancelBet`
- `startGame`
- `endGame`
- `listRoom`

## ✅ Tech Stack
- Node.js
- TypeScript
- Express
- Socket.IO
- dotenv

## 🧪 Testing (optional)
> To be added later with Jest

## 📄 License
MIT
