const socket = io('http://localhost:3000')
const canvas = document.getElementById("board");
const colorPicker = document.querySelector('.colorSelector');
const clearBtn = document.querySelector('.clearCanvas');
let myTurn = false;
let gameState = 'drawing';
const playerTab = document.querySelector('.player-tab')

const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const messageContainer = document.getElementById('message-container')
const name = prompt('What is your name?')
appendMessage(`You joined`)
socket.emit('new-user', name)
socket.on('chat-message', (data) => {
    appendMessage(`${data.name}:${data.message}`)
})
socket.on('user-connected', name => {
    appendMessage(`${name} joined.`)
})
messageForm.addEventListener('submit', e => {
    e.preventDefault()
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

socket.on('turn', (turnId) => {
    console.log(myTurn)
    myTurn = (turnId === socket.id);
})
function appendMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.innerText = message;
    messageContainer.append(messageElement);

}
clearBtn.addEventListener('click', (e) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear')
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

socket.on('start-vote', (users) => {
    gameState = 'voting';
    const voteContainer = document.createElement('div');
    voteContainer.id = 'vote-container';
    Object.keys(users).forEach(id => {
        const btn = document.createElement('button');
        btn.innerText = `Vote for ${users[id].name}`;
        btn.onclick = () => socket.emit('cast-vote', id);
        voteContainer.append(btn);
    });
    document.body.append(voteContainer);
})
socket.on('vote-over', () => {
    const oldContainer = document.getElementById('vote-container');
    if (oldContainer) oldContainer.remove();
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
        player.innerText = players[id].name || 'random'
        playerTab.append(player)
    })
})

canvas.addEventListener("mousedown", (e) => {
    if (gameState == 'drawing') {
        drawing = true;
        lastX = e.offsetX;
        lastY = e.offsetY;
    }
});

canvas.addEventListener("mouseup", () => {
    if (myTurn && drawing) {
        console.log('som', drawing)
        socket.emit('turnover')
    }
    drawing = false;

});

canvas.addEventListener("mousemove", (e) => {
    if (!drawing || !myTurn || gameState != 'drawing') return;

    const x = e.offsetX;
    const y = e.offsetY;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    socket.emit('draw', { x, y, lastX, lastY, color })
    lastX = x;
    lastY = y;
});