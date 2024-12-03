let signalingChannel;
let localStream;
let peerConnections = new Map();
let roomId;
let userId = Math.random().toString(36).substr(2, 9);

const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const muteAudioBtn = document.getElementById('muteAudioBtn');
const muteVideoBtn = document.getElementById('muteVideoBtn');
const roomInput = document.getElementById('roomId');
const joinForm = document.getElementById('joinForm');
const roomUI = document.getElementById('roomUI');
const roomDisplay = document.getElementById('roomDisplay');
const videos = document.getElementById('videos');
const localVideo = document.getElementById('localVideo');

async function joinRoom() {
    roomId = roomInput.value.trim();
    if (!roomId) return;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: true 
        });
        localVideo.srcObject = localStream;

        signalingChannel = new WebSocket(`wss://10.2.1.53:8080`);
        setupSignaling();

        joinForm.classList.add('hidden');
        roomUI.classList.remove('hidden');
        roomDisplay.textContent = roomId;
    } catch (e) {
        console.error('Error joining room:', e);
        alert('Error accessing media devices: ' + e.message);
    }
}

function setupSignaling() {
    signalingChannel.onopen = () => {
        signalingChannel.send(JSON.stringify({
            type: 'join',
            roomId,
            userId
        }));
    };

    signalingChannel.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'userJoined':
                if (data.userId !== userId) {
                    createPeerConnection(data.userId);
                }
                break;
            case 'userLeft':
                removePeerConnection(data.userId);
                break;
            case 'offer':
                await handleOffer(data.offer, data.userId);
                break;
            case 'answer':
                await handleAnswer(data.answer, data.userId);
                break;
            case 'iceCandidate':
                await handleIceCandidate(data.candidate, data.userId);
                break;
        }
    };
}

function createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(config);
    peerConnections.set(peerId, pc);
    
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            signalingChannel.send(JSON.stringify({
                type: 'iceCandidate',
                candidate: event.candidate,
                userId,
                targetUserId: peerId,
                roomId
            }));
        }
    };

    // pc.ontrack = (event) => {
        // const container = document.createElement('div');
        // container.className = 'relative';
        // container.id = `container-${peerId}`;

        // const video = document.createElement('video');
        // video.autoplay = true;
        // video.playsInline = true;
        // video.className = 'w-full bg-black rounded';
        // video.srcObject = event.streams[0];

        // const label = document.createElement('span');
        // label.className = 'absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 rounded';
        // label.textContent = `User ${peerId.slice(0,4)}`;

        // container.appendChild(video);
        // container.appendChild(label);
        // videos.appendChild(container);
    //     createVideoElement(peerId, event.streams[0]);
    // };

    // Only add video element if it doesn't exist
    pc.ontrack = (event) => {
        if (!document.getElementById(`container-${peerId}`)) {
            createVideoElement(peerId, event.streams[0]);
        }
    };

    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
            signalingChannel.send(JSON.stringify({
                type: 'offer',
                offer: pc.localDescription,
                userId,
                targetUserId: peerId,
                roomId
            }));
        });

    return pc;
}

function removePeerConnection(peerId) {
    const pc = peerConnections.get(peerId);
    if (pc) {
        pc.close();
        peerConnections.delete(peerId);
    }
    const container = document.getElementById(`container-${peerId}`);
    if (container) container.remove();
}

async function handleOffer(offer, peerId) {
    let pc = peerConnections.get(peerId);
    if (!pc) {
        pc = new RTCPeerConnection(config);
        peerConnections.set(peerId, pc);
        
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                signalingChannel.send(JSON.stringify({
                    type: 'iceCandidate',
                    candidate: event.candidate,
                    userId,
                    targetUserId: peerId,
                    roomId
                }));
            }
        };

        // Only add video element if it doesn't exist
        pc.ontrack = (event) => {
            if (!document.getElementById(`container-${peerId}`)) {
                createVideoElement(peerId, event.streams[0]);
            }
        };
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    signalingChannel.send(JSON.stringify({
        type: 'answer',
        answer,
        userId,
        targetUserId: peerId,
        roomId
    }));
}

function createVideoElement(peerId, stream) {
    const container = document.createElement('div');
    container.className = 'relative';
    container.id = `container-${peerId}`;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.className = 'w-full bg-black rounded';
    video.srcObject = stream;

    const label = document.createElement('span');
    label.className = 'absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 rounded';
    label.textContent = `User ${peerId.slice(0,4)}`;

    container.appendChild(video);
    container.appendChild(label);
    videos.appendChild(container);
}

async function handleAnswer(answer, peerId) {
    const pc = peerConnections.get(peerId);
    if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
}

async function handleIceCandidate(candidate, peerId) {
    const pc = peerConnections.get(peerId);
    if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
}

joinBtn.addEventListener('click', joinRoom);

leaveBtn.addEventListener('click', () => {
    if (signalingChannel) {
        signalingChannel.send(JSON.stringify({
            type: 'leave',
            userId,
            roomId
        }));
    }
    
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    joinForm.classList.remove('hidden');
    roomUI.classList.add('hidden');
});

muteAudioBtn.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    muteAudioBtn.textContent = audioTrack.enabled ? '🎤' : '🔇';
});

muteVideoBtn.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    muteVideoBtn.textContent = videoTrack.enabled ? '📹' : '🎦';
});