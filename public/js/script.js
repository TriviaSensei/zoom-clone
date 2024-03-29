const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const log = document.getElementById('activity-log');

const myPeer = new Peer(undefined);
let myUserId;
let videos = [];

const logActivity = (msg) => {
	const line = document.createElement('li');
	line.innerHTML = msg;
	log.appendChild(line);
};

const myVideo = document.createElement('video');
myVideo.setAttribute('playsinline', true);
myVideo.muted = true;

const myStream =
	navigator.mediaDevices ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia;
let myVideoStream;

myStream
	.getUserMedia({
		video: true,
		audio: true,
	})
	.then((stream) => {
		myVideoStream = stream;
		addVideoStream(myVideo, stream, myUserId);
		logActivity('adding my own stream');
	});

myPeer.on('open', (userId) => {
	myUserId = userId;
	document.getElementById('user-id').innerHTML = userId;

	socket.emit('join-room', {
		roomId,
		userId,
	});
});

myPeer.on('call', (call) => {
	logActivity('call received');
	call.answer(myVideoStream);
	const video = document.createElement('video');
	video.setAttribute('playsinline', true);

	call.on('stream', (userVideoStream) => {
		logActivity('stream received');
		addVideoStream(video, userVideoStream, call.peer);
	});
});
socket.on('user-connected', (userId) => {
	connectToNewUser(userId, myVideoStream);
});

socket.on('user-connected', (userId) => {
	logActivity(`user connected ${userId}`);
});

socket.on('user-disconnected', (data) => {
	logActivity(`user ${data.userId} disconnected`);
	console.log(data.userId);
	const v = document.getElementById(`video-${data.userId}`);
	if (v) {
		videos = videos.filter((v) => {
			return v !== data.userId;
		});
		logActivity(`removing video ${data.userId}`);
		v.remove();
	}
});

const addVideoStream = (video, stream, id) => {
	if (videos.includes(id)) {
		return;
	}
	videos.push(id);
	const videoId = id || 'me';
	logActivity(`adding video ${id === undefined ? '(me)' : id}`);
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	video.setAttribute('id', `video-${videoId}`);
	videoGrid.appendChild(video);
};

const connectToNewUser = (userId, stream) => {
	logActivity(`calling ${userId} with my stream`);
	const call = myPeer.call(userId, myVideoStream);
	const video = document.createElement('video');
	video.setAttribute('playsinline', true);
	call.on('stream', (theirStream) => {
		logActivity('their stream received');
		// addVideoStream(video, theirStream);
		addVideoStream(video, theirStream, userId);
	});
	call.on('close', () => {
		logActivity('call closed');
		video.remove();
	});
};
