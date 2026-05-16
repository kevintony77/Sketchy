const PORT = process.env.PORT || 3000;
const io = require('socket.io')(PORT, {
    cors: {
        origin: "http://127.0.0.1:5500"
    }
})
let currentTurnId = 0;
let turnOrder = [];
const users = {}
const votes = {}
let startVoteRequests = new Set();
let gameState = 'drawing';

io.on("connection", socket => {

    console.log('new User')
    socket.on('start-game', () => {
        if (!users[socket.id]) return;
        if (users[socket.id]['name'] == "host") {

            turnOrder = Object.keys(users);
            currentTurnId = 0;
            io.emit("turn", turnOrder[currentTurnId]);

            console.log(users[socket.id])
            console.log('game started')
            const userArr = Object.values(users)
            userArr.forEach(el => {
                el.status = 'normal'
            })
            const imposter = userArr[Math.floor(Math.random() * userArr.length)]
            imposter.status = 'imposter';
            console.log(imposter.name)
            for (const id in users) {
                const user = users[id];
                io.to(id).emit("role", user.status);

            }
        }
    })
    socket.on('request-start-vote', () => {
        startVoteRequests.add(socket.id)
        const totalPlayers = turnOrder.length;
        if (startVoteRequests.size > totalPlayers / 2) {
            console.log('vote has started');
            io.emit("start-vote", users);
            gameState = 'voting';
            startVoteRequests.clear();
        }

    })
    socket.on('cast-vote', (id) => {
        votes[socket.id] = id;
        console.log(votes)
        if (Object.keys(votes).length === Object.keys(users).length) {
            io.emit('vote-over')
            const frequencyMap = {};
            Object.values(votes).forEach(votedId => { frequencyMap[id] = (frequencyMap[id] || 0) + 1 })
            let highestVotes = 0;
            let finalUserId = null;
            for (const id in frequencyMap) {
                if (frequencyMap[id] > highestVotes) {
                    highestVotes = frequencyMap[id];
                    finalUserId = id;
                }
            }
            if (finalUserId && users[finalUserId]) {
                const votedUser = users[finalUserId];

                if (votedUser.status !== 'imposter') {
                    votedUser.status = 'spectator';
                    console.log(votedUser.name, 'is now a spectator');
                    const index = turnOrder.indexOf(finalUserId);
                    if (index !== -1) turnOrder.splice(index, 1);
                    if (index < currentTurnId) currentTurnId--;
                    if (currentTurnId >= turnOrder.length) currentTurnId = 0;

                } else {
                    console.log(votedUser.name, 'was the Imposter! Artists win!');
                    io.emit('game-over', { winner: 'Artists' });
                }
            }
            gameState = 'drawing';
        }

    })
    socket.on('turnover', () => {
        if (gameState == 'drawing') {
            console.log(currentTurnId)
            if (turnOrder.length === 0) {
                return;
            }

            currentTurnId++;
            console.log(currentTurnId)
            console.log(turnOrder, turnOrder.length)
            if (currentTurnId == turnOrder.length) {
                currentTurnId = 0;
            }
            console.log(currentTurnId)
            io.emit("turn", turnOrder[currentTurnId]);
        }

    })
    socket.on('draw', data => {
        if (socket.id !== turnOrder[currentTurnId]) return;
        if (gameState !== 'drawing') return;

        socket.broadcast.emit('draw-data', data)
        socket.broadcast.emit('drawing-user', users[turnOrder[currentTurnId]]['name'])
    })
    socket.on('clear', () => {
        socket.broadcast.emit('clear')
    })
    socket.on('new-user', name => {
        users[socket.id] = { name: name };
        for (const id in users) {
            io.emit('playerList', users)
        }

        socket.broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', (message) => {
        socket.broadcast.emit('chat-message', { message: message, name: users[socket.id]['name'] })
    })
    socket.on("disconnect", () => {
        const user = users[socket.id];

        if (!user) return; // important safety check
        // notify others
        socket.broadcast.emit("user-disconnected", user.name);

        // remove from users
        delete users[socket.id];
        const index = turnOrder.indexOf(socket.id);
        if (index !== -1) {
            turnOrder.splice(index, 1);

            if (index < currentTurnId) currentTurnId--;
            if (currentTurnId >= turnOrder.length) currentTurnId = 0;
        }

        delete votes[socket.id];
        io.emit('user-removed', users)
    })
})