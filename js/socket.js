(function () {
    var requestAnimId;
    let player;
    let socket = io();
    let dataRoom;

    var initialisation = function () {
        // le code de l'initialisation
        game.init();
        requestAnimId = window.requestAnimationFrame(main); // premier appel de main au rafraîchissement de la page
    }

    document.getElementById('createGame').onclick = ()=> {
        var pseudo = prompt("Choisissez un pseudo");
        while(pseudo==="")
            pseudo = prompt("Choisissez un pseudo");
        if(pseudo!=null){
            document.getElementById('menu').hidden = true;
            socket.emit('createNewGame', {pseudo : pseudo});
            var btn = document.createElement("button");
            btn.innerHTML = "Commencer la partie";
            btn.id = "startGameButton"
            btn.onclick = ()=>{
                if(this.dataRoom && this.dataRoom.player1.isReady &&
                    (!this.dataRoom.player2.pseudo || this.dataRoom.player2.isReady)) {
                    if (!this.dataRoom.player2.pseudo) {
                        game.playerTwo.isAI = true;
                        game.playerTwo.ai = true;
                    }else game.playerTwo.isAI = false;
                    game.gameOn = true;
                    game.playerTwo.isMe = false;
                    socket.emit('startGame', {roomId: this.newPong.getGameId()});
                }else alert("Tous les joueurs ne sont pas prets");
            }
            document.getElementById('buttons').appendChild(btn);
            game.playerOne.isMe=true;
        }
    };

    document.getElementById('buttonReady').onclick = ()=> {
        socket.emit('isReady', {roomId : this.newPong.getGameId(), player: player.getPlayerPosition()});
    };

    var main = function () {
        // le code du jeu
        game.playersBallLayer.clear();
        game.clearLayer(game.playersBallLayer);
        game.movePlayers();
        if(!game.playerTwo.isAI)
            sendPosition();
        game.displayPlayers();
        game.moveBall();
        if(!game.playerTwo.isAI)
            ballPosition();
        if ( game.ball.inGame ) {
            game.lostBall();
            scoreCheck();
        }
        if(game.playerTwo.isAI)
            game.ai.move();
        game.collideBallWithPlayersAndAction();
        requestAnimId = window.requestAnimationFrame(main);
    }

    var sendPosition = function(){
        if ( game.playerOne.goDown || game.playerOne.goUp) socket.emit('moving', { roomId : this.newPong.getGameId(),player : 'player1' ,posY : game.playerOne.posY});
        else if ( game.playerTwo.goDown || game.playerTwo.goUp) socket.emit('moving', {roomId : this.newPong.getGameId(), player : 'player2' ,posY : game.playerTwo.posY});
    }

    var ballPosition = function(){
        if(game.ball.inGame)
            socket.emit('ball', {roomId :this.newPong.getGameId(), position : {posX : game.ball.posX, posY : game.ball.posY}});
    }

    var scoreCheck = function(){
        if(game.ball.lost(game.playerOne))
            socket.emit('score',{roomId : this.newPong.getGameId(), player : 'player1', score :{player1 : game.playerOne.score, player2 : game.playerTwo.score}});
        else if(game.ball.lost(game.playerTwo))
            socket.emit('score',{roomId : this.newPong.getGameId(), player : 'player2', score :{player1 : game.playerOne.score, player2 : game.playerTwo.score}});
    }

    socket.on('createGame', (data) => {
        const message =`ID de la partie : ${data.roomId}`;
        this.newPong = new Game(data.roomId);
        this.newPong.displayGame(message);
        game.playerOne.isSelected=true;
        player = new Player('player1');
    });

    document.getElementById('joinGame').onclick = () => {
        const roomID = document.getElementById('RoomName').value;
        if (!roomID) {
            alert('Please enter the name of the game.');
            return;
        }
        var pseudo = prompt("Choisissez un pseudo");
        while(pseudo==="")
            pseudo = prompt("Choisissez un pseudo");
        if(pseudo!=null) {
            document.getElementById('menu').hidden = true;
            socket.emit('joinGame', {roomId: roomID, pseudo: pseudo});
            player = new Player('player2');
            game.playerTwo.isMe=true;
            this.newPong = new Game(roomID);
        }
    }

    socket.on('onJoin', (data) => {
        document.getElementById('menu').hidden = true;
        if(data.room.player1.pseudo){
            document.getElementById('pseudoP1').textContent = data.room.player1.pseudo;
            if (data.room.player1.isReady)
                document.getElementById('p1Ready').textContent = "Pret";
            else
                document.getElementById('p1Ready').textContent = "Pas Pret";
        }
        if(data.room.player2.pseudo) {
            document.getElementById('pseudoP2').textContent = data.room.player2.pseudo;
            if (data.room.player2.isReady)
                document.getElementById('p2Ready').textContent = "Pret";
            else
                document.getElementById('p2Ready').textContent = "Pas Pret";
        }
        document.getElementById('buttonReady').hidden = false;
        dataRoom = data.room;
    });

    socket.on('playerReady', (data) => {
        if(data.room.player1.pseudo){
            document.getElementById('pseudoP1').textContent = data.room.player1.pseudo;
            if (data.room.player1.isReady)
                document.getElementById('p1Ready').textContent = "Pret";
            else
                document.getElementById('p1Ready').textContent = "Pas Pret";
        }
        if(data.room.player2.pseudo) {
            document.getElementById('pseudoP2').textContent = data.room.player2.pseudo;
            if (data.room.player2.isReady)
                document.getElementById('p2Ready').textContent = "Pret";
            else
                document.getElementById('p2Ready').textContent = "Pas Pret";
        }
        this.dataRoom = data.room;
    });

    socket.on('letGo', (data) => {
        game.gameOn = true;
        game.ball.inGame = true;
        document.getElementById('principal').hidden = true;
        initialisation();

    });

    socket.on('player1move',(data)=>{
        if(game.playerTwo.isMe)game.playerOne.posY=data.posY;
    });

    socket.on('player2move',(data)=>{
        if(game.playerOne.isMe)game.playerTwo.posY=data.posY;
    });

    socket.on('ballmove',(data)=>{
        game.ball.posX=data.position.posX;
        game.ball.posY=data.position.posY;
    });

    socket.on('scoreUpdate',(data)=>{
        if(data.player==='player1')game.playerOne.turnServe=true;
        else if(data.player==='player2')game.playerTwo.turnServe=true;
        game.playerOne.score=data.score.player1;
        game.playerTwo.score=data.score.player2;
        game.scoreLayer.clear();
        game.displayScore(game.playerOne.score,game.playerTwo.score);
        if(game.playerOne.isMe && (game.playerOne.score==='V' || game.playerTwo.score==='V')){
            game.gameOn=false;
            if(game.playerOne.score==='V'){
                if(dataRoom.player2.pseudo)
                    alert("Félicitation, tu as gagné contre " + dataRoom.player2.pseudo+"!")
                else
                    alert("Félicitation, tu as gagné contre " + "IA!")
            }else {
                if(dataRoom.player2.pseudo)
                    alert("Dommage, tu as perdu contre " + dataRoom.player2.pseudo+"!")
                else
                    alert("Dommage, tu as perdu contre " + "IA!")
            }
            window.location.reload();
        }
        else if(game.playerTwo.isMe && (game.playerOne.score==='V' || game.playerTwo.score==='V')){
            game.gameOn=false;
            if(game.playerTwo.score==='V'){
                alert("Félicitation, tu as gagné contre " + dataRoom.player1.pseudo+"!")
            }else {
                alert("Dommage, tu as perdu contre " + dataRoom.player1.pseudo+"!")
            }
            window.location.reload();
        }
    });

    socket.on('err', (data) => {
        alert(data.message);
        location.reload();
    });

    class Game {
        constructor(roomId) {
            this.roomId = roomId;
        }
        displayGame(message) {
            document.getElementById('message').textContent=message;
        }
        getGameId(){
            return this.roomId;
        }
    }

    class Player {
        constructor(position) {
            this.position = position;
        }
        getPlayerPosition() {
            return this.position;
        }
    }
}());