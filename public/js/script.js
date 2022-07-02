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

myPeer.on('call', (call) => {
	logActivity('call received');

	call.answer(myVideoStream);
	const video = document.createElement('video');
	video.setAttribute('playsinline', true);

	call.on('stream', (remoteStream) => {
		logActivity('stream received');
		if (!document.getElementById(`video-${call.peer}`)) {
			addVideoStream(video, remoteStream, call.peer);
		}
	});
	// myStream({ video: true, audio: true }, (stream) => {
	// 	call.answer(stream);
	// 	const video = document.createElement('video');
	// 	video.setAttribute('playsinline', true);

	// 	call.on('stream', (remoteStream) => {
	// 		addVideoStream(video, remoteStream, call.peer);
	// 	});
	// }),
	// 	(err) => {
	// 		console.log('failed to get local stream', err);
	// 	};
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

	// const getUserMedia =
	// 	navigator.getUserMedia ||
	// 	navigator.webkitGetUserMedia ||
	// 	navigator.mozGetUserMedia;
	// getUserMedia(
	// 	{
	// 		video: true,
	// 		audio: true,
	// 	},
	// 	(stream) => {
	// 		logActivity(`calling ${userId} with my stream`);
	// 		const call = myPeer.call(userId, stream);
	// 		const video = document.createElement('video');
	// 		video.setAttribute('playsinline', true);
	// 		call.on('stream', (theirStream) => {
	// 			// addVideoStream(video, theirStream);
	// 			addVideoStream(video, theirStream, userId);
	// 		});
	// 		call.on('close', () => {
	// 			logActivity('call closed');
	// 			video.remove();
	// 		});
	// 	},
	// 	(err) => {
	// 		console.log('failed to get local stream', err);
	// 	}
	// );
};
