const socket = io();

const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const startBtn = document.getElementById('start-btn');
const status = document.getElementById('status');
const emojiBtn = document.getElementById('emoji-btn');
const mediaBtn = document.getElementById('media-btn');
const emojiPanel = document.getElementById('emoji-panel');
const gifPanel = document.getElementById('gif-panel');
const gifSearch = document.getElementById('gif-search');
const gifResults = document.getElementById('gif-results');
const exitBtn = document.createElement('button');
const reportBtn = document.getElementById('report-btn');
const reportForm = document.getElementById('report-form');
const reportContent = document.getElementById('report-content');
const submitReport = document.getElementById('submit-report');
const cancelReport = document.getElementById('cancel-report');
const locationForm = document.getElementById('location-form');
const locationSelect = document.getElementById('location-select');
const confirmLocation = document.getElementById('confirm-location');
const cancelLocation = document.getElementById('cancel-location');
const confirmExit = document.getElementById('confirm-exit');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');
const mediaPopup = document.getElementById('media-popup');
const gifOption = document.getElementById('gif-option');
const uploadButton = document.getElementById('upload-button');
const dropZone = document.getElementById('drop-zone');
const imageUpload = document.getElementById('image-upload');

// Khởi tạo các âm thanh
const searchingSound = new Audio('/searching.mp3');
const connectedSound = new Audio('/connected.mp3');
const disconnectedSound = new Audio('/disconnected.mp3');
const sentSound = new Audio('/sent.mp3');
const receivedSound = new Audio('/received.mp3');

// Hàm dừng tất cả âm thanh
function stopAllSounds() {
    searchingSound.pause();
    searchingSound.currentTime = 0;
    connectedSound.pause();
    connectedSound.currentTime = 0;
    disconnectedSound.pause();
    disconnectedSound.currentTime = 0;
    sentSound.pause();
    sentSound.currentTime = 0;
    receivedSound.pause();
    receivedSound.currentTime = 0;
}

// Hàm phát âm thanh với debug
function playSound(sound) {
    stopAllSounds();
    sound.play().catch(error => {
        console.log('Lỗi phát âm thanh:', error);
    });
}

// Danh sách emoji cơ bản
const emojis = ['😊', '😂', '😍', '😢', '😡', '👍', '👎', '❤️', '🎉', '🙌'];

// Thêm emoji vào bảng
emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.style.cursor = 'pointer';
    span.style.fontSize = '24px';
    span.style.margin = '5px';
    span.addEventListener('click', () => {
        messageInput.value += emoji;
        emojiPanel.classList.add('hidden');
    });
    emojiPanel.appendChild(span);
});

// Thêm nút Thoát vào giao diện
exitBtn.id = 'exit-btn';
exitBtn.textContent = 'Thoát';
exitBtn.addEventListener('click', () => {
    confirmExit.classList.remove('hidden');
});
document.querySelector('.chat-input').appendChild(exitBtn);
exitBtn.style.display = 'none';

// Sự kiện nút Bắt đầu
startBtn.addEventListener('click', () => {
    locationForm.classList.remove('hidden');
});

// Sự kiện nút Xác nhận vị trí
confirmLocation.addEventListener('click', () => {
    const selectedLocation = locationSelect.value;
    socket.emit('find-stranger', { location: selectedLocation });
    locationForm.classList.add('hidden');
    startBtn.disabled = true;
    status.textContent = `Đang tìm người lạ ở ${selectedLocation}...`;
    playSound(searchingSound);
});

// Sự kiện nút Hủy chọn vị trí
cancelLocation.addEventListener('click', () => {
    locationForm.classList.add('hidden');
    stopAllSounds();
});

// Sự kiện nút Gửi
sendBtn.addEventListener('click', sendMessage);

// Sự kiện phím Enter/Shift+Enter
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        messageInput.value = messageInput.value.substring(0, start) + '\n' + messageInput.value.substring(end);
        messageInput.selectionStart = messageInput.selectionEnd = start + 1;
    }
});

// Sửa paste để giữ định dạng xuống hàng
messageInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const start = messageInput.selectionStart;
    const end = messageInput.selectionEnd;
    messageInput.value = messageInput.value.substring(0, start) + pasteData + messageInput.value.substring(end);
    messageInput.selectionStart = messageInput.selectionEnd = start + pasteData.length;
});

// Sự kiện nút Emoji
emojiBtn.addEventListener('click', () => {
    emojiPanel.classList.toggle('hidden');
    mediaPopup.classList.remove('show'); // Ẩn media khi mở emoji
    gifPanel.classList.add('hidden');
});

// Sự kiện nút Media
mediaBtn.addEventListener('click', () => {
    mediaPopup.classList.toggle('show'); // Sử dụng class 'show' để hiển thị
    if (mediaPopup.classList.contains('show')) {
        gifOption.classList.remove('hidden');
        uploadButton.classList.remove('hidden');
        imageOptions.classList.remove('hidden');
        dropZone.classList.add('show'); // Hiển thị drop-zone
    } else {
        gifOption.classList.add('hidden');
        uploadButton.classList.add('hidden');
        imageOptions.classList.add('hidden');
        dropZone.classList.remove('show'); // Ẩn drop-zone
    }
    emojiPanel.classList.add('hidden');
    gifPanel.classList.add('hidden');
});

// Sự kiện nút GIF trong popup
gifOption.addEventListener('click', () => {
    gifPanel.classList.toggle('hidden');
    mediaPopup.classList.remove('show'); // Ẩn popup sau khi chọn GIF
    gifOption.classList.add('hidden');
    uploadButton.classList.add('hidden');
    imageOptions.classList.add('hidden');
    dropZone.classList.remove('show'); // Ẩn drop-zone
});

// Tìm GIF từ Tenor
gifSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = gifSearch.value.trim();
        if (query) fetchGifs(query);
    }
});

// Lấy GIF từ Tenor API
async function fetchGifs(query) {
    const apiKey = 'AIzaSyCQ0bQv6mIEeK-dPyUxu-c56OGYZex61F0'; // Thay bằng API key của bạn
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=10`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        gifResults.innerHTML = '';
        data.results.forEach(gif => {
            const img = document.createElement('img');
            img.src = gif.media_formats.gif.url;
            img.addEventListener('click', () => {
                socket.emit('message', { message: gif.media_formats.gif.url });
                gifPanel.classList.add('hidden');
                mediaPopup.classList.remove('show'); // Ẩn popup
                gifOption.classList.add('hidden');
                uploadButton.classList.add('hidden');
                imageOptions.classList.add('hidden');
                dropZone.classList.remove('show'); // Ẩn drop-zone
                playSound(sentSound);
            });
            gifResults.appendChild(img);
        });
    } catch (error) {
        console.error('Lỗi khi lấy GIF:', error);
        alert('Không thể tải GIF, vui lòng thử lại sau!');
    }
}

// Sự kiện nút Chọn file
uploadButton.addEventListener('click', () => {
    imageUpload.click(); // Kích hoạt chọn file
    mediaPopup.classList.remove('show'); // Ẩn popup sau khi chọn
    gifOption.classList.add('hidden');
    uploadButton.classList.add('hidden');
    imageOptions.classList.add('hidden');
    dropZone.classList.remove('show'); // Ẩn drop-zone
});

// Xử lý upload hình ảnh
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageDataUrl = event.target.result;
            socket.emit('message', { message: imageDataUrl });
            playSound(sentSound);
            imageUpload.value = ''; // Reset input
        };
        reader.readAsDataURL(file);
    } else {
        alert('Vui lòng chọn một file hình ảnh!');
    }
});

// Xử lý kéo thả hình ảnh
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageDataUrl = event.target.result;
            socket.emit('message', { message: imageDataUrl });
            playSound(sentSound);
            dropZone.classList.remove('show'); // Ẩn drop-zone
            mediaPopup.classList.remove('show'); // Ẩn popup
            gifOption.classList.add('hidden');
            uploadButton.classList.add('hidden');
            imageOptions.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        alert('Vui lòng kéo thả một file hình ảnh!');
    }
});

dropZone.addEventListener('click', (e) => {
    e.preventDefault(); // Ngăn click mở file input ngay
    // Không làm gì khi nhấp vào drop-zone, chỉ giữ cho kéo thả
});

// Sự kiện nút Báo cáo
reportBtn.addEventListener('click', () => {
    reportForm.classList.remove('hidden');
});

submitReport.addEventListener('click', () => {
    const content = reportContent.value.trim();
    if (content) {
        socket.emit('report', { message: content, userId: socket.id });
        reportContent.value = '';
        reportForm.classList.add('hidden');
    }
});

cancelReport.addEventListener('click', () => {
    reportContent.value = '';
    reportForm.classList.add('hidden');
});

// Sự kiện xác nhận thoát
confirmYes.addEventListener('click', () => {
    socket.emit('disconnect-request');
    status.textContent = 'Đã ngắt kết nối. Nhấn "Bắt đầu" để tìm người mới.';
    startBtn.disabled = false;
    chatBox.innerHTML = '';
    exitBtn.style.display = 'none';
    confirmExit.classList.add('hidden');
    playSound(disconnectedSound);
});

confirmNo.addEventListener('click', () => {
    confirmExit.classList.add('hidden');
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('message', { message });
        playSound(sentSound);
        messageInput.value = '';
    }
}

function addMessage(sender, message) {
    const div = document.createElement('div');
    div.innerHTML = `${sender}: ${message.replace(/\n/g, '<br>')}`;
    if (message.includes('http') && (message.includes('.gif') || message.includes('tenor.com'))) {
        const img = document.createElement('img');
        img.src = message;
        img.style.maxWidth = '100%';
        div.innerHTML = `${sender}: `;
        div.appendChild(img);
    } else if (message.startsWith('data:image/')) {
        const img = document.createElement('img');
        img.src = message;
        img.style.maxWidth = '100%';
        div.innerHTML = `${sender}: `;
        div.appendChild(img);
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Sự kiện từ server
socket.on('waiting', (data) => {
    status.textContent = data.message;
});

socket.on('chat-start', (data) => {
    status.textContent = data.message;
    chatBox.innerHTML = '';
    exitBtn.style.display = 'inline-block';
    playSound(connectedSound);
});

socket.on('message', (data) => {
    const sender = data.id === socket.id ? 'Bạn' : 'Người lạ';
    addMessage(sender, data.message);
    if (sender !== 'Bạn') {
        playSound(receivedSound);
    }
});

socket.on('chat-end', (data) => {
    status.textContent = data.message;
    startBtn.disabled = false;
    exitBtn.style.display = 'none';
    playSound(disconnectedSound);
});

socket.on('chat-end-complete', (data) => {
    status.textContent = data.message;
    startBtn.disabled = false;
    exitBtn.style.display = 'none';
    playSound(disconnectedSound);
});