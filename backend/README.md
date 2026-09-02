# Vinexus Backend API Foundation

Production-ready Node.js & Express backend foundation for the Vinexus platform.

## Tech Stack
- **Runtime**: Node.js (v18+ or v20+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Language**: JavaScript (ES Modules)
- **Validation**: Zod
- **Security & Logging**: Helmet, CORS, Morgan

---

## Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/) instance running locally or accessible via URI connection string

---

## Environment Setup
Inside the `backend` directory, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default `.env` configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/vinexus
API_BASE_URL=/api
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

## Installation & Running

```bash
cd backend
npm install
npm run dev
```

---

## Testing

```bash
npm test
```
