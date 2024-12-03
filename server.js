const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        console.log('Received:', data);
        
        switch (data.type) {
            case 'join':
                handleJoin(ws, data.roomId, data.userId);
                break;
            case 'leave':
                handleLeave(ws, data.roomId, data.userId);
                break;
            case 'offer':
            case 'answer':
            case 'iceCandidate':
                forwardToUser(data);
                break;
        }
    });

    ws.on('close', () => {
        if (ws.roomId && ws.userId) {
            handleLeave(ws, ws.roomId, ws.userId);
        }
    });
});

function handleJoin(ws, roomId, userId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
    }
    
    const room = rooms.get(roomId);
    room.set(userId, ws);
    ws.roomId = roomId;
    ws.userId = userId;

    // Notify all users about the update
    broadcastToRoom(roomId, {
        type: 'roomUpdate',
        users: Array.from(room.keys())
    });

    // Notify others about new user
    room.forEach((client, clientId) => {
        if (clientId !== userId) {
            client.send(JSON.stringify({
                type: 'userJoined',
                userId
            }));
        }
    });
}

function handleLeave(ws, roomId, userId) {
    if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.delete(userId);
        
        if (room.size === 0) {
            rooms.delete(roomId);
        } else {
            broadcastToRoom(roomId, {
                type: 'roomUpdate',
                users: Array.from(room.keys())
            });

            room.forEach(client => {
                client.send(JSON.stringify({
                    type: 'userLeft',
                    userId
                }));
            });
        }
    }
}

function forwardToUser(data) {
    if (rooms.has(data.roomId)) {
        const room = rooms.get(data.roomId);
        const targetWs = room.get(data.targetUserId);
        if (targetWs) {
            targetWs.send(JSON.stringify(data));
        }
    }
}

function broadcastToRoom(roomId, data) {
    if (rooms.has(roomId)) {
        rooms.get(roomId).forEach(client => {
            client.send(JSON.stringify(data));
        });
    }
}

server.listen(8080, () => {
    console.log('WSS server running on 8080');
});