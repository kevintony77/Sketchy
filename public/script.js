const socket = io()
const canvas = document.getElementById("board");
canvas.width = 700;
canvas.height = 560;
const colorPicker = document.querySelector('.colorSelector');
const clearBtn = document.querySelector('.clearCanvas');
let myTurn = false;
let gameState = 'drawing';
const playerTab = document.querySelector('.player-tab')
const overlay =
    document.getElementById('turn-overlay');

const overlayText =
    document.getElementById('turn-text');

const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const messageContainer = document.getElementById('message-container');
const wordDisplay = document.querySelector('.word-display')

const togglePlayersBtn =
    document.getElementById('toggle-players');

togglePlayersBtn.addEventListener('click', () => {

    playerTab.classList.toggle('open');

});
const params = new URLSearchParams(window.location.search)
const roomCode = params.get("code")
const name = localStorage.getItem('name') || 'SketchyFan'
const voteModal =
    document.getElementById('vote-modal');

const voteOptions =
    document.getElementById('vote-options');

function openVoteModal(turnOrder, users) {

    voteOptions.innerHTML = '';

    turnOrder.forEach(id => {

        const btn =
            document.createElement('button');

        btn.innerText =
            users[id].name;

        btn.onclick = () => {

            socket.emit('cast-vote', id);
            if (id != socket.id) {
                closeVoteModal();
            }
        };

        voteOptions.append(btn);
    });

    voteModal.style.display = 'flex';
}

function closeVoteModal() {
    voteModal.style.display = 'none';
}
appendMessage(`You joined`)



socket.emit('join-room', { roomCode, name })
socket.on('chat-message', (data) => {
    appendMessage(`${data.name}:${data.message}`)
    messageContainer.scrollTop = messageContainer.scrollHeight;
})
socket.on('user-connected', name => {
    appendMessage(`${name} joined.`)
})
messageForm.addEventListener('submit', e => {
    e.preventDefault();
    const message = messageInput.value;
    appendMessage(`You: ${message}`)
    socket.emit('send-chat-message', message)
    messageInput.value = '';
})
socket.on('user-disconnected', (name) => {
    appendMessage(`${name} disconnected`)
})

socket.on('role', role => {
    console.log(role)
})
socket.on('word', word => {
    wordDisplay.innerText = word;
})
socket.on('turn-transition', (name) => {

    overlay.style.display = 'flex';

    overlayText.innerText =
        `Next Turn: ${name}`;

});

socket.on('turn-start', (turnId) => {

    overlay.style.display = 'none';

    myTurn = (turnId === socket.id);

});
function appendMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.innerText = message;
    messageContainer.append(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;

}
socket.on("timer", (time) => {
    document.querySelector(".timer").innerText = time;
});
socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})
socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})
colorPicker.addEventListener('input', (e) => {
    color = colorPicker.value;
    ctx.strokeStyle = color;
})

const ctx = canvas.getContext("2d");

ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "black";
let color = ctx.strokeStyle;
let drawing = false;

let lastX = 0;
let lastY = 0;
socket.on('draw-data', data => {
    console.log(data)
    ctx.beginPath();
    ctx.strokeStyle = data.color;

    ctx.moveTo(data.lastX, data.lastY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
    colorPicker.value = data.color;
})
socket.on('drawing-user', (user) => {
    console.log('Current user is:', user)
})

socket.on('start-vote', (turnOrder, users) => {

    gameState = 'voting';
    openVoteModal(turnOrder, users);
})
socket.on('vote-over', () => {
    closeVoteModal();
    gameState = 'drawing';
})

socket.on('playerList', players => {
    playerTab.innerHTML = '';
    Object.keys(players).forEach(id => {
        const player = document.createElement('div')
        player.innerText = players[id].name || 'SketchyFan'
        playerTab.append(player)
    })
})
socket.on('user-removed', players => {
    playerTab.innerHTML = '';
    Object.keys(players).forEach(id => {
        const player = document.createElement('div')
        player.innerText = players[id].name || 'SketchyFan'
        playerTab.append(player)
    })
})
function getScaledPos(e) {

    const scaleX =
        canvas.width / canvas.offsetWidth;

    const scaleY =
        canvas.height / canvas.offsetHeight;

    return {
        x: e.offsetX * scaleX,
        y: e.offsetY * scaleY
    };
}
canvas.addEventListener("mousedown", (e) => {
    if (gameState == 'drawing') {
        drawing = true;
        const pos = getScaledPos(e);

        lastX = pos.x;
        lastY = pos.y;
    }
});

canvas.addEventListener("mouseup", () => {
    drawing = false;
});

canvas.addEventListener("mousemove", (e) => {
    if (!drawing || !myTurn || gameState != 'drawing') return;

    const pos = getScaledPos(e);

    const x = pos.x;
    const y = pos.y;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    socket.emit('draw', { x, y, lastX, lastY, color })
    lastX = x;
    lastY = y;
});