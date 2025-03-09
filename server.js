const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Danh sách người dùng đang chờ theo vị trí
const waitingUsers = {
    'Miền Nam': [],
    'Miền Trung': [],
    'Miền Bắc': []
};
let rooms = new Map();

io.on('connection', (socket) => {
    console.log('Người dùng đã kết nối:', socket.id);

    socket.on('find-stranger', (data) => {
        const { location } = data;
        if (waitingUsers[location].length > 0) {
            const partner = waitingUsers[location].pop();
            const roomId = `${socket.id}-${partner.id}`;
            
            socket.join(roomId);
            partner.join(roomId);
            
            rooms.set(socket.id, roomId);
            rooms.set(partner.id, roomId);
            
            io.to(roomId).emit('chat-start', { message: `Đã kết nối với người lạ ở ${location}!` });
        } else {
            waitingUsers[location].push(socket);
            socket.emit('waiting', { message: `Đang tìm người lạ ở ${location}...` });
        }
    });

    socket.on('message', (data) => {
        const roomId = rooms.get(socket.id);
        if (roomId) {
            io.to(roomId).emit('message', { 
                id: socket.id,
                message: data.message 
            });
        }
    });

    socket.on('disconnect-request', () => {
        const roomId = rooms.get(socket.id);
        if (roomId) {
            const partnerId = Array.from(rooms.entries())
                .find(([_, r]) => r === roomId && _ !== socket.id)?.[0];
            if (partnerId) {
                io.to(partnerId).emit('chat-end', { message: 'Người lạ đã ngắt kết nối!' });
                socket.leave(roomId);
                rooms.delete(socket.id);
                io.to(partnerId).emit('chat-end-complete', { message: 'Bạn có thể tìm người mới.' });
            }
        }
    });

    socket.on('report', (data) => {
        console.log(`Báo cáo từ người dùng ${data.userId}: ${data.message}`);
    });

    socket.on('disconnect', () => {
        const roomId = rooms.get(socket.id);
        if (roomId) {
            io.to(roomId).emit('chat-end', { message: 'Người lạ đã rời khỏi!' });
            const partnerId = Array.from(rooms.entries())
                .find(([_, r]) => r === roomId && _ !== socket.id)?.[0];
            if (partnerId) {
                rooms.delete(partnerId);
            }
            rooms.delete(socket.id);
        }
        // Xóa khỏi danh sách chờ của tất cả vị trí
        Object.keys(waitingUsers).forEach(location => {
            waitingUsers[location] = waitingUsers[location].filter(user => user.id !== socket.id);
        });
        console.log('Người dùng đã ngắt kết nối:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy trên port ${PORT}`);
});