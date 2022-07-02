const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const log = document.getElementById('activity-log');

const myPeer = new Peer(undefined);
let myUserId;
let videos = [];

const myVideo = document.createElement('video');
myVideo.setAttribute('playsinline', true);
myVideo.muted = true;

const myStream =
	navigator.mediaDevices.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia;

let myVideoStream;

navigator.mediaDevices
	.getUserMedia({
		video: true,
		audio: true,
	})
	.then((stream) => {
		myVideoStream = stream;
		addVideoStream(myVideo, stream, myUserId);
		myPeer.on('call', (call) => {
			call.answer(stream);
			const video = document.createElement('video');
			video.setAttribute('playsinline', true);

			call.on('stream', (userVideoStream) => {
				addVideoStream(video, userVideoStream, call.peer);
			});
		});
		socket.on('user-connected', (userId) => {
			connectToNewUser(userId, stream);
		});
	});

myPeer.on('call', (call) => {
	call.answer(myVideoStream);
	const video = document.createElement('video');
	video.setAttribute('playsinline', true);

	call.on('stream', (remoteStream) => {
		if (!document.getElementById(`video-${call.peer}`)) {
			addVideoStream(video, remoteStream, call.peer);
		}
	});
});

myPeer.on('open', (userId) => {
	myUserId = userId;
	document.getElementById('user-id').innerHTML = userId;

	socket.emit('join-room', {
		roomId,
		userId,
	});
});

socket.on('user-connected', (userId) => {
	console.log(`user connected ${userId}`);
});

socket.on('user-disconnected', (data) => {
	const v = document.getElementById(`video-${data.userId}`);
	if (v) {
		videos = videos.filter((v) => {
			return v !== data.userId;
		});
		v.remove();
	}
});

const addVideoStream = (video, stream, id) => {
	if (videos.includes(id)) {
		return;
	}
	videos.push(id);
	const videoId = id || 'me';
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	video.setAttribute('id', `video-${videoId}`);
	videoGrid.appendChild(video);
};

const connectToNewUser = (userId, stream) => {
	const call = myPeer.call(userId, myVideoStream);
	const video = document.createElement('video');
	video.setAttribute('playsinline', true);
	call.on('stream', (theirStream) => {
		addVideoStream(video, theirStream, userId);
	});
	call.on('close', () => {
		video.remove();
	});
};
