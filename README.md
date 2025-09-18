<div align="center"><img width="540" height="360" alt="20250918_1327_Futuristic Logo Design_simple_compose_01k5e95ajee9jrc902b0b7pnww" src="./public/20250918_1327_Futuristic Logo Design_simple_compose_01k5e95ajee9jrc902b0b7pnww.png" /></div>

# Discord Clone Backend

A discord like app with servers, channels, role-management and DMs.

## Features

Users can:

- Chat with other users in DMs
- Add reactions and replies to messages
- Can create or join servers
- Within servers, can write messages in channels
- Create roles within servers that manage permissions for: manage roles, manage view channels, manage server
- Can customise channel access based on roles

## Tech Stack

### Core Technologies

- Node.js
- Express.js
- MongoDB & Mongoose
- Socket.io (for managing real time chats)
- Vitest (for testing)

## Run Project Locally

### Prerequisites

- MongoDB: Install MongoDB locally on your machine either with [docker](https://hub.docker.com/_/mongo) (recommended) or [MongoDB Community Server](https://www.mongodb.com/try/download/community).

### Environment Variables

You'll need to set up:

- MongoDB connection string
- DB name
- Frontend API key
- Access token secret
- Refresh token secret
- (Port)

### Installation

1. Clone the repository

```bash
git clone https://github.com/your-username/whatdidyougetdonetoday-ai.git
cd discord-clone-backend
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

### Run Tests

1. Create a .env.test file

2. Run tests

```bash
npm run test
```
