const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const log = document.getElementById('activity-log');

const myPeer = new Peer(undefined);
let myUserId;

const logActivity = (msg) => {
	const line = document.createElement('li');
	line.innerHTML = msg;
	log.appendChild(line);
};

const myVideo = document.createElement('video');
myVideo.setAttribute('playsinline', true);
myVideo.muted = true;

const myStream =
	navigator.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia;

myPeer.on('call', (call) => {
	logActivity('call received');
	setTimeout(() => {
		myStream({ video: true, audio: true }, (stream) => {
			call.answer(stream);
			const video = document.createElement('video');
			video.setAttribute('playsinline', true);

			call.on('stream', (remoteStream) => {
				addVideoStream(video, remoteStream, call.peer);
			});
		}),
			(err) => {
				console.log('failed to get local stream', err);
			};
	}, 1000);
});

navigator.mediaDevices
	.getUserMedia({
		video: true,
		audio: true,
	})
	.then((stream) => {
		addVideoStream(myVideo, stream, myUserId);
		logActivity('adding my own stream');
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

myPeer.on('open', (userId) => {
	myUserId = userId;
	document.getElementById('user-id').innerHTML = userId;
	socket.emit('join-room', {
		roomId,
		userId,
	});
});

socket.on('user-connected', (userId) => {
	logActivity(`user connected ${userId}`);
});

socket.on('user-disconnected', (data) => {
	logActivity(`user ${data.userId} disconnected`);
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
			logActivity(`calling ${userId} with my stream`);
			const call = myPeer.call(userId, stream);
			const video = document.createElement('video');
			video.setAttribute('playsinline', true);
			call.on('stream', (theirStream) => {
				// addVideoStream(video, theirStream);
				addVideoStream(video, theirStream, userId);
			});
			call.on('close', () => {
				logActivity('call closed');
				video.remove();
			});
		},
		(err) => {
			console.log('failed to get local stream', err);
		}
	);
};
