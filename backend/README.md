# MediTrack - Backend API Server

Express.js REST API with MongoDB (Mongoose) and JWT Authentication.

## Setup & Run
```bash
# Install dependencies
npm install

# Seed sample data into MongoDB
npm run seed

# Run in development mode with nodemon
npm run dev

# Run in production mode
npm start
```

## Environment (.env)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/meditrack
JWT_SECRET=meditrack_super_secret_jwt_key_2026_xyz
CLIENT_URL=http://localhost:5173
```

