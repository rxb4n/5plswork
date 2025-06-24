const { createServer } = require('http');
   const { Server } = require('socket.io');
   const { createAdapter } = require('@socket.io/postgres-adapter');
   const { Pool } = require('pg');
   const next = require('next');

   const dev = process.env.NODE_ENV !== 'production';
   const app = next({ dev });
   const handle = app.getRequestHandler();

   const port = process.env.PORT || 3000;

   // Database connection for Socket.IO adapter
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
   });

   app.prepare().then(() => {
     const server = createServer((req, res) => {
       handle(req, res);
     });

     const io = new Server(server, {
       cors: {
         origin: '*', // Adjust for production
         methods: ['GET', 'POST'],
       },
     });

     // Use PostgreSQL adapter for scalability
     pool.query(`
       CREATE TABLE IF NOT EXISTS socket_io_attachments (
         id SERIAL PRIMARY KEY,
         created_at TIMESTAMPTZ DEFAULT NOW(),
         payload BYTEA
       );
     `).then(() => {
       io.adapter(createAdapter(pool));
       console.log('Socket.IO PostgreSQL adapter initialized');
     }).catch(err => {
       console.error('Error initializing Socket.IO adapter:', err);
     });

     io.on('connection', (socket) => {
       console.log(`Client connected: ${socket.id}`);

       // Join room
       socket.on('join-room', async ({ roomId, playerId }) => {
         try {
           socket.join(roomId);
           console.log(`Player ${playerId} joined room ${roomId}`);
           // Broadcast updated room state
           const room = await require('./lib/database').getRoom(roomId);
           if (room) {
             io.to(roomId).emit('room-update', room);
           }
         } catch (err) {
           console.error('Error joining room:', err);
           socket.emit('error', { message: 'Failed to join room' });
         }
       });

       // Handle game actions
       socket.on('game-action', async ({ action, roomId, playerId, data }) => {
         try {
           const { updateRoom, updatePlayer, getRoom, generateQuestion } = require('./lib/database');
           let updatedRoom = null;

           switch (action) {
             case 'update-language':
               await updatePlayer(playerId, {
                 language: data.language,
                 ready: false,
               });
               updatedRoom = await getRoom(roomId);
               break;

             case 'toggle-ready':
               const room = await getRoom(roomId);
               const player = room?.players.find(p => p.id === playerId);
               if (player && player.language) {
                 await updatePlayer(playerId, { ready: !player.ready });
                 updatedRoom = await getRoom(roomId);
               }
               break;

             case 'start-game':
               const gameRoom = await getRoom(roomId);
               const host = gameRoom?.players.find(p => p.id === playerId);
               if (host?.is_host && gameRoom) {
                 const playersWithLanguage = gameRoom.players.filter(p => p.language);
                 if (playersWithLanguage.length > 0 && playersWithLanguage.every(p => p.ready)) {
                   await updateRoom(roomId, {
                     game_state: 'playing',
                     question_count: 0,
                   });
                   for (const p of playersWithLanguage) {
                     if (p.language) {
                       const question = generateQuestion(p.language);
                       await updatePlayer(p.id, { current_question: question });
                     }
                   }
                   updatedRoom = await getRoom(roomId);
                 }
               }
               break;

             case 'answer':
               const answerRoom = await getRoom(roomId);
               const answeringPlayer = answerRoom?.players.find(p => p.id === playerId);
               if (answeringPlayer && answeringPlayer.current_question) {
                 const { answer, timeLeft } = data;
                 const isCorrect = answer === answeringPlayer.current_question.correctAnswer;
                 if (isCorrect) {
                   const points = Math.max(1, 10 - (10 - timeLeft));
                   const newScore = answeringPlayer.score + points;
                   await updatePlayer(playerId, { score: newScore });
                   if (newScore >= answerRoom.target_score) {
                     await updateRoom(roomId, {
                       game_state: 'finished',
                       winner_id: playerId,
                     });
                   }
                 }
                 if (answeringPlayer.language) {
                   const nextQuestion = generateQuestion(answeringPlayer.language);
                   await updatePlayer(playerId, { current_question: nextQuestion });
                 }
                 updatedRoom = await getRoom(roomId);
               }
               break;

             case 'update-target-score':
               const targetRoom = await getRoom(roomId);
               const targetPlayer = targetRoom?.players.find(p => p.id === playerId);
               if (targetPlayer?.is_host && [100, 250, 500].includes(Number(data.targetScore))) {
                 await updateRoom(roomId, { target_score: Number(data.targetScore) });
                 updatedRoom = await getRoom(roomId);
               }
               break;

             case 'restart':
               const restartRoom = await getRoom(roomId);
               const restartHost = restartRoom?.players.find(p => p.id === playerId);
               if (restartHost?.is_host) {
                 await updateRoom(roomId, {
                   game_state: 'lobby',
                   winner_id: null,
                   question_count: 0,
                   target_score: 100,
                 });
                 for (const p of restartRoom.players) {
                   await updatePlayer(p.id, {
                     score: 0,
                     ready: false,
                     current_question: null,
                   });
                 }
                 updatedRoom = await getRoom(roomId);
               }
               break;

             case 'leave':
               await require('./lib/database').removePlayerFromRoom(playerId);
               const roomAfterLeave = await getRoom(roomId);
               if (!roomAfterLeave || roomAfterLeave.players.length === 0) {
                 await require('./lib/database').deleteRoom(roomId);
               } else {
                 await require('./lib/database').ensureRoomHasHost(roomId);
                 updatedRoom = await getRoom(roomId);
               }
               break;
           }

           if (updatedRoom) {
             io.to(roomId).emit('room-update', updatedRoom);
           }
         } catch (err) {
           console.error(`Error processing action ${action}:`, err);
           socket.emit('error', { message: `Failed to process ${action}` });
         }
       });

       socket.on('disconnect', () => {
         console.log(`Client disconnected: ${socket.id}`);
       });
     });

     server.listen(port, () => {
       console.log(`> Server running on http://localhost:${port}`);
     });
   }).catch(err => {
     console.error('Error starting server:', err);
     process.exit(1);
   });