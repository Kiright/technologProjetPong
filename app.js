const express  = require('express');
const app      = express();
const path = require('path');
const port = 8080;
const server = require('http').Server(app);
const io = require('socket.io')(server);

require('dotenv-flow').config();
app.use(express.static('.'));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
});

let roomName = 0;
let waitingRoom = {};

// Quand un client se connecte
io.on('connection', function (socket) {
    socket.on('createNewGame', function (data){
        this.roomName = ++roomName;
        waitingRoom[`sallon-`+roomName] = {
            player1: {
                isReady: false,
                pseudo: data.pseudo
            },
            player2: {
                isReady: false,
                pseudo: null
            }
        }
        socket.join(`sallon-`+roomName);
        socket.emit('onJoin', {room : waitingRoom[`sallon-`+roomName]})
        socket.emit('createGame', { roomId : `sallon-${roomName}` });
    })
    
    socket.on('joinGame', function (data) {
        let room = io.nsps['/'].adapter.rooms[data.roomId];
        if (room && room.length === 1) {
            socket.join(data.roomId);
            waitingRoom[`sallon-`+roomName].player2.pseudo = data.pseudo;
            socket.broadcast.to(data.roomId).emit('onJoin', {room : waitingRoom[`sallon-`+roomName]});
            socket.emit('onJoin', {room : waitingRoom[`sallon-`+roomName]})
            socket.emit('player2', {roomId: data.roomId})
        } else {
            socket.emit('err', { message: 'Partie inexistante !' });
        }
    })

    socket.on('startGame', function (data) {
        socket.emit('letGo', {room : waitingRoom[`sallon-`+roomName]});
        socket.broadcast.to(data.roomId).emit('letGo', {room : waitingRoom[`sallon-`+roomName]});
    })

    socket.on('moving', (data)=>{
        if(data.player==='player1'){
            socket.broadcast.to(data.roomId).emit('player1move', {posY : data.posY});
        }else if(data.player==='player2'){
            socket.broadcast.to(data.roomId).emit('player2move', {posY : data.posY});
        }
    });

    socket.on('ball', (data)=>{
        socket.broadcast.to(data.roomId).emit('ballmove', {position : {posX : data.position.posX, posY : data.position.posY}});
    });

    socket.on('score', (data)=>{
        socket.emit('scoreUpdate', {player : data.player ,score :{player1 : data.score.player1, player2 : data.score.player2}});
        socket.broadcast.to(data.roomId).emit('scoreUpdate', {player : data.player ,score :{player1 : data.score.player1, player2 : data.score.player2}});
    });

    socket.on('isReady', (data)=>{
        waitingRoom[data.roomId][data.player].isReady = !waitingRoom[data.roomId][data.player].isReady;
        socket.emit('playerReady',{room : waitingRoom[`sallon-`+roomName]});
        socket.broadcast.to(data.roomId).emit('playerReady',{room : waitingRoom[`sallon-`+roomName]});
    });

    socket.on('disconnect', function () {
        io.emit('user disconnected');
    });
});

server.listen(port);