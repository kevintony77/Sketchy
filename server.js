const words = [
    "Candy Castle",
    "Pirate Ship",
    "Haunted House",
    "Treehouse",
    "Jungle Temple",
    "Toy Factory",
    "Arcade Center",
    "Castle Throne",
    "Rocket Launch",
    "Submarine",

    "Ice Cream Truck",
    "Birthday Cake",
    "Chocolate Fountain",
    "Pizza Scooter",
    "Popcorn Machine",
    "Bakery Shelf",
    "Pancake Table",
    "Hot Chocolate",
    "Sushi Bar",
    "Food Truck",

    "Messy Bedroom",
    "Science Fair",
    "Bus Stop",
    "Birthday Party",
    "Movie Theater",
    "Cooking Contest",
    "Gaming Room",
    "Pillow Fight",
    "Backyard BBQ",
    "Classroom",

    "Cat Cafe",
    "Dog Party",
    "Safari Jeep",
    "Aquarium",
    "Butterfly Garden",
    "Pet Shop",
    "Zoo Entrance",
    "Horse Stable",
    "Farm Barn",
    "Birdhouse",

    "Construction Site",
    "Fire Truck",
    "Airplane Cockpit",
    "Train Station",
    "Robot Garage",
    "Police Station",
    "Hospital Room",
    "Camping Tent",
    "Beach Picnic",
    "Garage Workshop",

    "Banana Slip",
    "Pizza Thief",
    "Pool Shark",
    "Robot Chef",
    "Cat Restaurant",
    "Zombie Picnic",
    "Ghost House",
    "Treasure Room",
    "Lab Explosion",
    "Carnival Night",

    "Grocery Store",
    "Coffee Shop",
    "Skate Park",
    "Music Studio",
    "Basketball Court",
    "Playground",
    "Library",
    "Museum",
    "Airport",
    "Hotel Lobby",

    "Snowman",
    "Treehouse Village",
    "Camping Site",
    "Waterfall",
    "Volcano Island",
    "Bridge Crossing",
    "Fishing Boat",
    "Lighthouse",
    "Mountain Cabin",
    "Theme Park"
];
const PORT = process.env.PORT || 3000;
const io = require('socket.io')(PORT, {
    cors: {
        origin: "http://127.0.0.1:5500"
    }
})
const rooms = {}
// let currentTurnId = 0;
// let turnOrder = [];
// const users = {}
// let votes = {}
// let startVoteRequests = new Set();
// let gameState = 'drawing';
// let gameStarted = false;
// let numbOfSpec = 0;
// let allowedNumbOfSpec = 1;

io.on("connection", socket => {
    socket.on('start-game', () => {
        const room = rooms[socket.roomCode];

        if (!room) return;
        if (!room.users[socket.id]) return;
        if (room.users[socket.id]['name'] == "host") {
            room.code = socket.roomCode;
            room.word = words[Math.floor(Math.random() * words.length)]
            room.gameStarted = true;
            room.turnOrder = Object.keys(room.users);
            room.currentTurnId = 0;
            room.turnTime = 20;
            room.timeLeft = 20;
            room.timer = null;

            const currentId =
                room.turnOrder[room.currentTurnId];

            const currentUser =
                room.users[currentId];

            io.to(room.code).emit(
                'turn-transition',
                currentUser.name
            );

            setTimeout(() => {

                io.to(room.code).emit(
                    'turn-start',
                    currentId
                );

                startTurn(room);

            }, 3000);
            console.log(room.users[socket.id])
            console.log('game started')
            room.gameState = 'drawing';
            const userArr = Object.values(room.users)
            userArr.forEach(el => {
                el.status = 'artist'
            })
            const imposter = userArr[Math.floor(Math.random() * userArr.length)]
            imposter.status = 'imposter';
            console.log(imposter.name)
            for (const id in room.users) {
                const user = room.users[id];
                io.to(id).emit("role", user.status);
                if (user.status == 'artist') {
                    io.to(id).emit("word", room.word)
                } else {
                    io.to(id).emit("word", 'Imposter')
                }

            }
        }
    })
    function startTurn(room) {
        if (room.timer) {
            clearInterval(room.timer)
        }
        room.timeLeft = room.turnTime;
        io.to(room.code).emit('timer', room.timeLeft);
        room.timer = setInterval(() => {
            room.timeLeft--;
            io.to(room.code).emit('timer', room.timeLeft)
            if (room.timeLeft <= 0) {

                clearInterval(room.timer);
                nextTurn(room);
            }
        }, 1000)

    }
    function nextTurn(room) {
        room.currentTurnId++;
        if (room.currentTurnId >= room.turnOrder.length) {
            room.currentTurnId = 0;
        }
        io.to(room.code).emit(
            "turn",
            room.turnOrder[room.currentTurnId]
        );

        const currentId =
            room.turnOrder[room.currentTurnId];

        const currentUser =
            room.users[currentId];

        io.to(room.code).emit(
            'turn-transition',
            currentUser.name
        );

        setTimeout(() => {

            io.to(room.code).emit(
                'turn-start',
                currentId
            );

            startTurn(room);

        }, 2000);

    }
    socket.on('request-start-vote', () => {
        const room = rooms[socket.roomCode];

        if (!room) return;
        const user = room.users[socket.id];
        if (!user) return;
        if (room.users[socket.id].status === 'spectator') return;
        room.startVoteRequests.add(socket.id)
        const totalPlayers = room.turnOrder.length;
        if (!room.users[socket.id]) return
        if (room.startVoteRequests.size > totalPlayers / 2) {
            console.log('vote has started');
            io.to(socket.roomCode).emit("start-vote", room.turnOrder, room.users);

            room.gameState = 'voting';
            if (room.timer) {
                clearInterval(room.timer);
            }
            room.startVoteRequests.clear();
            room.votes = {};
        }

    })
    socket.on('cast-vote', (id) => {
        const room = rooms[socket.roomCode];

        if (!room) return;
        if (id === socket.id) return;
        if (!room.users[socket.id]) return;
        if (room.users[socket.id].status === 'spectator') return;
        room.votes[socket.id] = id;
        console.log(room.votes)
        const activePlayers =
            Object.values(room.users).filter(
                user => user.status !== 'spectator'
            ).length;
        if (Object.keys(room.votes).length === activePlayers) {
            io.to(socket.roomCode).emit('vote-over')
            const frequencyMap = {};
            Object.values(room.votes).forEach(votedId => { frequencyMap[votedId] = (frequencyMap[votedId] || 0) + 1 })
            let highestVotes = 0;
            let finalUserId = null;
            for (const id in frequencyMap) {
                if (frequencyMap[id] > highestVotes) {
                    highestVotes = frequencyMap[id];
                    finalUserId = id;
                }
            }
            const tiedPlayers = [];
            for (const id in frequencyMap) {
                if (frequencyMap[id] === highestVotes) {
                    tiedPlayers.push(id)
                }
            }
            if (tiedPlayers.length > 1) {
                console.log('Vote has ended in a draw')
                io.to(socket.roomCode).emit('vote-draw')
                room.gameState = "drawing";
                return;
            }
            if (finalUserId && room.users[finalUserId]) {
                const votedUser = room.users[finalUserId];

                if (votedUser.status !== 'imposter') {
                    votedUser.status = 'spectator';
                    room.numbOfSpec++;
                    if (room.numbOfSpec > room.allowedNumbOfSpec) {
                        console.log(votedUser.name, 'was the Imposter! Imposter wins!');
                        io.to(socket.roomCode).emit('game-over', { winner: 'Imposter' });
                        room.gameStarted = false;
                        return;
                    }

                    console.log(votedUser.name, 'is now a spectator');
                    const index = room.turnOrder.indexOf(finalUserId);
                    if (index !== -1) {
                        room.turnOrder.splice(index, 1);
                        if (index < room.currentTurnId) room.currentTurnId--;
                        if (room.currentTurnId >= room.turnOrder.length) room.currentTurnId = 0;
                    }

                } else {
                    console.log(votedUser.name, 'was the Imposter! artists win!');
                    io.to(socket.roomCode).emit('game-over', { winner: 'artists' });
                    room.gameStarted = false;
                }
            }
            room.votes = {};
            room.gameState = 'drawing';
        }

    })
    // socket.on('turnover', () => {
    //     const room = rooms[socket.roomCode];

    //     if (!room) return;
    //     console.log('passed !room condition')
    //     if (room.gameState == 'drawing') {
    //         console.log(room.currentTurnId)
    //         if (room.turnOrder.length === 0) {
    //             console.log('ran room.turn.length === 0 and returned')
    //             return;
    //         }

    //         room.currentTurnId++;
    //         console.log(room.currentTurnId)
    //         console.log(room.turnOrder, room.turnOrder.length)
    //         if (room.currentTurnId == room.turnOrder.length) {
    //             room.currentTurnId = 0;
    //         }
    //         console.log(room.currentTurnId)
    //         io.to(socket.roomCode).emit("turn", room.turnOrder[room.currentTurnId]);
    //     }

    // })
    socket.on('draw', data => {
        const room = rooms[socket.roomCode];

        if (!room) return;
        if (socket.id !== room.turnOrder[room.currentTurnId]) return;
        if (room.gameState !== 'drawing') return;

        socket.broadcast.to(socket.roomCode).emit('draw-data', data)
        socket.broadcast.to(socket.roomCode).emit('drawing-user', room.users[room.turnOrder[room.currentTurnId]]['name'])
    })
    socket.on('clear', () => {
        socket.broadcast.to(socket.roomCode).emit('clear')
    })

    socket.on('join-room', ({ roomCode, name }) => {
        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                currentTurnId: 0,
                turnOrder: [],
                users: {},
                votes: {},
                startVoteRequests: new Set(),
                gameState: 'lobby',
                gameStarted: false,
                numbOfSpec: 0,
                allowedNumbOfSpec: 1,

            }
        }
        socket.join(roomCode)
        socket.roomCode = roomCode

        rooms[roomCode].users[socket.id] = {
            name: name,
            status: 'normal'
        };
        io.to(roomCode).emit("playerList", rooms[roomCode].users)
    })
    // socket.on('new-user', name => {
    //     if (gameStarted) return;
    //     users[socket.id] = { name: name };
    //     for (const id in users) {
    //         io.emit('playerList', users)
    //     }

    //     socket.broadcast.emit('user-connected', name)
    // })
    socket.on('send-chat-message', (message) => {
        const room = rooms[socket.roomCode];

        if (!room) return;
        socket.broadcast.to(socket.roomCode).emit('chat-message', { message: message, name: room.users[socket.id]['name'] })
    })
    socket.on("disconnect", () => {
        const room = rooms[socket.roomCode];

        if (!room) return;

        const user = room.users[socket.id];

        if (!user) return; // important safety check
        // notify others
        socket.broadcast.to(socket.roomCode).emit("user-disconnected", user.name);

        // remove from users
        delete room.users[socket.id];
        if (Object.keys(room.users).length === 0) {
            delete rooms[socket.roomCode];
        }
        const index = room.turnOrder.indexOf(socket.id);
        if (index !== -1) {
            room.turnOrder.splice(index, 1);

            if (index < room.currentTurnId) room.currentTurnId--;
            if (room.currentTurnId >= room.turnOrder.length) room.currentTurnId = 0;
        }

        delete room.votes[socket.id];
        io.to(socket.roomCode).emit('user-removed', room.users)

    })
})