const socket = io('/');
const videoGrid = document.getElementById('video-grid');

const myPeer = new Peer(undefined);

let myUserId;

const myVideo = document.createElement('video');
myVideo.muted = true;

const myStream =
	navigator.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia;

myPeer.on('call', (call) => {
	myStream({ video: true, audio: true }, (stream) => {
		call.answer(stream);
		const video = document.createElement('video');
		call.on('stream', (remoteStream) => {
			addVideoStream(video, remoteStream, call.peer);
		});
	}),
		(err) => {
			console.log('failed to get local stream', err);
		};
});

navigator.mediaDevices
	.getUserMedia({
		video: true,
		audio: true,
	})
	.then((stream) => {
		addVideoStream(myVideo, stream, myUserId);
		myPeer.on('call', (call) => {
			call.answer(stream);
			const video = document.createElement('video');
			call.on('stream', (userVideoStream) => {
				addVideoStream(video, userVideoStream, call.peer);
			});
		});
		socket.on('user-connected', (userId) => {
			connectToNewUser(userId, stream);
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
	console.log(`user ${data.userId} disconnected`);
	const v = document.getElementById(`video-${data.userId}`);
	if (v) {
		v.remove();
	}
});

const addVideoStream = (video, stream, id) => {
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	video.setAttribute('id', `video-${id}`);
	videoGrid.appendChild(video);
};

const connectToNewUser = (userId, stream) => {
	const getUserMedia =
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia;

	getUserMedia(
		{
			video: true,
			audio: true,
		},
		(stream) => {
			const call = myPeer.call(userId, stream);
			const video = document.createElement('video');
			call.on('stream', (theirStream) => {
				// addVideoStream(video, theirStream);
				addVideoStream(video, theirStream, userId);
			});
			call.on('close', () => {
				console.log('call closed');
				video.remove();
			});
		},
		(err) => {
			console.log('failed to get local stream', err);
		}
	);
};
