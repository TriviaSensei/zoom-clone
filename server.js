const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

let users = [];

app.set('view engine', 'pug');
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
	res.render('room', {
		roomId: req.params.room,
	});
});

io.on('connection', (socket) => {
	socket.on('join-room', (data) => {
		const { roomId, userId } = data;

		socket.join(roomId);
		socket.to(roomId).emit('user-connected', userId);

		users.push({
			userId,
			roomId,
			socketId: socket.id,
		});
	});

	socket.on('disconnect', (reason) => {
		users = users.filter((u) => {
			if (u.socketId === socket.id) {
				socket.to(u.roomId).emit('user-disconnected', { userId: u.userId });
				return false;
			}
			return true;
		});
	});
});

server.listen(3000);
