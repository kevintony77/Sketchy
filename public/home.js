function generateRoomCode() {
    return Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
}

document.getElementById('create-room').addEventListener('click', ()=>{
    const name =
        document.getElementById("name-input").value;

    if (!name) return;

    localStorage.setItem("name", name);
    const roomCode = generateRoomCode();
    window.location.href = `index.html?code=${roomCode}`;
})

document.getElementById('join-room').addEventListener('click', ()=>{
    const name = document.getElementById('name-input').value;
    const roomCode = document.getElementById('room-input').value.toUpperCase();
    if(!name || !roomCode) return;
    localStorage.setItem("name",name)
    window.location.href = `index.html?code=${roomCode}`;
})