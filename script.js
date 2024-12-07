// Chọn các phần tử DOM
const runButton = document.getElementById('runButton');
const optionSelect = document.getElementById('optionSelect');
const numPhilosophersInput = document.getElementById('numPhilosophers');
const contentBox = document.getElementById('contentBox');

// Khai báo các biến toàn cục
let philosophers = [];
let numPhilosophers = 5; // Giá trị mặc định
let maxEats = 1; // Giới hạn số lần ăn tối đa cho mỗi triết gia
let maxItems = 10; // Giới hạn số sản phẩm tối đa cho Producer-Consumer
// Biến lưu trữ các sản phẩm trong kho
let buffer = [];
let bufferMaxSize = 10; 
let producerConsumerRunning = true;
// Hàm để hiển thị kết quả
function displayResult(message) {
    contentBox.innerHTML += message + "<br>";
    contentBox.scrollTop = contentBox.scrollHeight; // Cuộn xuống cùng
}
function displayResult(message, isReader = false, isWriter = false) {
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = message;

    if (isReader) {
        messageDiv.classList.add('reader-animation');
    } else if (isWriter) {
        messageDiv.classList.add('writer-animation');
    }

    contentBox.appendChild(messageDiv);
    contentBox.scrollTop = contentBox.scrollHeight;  // Cuộn xuống cùng
}
// Hàm tạm dừng (sleep)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Khai báo Semaphore
class Semaphore {
    constructor(count) {
        this.count = count;
        this.queue = [];
    }

    async wait() {
        if (this.count <= 0) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.count--;
    }

    signal() {
        this.count++;
        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            resolve();
        }
    }
}

// Khai báo Monitor
class Monitor {
    constructor() {
        this.lock = false;
        this.queue = [];
    }

    async enter() {
        while (this.lock) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.lock = true;
    }

    leave() {
        this.lock = false;
        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            resolve();
        }
    }
}

// Triết gia 73 -> 275
const diningTable = document.getElementById('diningTable'); // Khu vực hiển thị bàn ăn
// Tạo giao diện bàn ăn với triết gia và đũa
function createPhilosophersUI(numPhilosophers) {
    const diningTable = document.getElementById('diningTable');
    diningTable.innerHTML = ""; // Reset bàn ăn
    philosophers = [];
    const angleStep = 360 / numPhilosophers;

    for (let i = 0; i < numPhilosophers; i++) {
        // Tạo phần tử triết gia
        const philosopher = document.createElement('div');
        philosopher.className = 'philosopher thinking';
        philosopher.textContent = `P${i + 1}`;
        philosopher.style.transform = `rotate(${angleStep * i}deg) translate(120px) rotate(-${angleStep * i}deg)`;
        diningTable.appendChild(philosopher);

        // Tạo phần tử hiển thị số đũa
        const chopsticksIndicator = document.createElement('div');
        chopsticksIndicator.className = 'chopsticks-indicator';
        chopsticksIndicator.textContent = '🍴'; // Hiển thị 1 đũa mặc định
        philosopher.appendChild(chopsticksIndicator);

        // Lưu triết gia và chỉ báo đũa
        philosophers.push({ element: philosopher, indicator: chopsticksIndicator });
    }
}
// Cập nhật trạng thái triết gia
function updatePhilosopherState(id, state) {
    const philosopher = philosophers[id].element;
    philosopher.className = `philosopher ${state}`;
}
// Cập nhật trạng thái đũa
function updateChopstickCount(id, count) {
    const indicator = philosophers[id].indicator;
    if (count === 2) {
        indicator.textContent = '🍴🍴'; // Hiển thị 2 đũa
    } else if (count === 1) {
        indicator.textContent = '🍴'; // Hiển thị 1 đũa
    } else {
        indicator.textContent = '💤'; // Không có đũa
    }
}
// Hàm cho Semaphore (Triết gia)
async function semaphorePhilosophers() {
    const semaphore = new Semaphore(numPhilosophers - 1); // Chỉ có thể có n-1 triết gia ngồi cùng lúc
    const chopsticks = new Array(numPhilosophers).fill(false);

    async function philosopher(id) {
        let eats = 0;

        while (eats < maxEats) {
            updatePhilosopherState(id, 'thinking'); // Đang suy nghĩ
            updateChopstickCount(id, 0); // Không có đũa
            displayResult(`Triết gia ${id + 1}: đang suy nghĩ...`);
            await sleep(5000);

            await semaphore.wait(); // Chờ đến lượt

            let left = id;
            let right = (id + 1) % numPhilosophers;

            if (id === numPhilosophers - 1) {
                [left, right] = [right, left]; // Đổi thứ tự lấy đũa
            }

            if (!chopsticks[left] && !chopsticks[right]) {
                chopsticks[left] = chopsticks[right] = true;
                updateChopstickCount(id, 2); // Có 2 đũa
                updatePhilosopherState(id, 'eating'); // Đang ăn
                displayResult(`Triết gia ${id + 1}: đang ăn...`);
                await sleep(5000);

                chopsticks[left] = chopsticks[right] = false;
                updateChopstickCount(id, 1); // Trả đũa, còn 1 đũa
                eats++;
                displayResult(`Triết gia ${id + 1}: đã ăn xong.`);
            }

            semaphore.signal(); // Giải phóng semaphore
        }

        updatePhilosopherState(id, 'done'); // Kết thúc
        updateChopstickCount(id, 0); // Không còn đũa
        displayResult(`Triết gia ${id + 1}: hoàn thành.`);
    }

    createPhilosophersUI(numPhilosophers);
    const tasks = Array.from({ length: numPhilosophers }, (_, id) => philosopher(id));
    await Promise.all(tasks);
}
// Hàm cho Monitor (Triết gia)
async function monitorPhilosophers() {
    const chopsticks = new Array(numPhilosophers).fill(false); // Trạng thái của đũa
    const monitor = new Monitor(); // Tạo đối tượng Monitor

    async function philosopher(id) {
        let eats = 0;

        while (eats < maxEats) {
            updatePhilosopherState(id, 'thinking'); // Đang suy nghĩ
            updateChopstickCount(id, 0); // Không có đũa
            displayResult(`Triết gia ${id + 1}: đang suy nghĩ...`);
            await sleep(3000); // Thời gian suy nghĩ

            await monitor.enter(); // Đợi để vào monitor

            let left = id;
            let right = (id + 1) % numPhilosophers;

            // Kiểm tra xem cả 2 chiếc đũa có sẵn không
            if (!chopsticks[left] && !chopsticks[right]) {
                chopsticks[left] = chopsticks[right] = true;
                updateChopstickCount(id, 2); // Có 2 đũa
                updatePhilosopherState(id, 'eating'); // Đang ăn
                displayResult(`Triết gia ${id + 1}: đang ăn...`);
                await sleep(3000); // Thời gian ăn

                chopsticks[left] = chopsticks[right] = false; // Trả lại đũa
                updateChopstickCount(id, 1); // Trả đũa, còn 1 đũa
                eats++;
                displayResult(`Triết gia ${id + 1}: đã ăn xong.`);
            }

            monitor.leave(); // Thoát khỏi monitor
        }

        updatePhilosopherState(id, 'done'); // Kết thúc
        updateChopstickCount(id, 0); // Không còn đũa
        displayResult(`Triết gia ${id + 1}: hoàn thành.`);
    }

    createPhilosophersUI(numPhilosophers); // Tạo giao diện
    const tasks = Array.from({ length: numPhilosophers }, (_, id) => philosopher(id)); // Mỗi triết gia là một task
    await Promise.all(tasks); // Chạy tất cả triết gia đồng thời
}
// Hàm để tạo Deadlock với Semaphore (Triết gia)
async function semaphorePhilosophersDeadlock() {
    const semaphore = new Semaphore(numPhilosophers - 1); // Chỉ có thể có n-1 triết gia ngồi cùng lúc
    const chopsticks = new Array(numPhilosophers).fill(false);

    async function philosopher(id) {
        let eats = 0;

        while (true) { // Lặp vô tận để mô phỏng deadlock
            updatePhilosopherState(id, 'thinking'); // Đang suy nghĩ
            updateChopstickCount(id, 0); // Không có đũa
            displayResult(`Triết gia ${id + 1}: đang suy nghĩ...`);
            await sleep(5000); // Thời gian suy nghĩ

            await semaphore.wait(); // Chờ đến lượt

            let left = id;
            let right = (id + 1) % numPhilosophers;

            // Đổi thứ tự lấy đũa để tránh deadlock
            if (id % 2 === 0) { // Nếu số chẵn
                [left, right] = [right, left]; // Đổi thứ tự lấy đũa
            }

            // Mỗi triết gia chỉ lấy một chiếc đũa và không bao giờ có được chiếc đũa thứ hai
            if (!chopsticks[left]) {
                chopsticks[left] = true;
                updateChopstickCount(id, 1); // Đã lấy 1 chiếc đũa
                displayResult(`Triết gia ${id + 1}: đang giữ một chiếc đũa bên trái.`);
            } else {
                // Nếu triết gia đã giữ chiếc đũa trái, thì chờ đũa bên phải mãi mà không có
                displayResult(`Triết gia ${id + 1}: đang chờ đũa bên phải (deadlock)!`);
            }

            // Nếu đã lấy được một chiếc đũa nhưng không có chiếc đũa bên phải
            // Triết gia không thể ăn và bị kẹt trong deadlock
            if (!chopsticks[right]) {
                displayResult(`Triết gia ${id + 1}: không thể ăn (deadlock) vì thiếu đũa bên phải.`);
                // Triết gia không thể ăn, tiếp tục chờ trong trạng thái deadlock
                continue; // Tiếp tục vòng lặp mà không trả đũa, giữ trong trạng thái deadlock
            }

            // Cả 2 đũa có sẵn thì triết gia ăn
            chopsticks[left] = chopsticks[right] = true;
            updateChopstickCount(id, 2); // Có 2 đũa
            updatePhilosopherState(id, 'eating'); // Đang ăn
            displayResult(`Triết gia ${id + 1}: đang ăn...`);
            await sleep(5000); // Thời gian ăn

            // Trả đũa sau khi ăn
            chopsticks[left] = chopsticks[right] = false;
            updateChopstickCount(id, 1); // Trả lại 2 đũa
            eats++;
            displayResult(`Triết gia ${id + 1}: đã ăn xong.`);

            semaphore.signal(); // Giải phóng semaphore
        }

        updatePhilosopherState(id, 'done'); // Kết thúc
        updateChopstickCount(id, 0); // Không còn đũa
        displayResult(`Triết gia ${id + 1}: hoàn thành.`);
    }

    createPhilosophersUI(numPhilosophers);
    const tasks = Array.from({ length: numPhilosophers }, (_, id) => philosopher(id));
    await Promise.all(tasks);
}


// Producer-Consumer 278 -> 360
// Producer-Consumer với Semaphore
async function semaphoreProducerConsumer() {
    const empty = new Semaphore(bufferMaxSize); // Semaphore đếm số ô trống
    const full = new Semaphore(0); // Semaphore đếm số ô có sản phẩm
    const mutex = new Semaphore(1); // Semaphore khóa truy cập vào buffer
    let producedCount = 0; // Đếm số sản phẩm đã sản xuất
    let consumedCount = 0; // Đếm số sản phẩm đã tiêu thụ

    async function producer() {
        while (producerConsumerRunning && producedCount < maxItems) {
            await empty.wait(); // Đợi có ô trống
            await mutex.wait(); // Đợi truy cập buffer

            const item = Math.floor(Math.random() * 100);
            buffer.push(item);
            producedCount++;
            displayResult(`Producer: sản xuất ${item} (Tổng số sản xuất: ${producedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);

            mutex.signal(); // Mở khóa truy cập buffer
            full.signal(); // Tăng số lượng sản phẩm
            await sleep(1500); // Thay đổi thời gian để làm nổi bật
        }
        displayResult("Producer: Đã đạt giới hạn sản phẩm.");
    }

    async function consumer() {
        while (producerConsumerRunning && consumedCount < maxItems) {
            await full.wait(); // Đợi có sản phẩm
            await mutex.wait(); // Đợi truy cập buffer

            const item = buffer.shift();
            consumedCount++;
            displayResult(`Consumer: tiêu thụ ${item} (Tổng số tiêu thụ: ${consumedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);

            mutex.signal(); // Mở khóa truy cập buffer
            empty.signal(); // Tăng số lượng ô trống
            await sleep(1000);
        }
        displayResult("Consumer: Đã đạt giới hạn sản phẩm tiêu thụ.");
    }

    producer();
    consumer();
}
// Producer-Consumer với Monitor
async function monitorProducerConsumer() {
    const monitor = new Monitor();
    let producedCount = 0; // Đếm số sản phẩm đã sản xuất
    let consumedCount = 0; // Đếm số sản phẩm đã tiêu thụ

    async function producer() {
        while (producerConsumerRunning && producedCount < maxItems) {
            await monitor.enter();
            if (buffer.length < bufferMaxSize) {
                const item = Math.floor(Math.random() * 100);
                buffer.push(item);
                producedCount++;
                displayResult(`Producer: sản xuất ${item} (Tổng số sản xuất: ${producedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);
            }
            monitor.leave();
            await sleep(1000); // Thời gian chờ cho Monitor
        }
        displayResult("Producer: Đã đạt giới hạn sản phẩm.");
    }

    async function consumer() {
        while (producerConsumerRunning && consumedCount < maxItems) {
            await monitor.enter();
            if (buffer.length > 0) {
                const item = buffer.shift();
                consumedCount++;
                displayResult(`Consumer: tiêu thụ ${item} (Tổng số tiêu thụ: ${consumedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);
            }
            monitor.leave();
            await sleep(1200); // Thay đổi thời gian chờ cho Monitor
        }
        displayResult("Consumer: Đã đạt giới hạn sản phẩm tiêu thụ.");
    }

    producer();
    consumer();
}





// Sự kiện khi nhấn nút deadlock
const deadlockButton = document.getElementById('deadlockButton');
if (deadlockButton) {
    deadlockButton.addEventListener('click', async () => {
        contentBox.innerHTML = ""; // Xóa nội dung trước khi chạy
        numPhilosophers = parseInt(numPhilosophersInput.value); // Lấy số triết gia
        await semaphorePhilosophersDeadlock();
    });
}

// Reader-Writer 376 -> 513
// async function semaphoreReaderWriter() {
//     const mutex = new Semaphore(1); // Mutex for controlling reader_count
//     const db = new Semaphore(1);    // Semaphore for controlling access to database
//     let readerCount = 0;
//     let activeWriters = 0;
//     let waitingWriters = 0;
//     let activeReaders = 0;

//     function updateStatus() {
//         displayResult(
//             `Đang ghi: ${activeWriters}, Đợi ghi: ${waitingWriters}, Đang đọc: ${activeReaders}, Đợi đọc: ${readerCount - activeReaders}`,
//             false,
//             false
//         );
//     }

//     async function reader(id) {
//         for (let i = 0; i < 5; i++) {
//             await mutex.wait();
//             readerCount++;
//             if (readerCount === 1) {
//                 await db.wait();
//             }
//             activeReaders++;
//             updateStatus();
//             mutex.signal();

//             // Đọc dữ liệu
//             displayResult(`Reader ${id} đang đọc dữ liệu...`, true, false);
//             await sleep(1000); // Giả lập thời gian đọc

//             await mutex.wait();
//             activeReaders--;
//             readerCount--;
//             if (readerCount === 0) {
//                 db.signal();
//             }
//             updateStatus();
//             mutex.signal();

//             // Nghỉ đọc
//             displayResult(`Reader ${id} không đọc nữa.`, true, false);
//             await sleep(1000); // Nghỉ trước khi đọc tiếp
//         }
//     }

//     async function writer(id) {
//         for (let i = 0; i < 3; i++) {
//             waitingWriters++;
//             updateStatus();
//             await db.wait();
//             waitingWriters--;
//             activeWriters++;
//             updateStatus();

//             // Ghi dữ liệu
//             displayResult(`Writer ${id} đang ghi dữ liệu...`, false, true);
//             await sleep(1000); // Giả lập thời gian ghi

//             activeWriters--;
//             updateStatus();
//             db.signal();

//             // Nghỉ ghi
//             displayResult(`Writer ${id} không ghi nữa.`, false, true);
//             await sleep(1000); // Nghỉ trước khi ghi tiếp
//         }
//     }

//     const readerPromises = [];
//     for (let i = 0; i < 3; i++) {
//         readerPromises.push(reader(i));
//     }

//     const writerPromises = [];
//     for (let i = 0; i < 2; i++) {
//         writerPromises.push(writer(i));
//     }

//     await Promise.all([...readerPromises, ...writerPromises]);
// }
// async function monitorReaderWriter() {
//     const monitor = new Monitor();
//     let readerCount = 0; // Số lượng Reader đang hoạt động
//     let waitingWriters = 0; // Số lượng Writer đang đợi
//     let activeReaders = 0;
//     let activeWriters = 0;

//     function updateStatus() {
//         displayResult(
//             `Đang ghi: ${activeWriters}, Đọi ghi: ${waitingWriters}, Đang đọc: ${activeReaders}, Đợi đọc: ${readerCount - activeReaders}`,
//             false,
//             false
//         );
//     }

//     async function startRead() {
//         await monitor.enter();
//         while (waitingWriters > 0) {
//             await new Promise(resolve => monitor.queue.push(resolve));
//         }
//         readerCount++;
//         activeReaders++;
//         updateStatus();
//         monitor.leave();
//     }

//     async function endRead() {
//         await monitor.enter();
//         activeReaders--;
//         readerCount--;
//         if (readerCount === 0 && monitor.queue.length > 0) {
//             const resolve = monitor.queue.shift();
//             resolve();
//         }
//         updateStatus();
//         monitor.leave();
//     }

//     async function startWrite() {
//         await monitor.enter();
//         waitingWriters++;
//         updateStatus();
//         while (readerCount > 0) {
//             await new Promise(resolve => monitor.queue.push(resolve));
//         }
//         waitingWriters--;
//         activeWriters++;
//         updateStatus();
//         monitor.leave();
//     }

//     async function endWrite() {
//         await monitor.enter();
//         activeWriters--;
//         if (monitor.queue.length > 0) {
//             const resolve = monitor.queue.shift();
//             resolve();
//         }
//         updateStatus();
//         monitor.leave();
//     }

//     async function reader(id) {
//         for (let i = 0; i < 5; i++) {
//             await startRead();
//             displayResult(`Reader ${id} đang đọc dữ liệu...`, true, false);
//             await sleep(1000); // Giả lập thời gian đọc
//             await endRead();

//             // Nghỉ đọc
//             displayResult(`Reader ${id} không đọc nữa.`, true, false);
//             await sleep(1000); // Nghỉ trước khi đọc tiếp
//         }
//     }

//     async function writer(id) {
//         for (let i = 0; i < 3; i++) {
//             displayResult(`Writer ${id} đang tạo dữ liệu...`, false, true);
//             await sleep(1000); // Giả lập thời gian tạo dữ liệu
//             await startWrite();
//             displayResult(`Writer ${id} đang ghi dữ liệu...`, false, true);
//             await sleep(1000); // Giả lập thời gian ghi
//             await endWrite();

//             // Nghỉ ghi
//             displayResult(`Writer ${id} không ghi nữa.`, false, true);
//             await sleep(1000); // Nghỉ trước khi ghi tiếp
//         }
//     }

//     const readerPromises = [];
//     const writerPromises = [];
//     for (let i = 0; i < 3; i++) {
//         readerPromises.push(reader(i));
//     }
//     for (let i = 0; i < 2; i++) {
//         writerPromises.push(writer(i));
//     }

//     await Promise.all([...readerPromises, ...writerPromises]);
// }
async function semaphoreReaderWriter() {
    const mutex = new Semaphore(1); // Bảo vệ biến `readerCount`
    const db = new Semaphore(1);    // Quản lý truy cập vào cơ sở dữ liệu
    let readerCount = 0;
    let activeWriters = 0;
    let waitingWriters = 0;
    let activeReaders = 0;

    // Cập nhật trạng thái hiển thị
    function updateStatus() {
        displayResult(
            `Đang ghi: ${activeWriters}, Đợi ghi: ${waitingWriters}, Đang đọc: ${activeReaders}, Đợi đọc: ${readerCount - activeReaders}`,
            false,
            false
        );
    }

    // Hàm mô phỏng hành vi của một Reader
    async function reader(id) {
        for (let i = 0; i < 5; i++) {
            // Bắt đầu đọc
            await mutex.wait();
            readerCount++;
            if (readerCount === 1) {
                await db.wait(); // Chặn Writer
            }
            activeReaders++;
            updateStatus();
            mutex.signal();

            // Thực hiện đọc
            displayResult(`Reader ${id} đang đọc dữ liệu...`, true, false);
            await sleep(1000);

            // Kết thúc đọc
            await mutex.wait();
            activeReaders--;
            readerCount--;
            if (readerCount === 0) {
                db.signal(); // Cho phép Writer ghi
            }
            updateStatus();
            mutex.signal();

            displayResult(`Reader ${id} đã ngừng đọc.`, true, false);
            await sleep(1000);
        }
    }

    // Hàm mô phỏng hành vi của một Writer
    async function writer(id) {
        for (let i = 0; i < 3; i++) {
            // Chuẩn bị ghi
            waitingWriters++;
            updateStatus();
            await db.wait(); // Chờ cho phép ghi
            waitingWriters--;
            activeWriters++;
            updateStatus();

            // Thực hiện ghi
            displayResult(`Writer ${id} đang ghi dữ liệu...`, false, true);
            await sleep(1000);

            // Kết thúc ghi
            activeWriters--;
            updateStatus();
            db.signal();

            displayResult(`Writer ${id} đã ngừng ghi.`, false, true);
            await sleep(1000);
        }
    }

    // Tạo các Readers và Writers
    const readerPromises = Array.from({ length: 3 }, (_, i) => reader(i));
    const writerPromises = Array.from({ length: 2 }, (_, i) => writer(i));

    // Chờ tất cả Readers và Writers hoàn thành
    await Promise.all([...readerPromises, ...writerPromises]);
}
async function monitorReaderWriter() {
    const monitor = new Monitor();
    let readerCount = 0;
    let waitingWriters = 0;
    let activeReaders = 0;
    let activeWriters = 0;

    // Cập nhật trạng thái hiển thị
    function updateStatus() {
        displayResult(
            `Đang ghi: ${activeWriters}, Đợi ghi: ${waitingWriters}, Đang đọc: ${activeReaders}, Đợi đọc: ${readerCount - activeReaders}`,
            false,
            false
        );
    }

    // Reader bắt đầu đọc
    async function startRead() {
        await monitor.enter();
        while (waitingWriters > 0 || activeWriters > 0) {
            await new Promise(resolve => monitor.queue.push(resolve)); // Chờ Writer xong
        }
        readerCount++;
        activeReaders++;
        updateStatus();
        monitor.leave();
    }

    // Reader kết thúc đọc
    async function endRead() {
        await monitor.enter();
        activeReaders--;
        readerCount--;
        if (readerCount === 0 && monitor.queue.length > 0) {
            const resolve = monitor.queue.shift(); // Đánh thức Writer
            resolve();
        }
        updateStatus();
        monitor.leave();
    }

    // Writer bắt đầu ghi
    async function startWrite() {
        await monitor.enter();
        waitingWriters++;
        updateStatus();
        while (readerCount > 0 || activeWriters > 0) {
            await new Promise(resolve => monitor.queue.push(resolve)); // Chờ Reader xong
        }
        waitingWriters--;
        activeWriters++;
        updateStatus();
        monitor.leave();
    }

    // Writer kết thúc ghi
    async function endWrite() {
        await monitor.enter();
        activeWriters--;
        if (monitor.queue.length > 0) {
            const resolve = monitor.queue.shift(); // Đánh thức các Reader hoặc Writer tiếp theo
            resolve();
        }
        updateStatus();
        monitor.leave();
    }

    // Hàm mô phỏng Reader
    async function reader(id) {
        for (let i = 0; i < 5; i++) {
            await startRead();
            displayResult(`Reader ${id} đang đọc dữ liệu...`, true, false);
            await sleep(1000); // Đọc dữ liệu
            await endRead();

            displayResult(`Reader ${id} đã ngừng đọc.`, true, false);
            await sleep(1000); // Nghỉ ngơi
        }
    }

    // Hàm mô phỏng Writer
    async function writer(id) {
        for (let i = 0; i < 3; i++) {
            displayResult(`Writer ${id} đang tạo dữ liệu...`, false, true);
            await sleep(1000); // Tạo dữ liệu
            await startWrite();
            displayResult(`Writer ${id} đang ghi dữ liệu...`, false, true);
            await sleep(1000); // Ghi dữ liệu
            await endWrite();

            displayResult(`Writer ${id} đã ngừng ghi.`, false, true);
            await sleep(1000); // Nghỉ ngơi
        }
    }

    // Tạo các Readers và Writers
    const readerPromises = Array.from({ length: 3 }, (_, i) => reader(i));
    const writerPromises = Array.from({ length: 2 }, (_, i) => writer(i));

    // Chờ tất cả Readers và Writers hoàn thành
    await Promise.all([...readerPromises, ...writerPromises]);
}






// Sự kiện khi nhấn nút chạy
runButton.addEventListener('click', async () => {
    contentBox.innerHTML = ""; // Xóa nội dung trước khi chạy
    numPhilosophers = parseInt(numPhilosophersInput.value); // Lấy số triết gia
    producerConsumerRunning = true;
    const selectedOption = optionSelect.value;

    switch (selectedOption) {
        case 'Philosophers - Semaphore':
            await semaphorePhilosophers();
            break;
        case 'Philosophers - Monitor':
            await monitorPhilosophers();
            break;
        case 'Producer-Consumer - Semaphore':
            await semaphoreProducerConsumer();
            break;
        case 'Producer-Consumer - Monitor':
            await monitorProducerConsumer();
            break;
        case 'Reader-Writer - Semaphore':
            await semaphoreReaderWriter();
            break;
        case 'Reader-Writer - Monitor':
            await monitorReaderWriter();
            break;
        default:
            displayResult('Chưa chọn phương pháp nào.');
            break;
    }
});

document.addEventListener("DOMContentLoaded", function () {
    // Nút "Mô tả" Triết gia
    const descriptionButtonTG = document.querySelector('a[href="/mota-trietgia.html"]');
    // Phần tử hình ảnh của Triết gia
    const diningTableDivTG = document.getElementById("diningTable").parentElement;
    // Phần tử chứa mô tả của Triết gia
    const descriptionContentTG = document.getElementById("descriptionContent");
  
    // Khởi tạo trạng thái: bắt đầu ở chế độ "Hiển thị hình ảnh"
    let isDescriptionVisibleTG = false;
  
    if (descriptionButtonTG && diningTableDivTG && descriptionContentTG) {
      // Sự kiện khi nhấn nút mô tả
      descriptionButtonTG.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn hành động mặc định
  
        if (isDescriptionVisibleTG) {
          // Quay lại hiển thị hình ảnh
          diningTableDivTG.style.display = "block"; // Hiển thị hình ảnh
          descriptionContentTG.style.display = "none"; // Ẩn mô tả
          descriptionButtonTG.textContent = "Mô tả bài toán Bữa ăn của các Triết gia"; // Đổi lại tên nút
        } else {
          // Hiển thị mô tả
          diningTableDivTG.style.display = "none"; // Ẩn hình ảnh
          descriptionContentTG.style.display = "block"; // Hiển thị mô tả
          descriptionButtonTG.textContent = "Quay lại"; // Đổi tên nút
        }
  
        // Chuyển trạng thái
        isDescriptionVisibleTG = !isDescriptionVisibleTG;
      });
    }
  });
  

  document.addEventListener("DOMContentLoaded", function () {
    // Lấy các phần tử cần thiết
    const descriptionButtonRW = document.querySelector('a[href="/mota-writers-reader.html"]');
    const imageRW = document.querySelector('.img-fluid'); // Ảnh của Writer-Reader
    const descriptionContentRW = document.getElementById("descriptionContent-rw");
  
    // Khởi tạo trạng thái: bắt đầu ở chế độ "Hiển thị ảnh"
    let isDescriptionVisibleRW = false;
  
    // Đảm bảo các phần tử tồn tại trước khi thao tác
    if (descriptionButtonRW && imageRW && descriptionContentRW) {
      // Gắn sự kiện click vào nút mô tả
      descriptionButtonRW.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn hành động mặc định
  
        if (isDescriptionVisibleRW) {
          // Quay lại hiển thị ảnh
          imageRW.style.display = "block"; // Hiện ảnh
          descriptionContentRW.style.display = "none"; // Ẩn mô tả
          descriptionButtonRW.textContent = "Mô tả bài toán Writer-Reader"; // Đổi lại tên nút
        } else {
          // Hiển thị mô tả
          imageRW.style.display = "none"; // Ẩn ảnh
          descriptionContentRW.style.display = "block"; // Hiện mô tả
          descriptionButtonRW.textContent = "Quay lại"; // Đổi tên nút
        }
  
        // Chuyển trạng thái
        isDescriptionVisibleRW = !isDescriptionVisibleRW;
      });
    }
  });
  
  
  document.addEventListener("DOMContentLoaded", function () {
    // Lấy các phần tử cần thiết
    const descriptionButtonRW = document.querySelector('a[href="/mota-producer-consumer.html"]');
    const imageRW = document.querySelector('.img-fluid'); // Ảnh
    const descriptionContentRW = document.getElementById("descriptionContent-pc");
  
    // Khởi tạo trạng thái: bắt đầu ở chế độ "Hiển thị ảnh"
    let isDescriptionVisible = false;
  
    // Đảm bảo các phần tử tồn tại trước khi thao tác
    if (descriptionButtonRW && imageRW && descriptionContentRW) {
      // Gắn sự kiện click vào nút mô tả
      descriptionButtonRW.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn hành động mặc định
  
        if (isDescriptionVisible) {
          // Quay lại hiển thị ảnh
          imageRW.style.display = "block"; // Hiện ảnh
          descriptionContentRW.style.display = "none"; // Ẩn mô tả
          descriptionButtonRW.textContent = "Mô tả bài toán Producer-Consumer"; // Đổi lại tên nút
        } else {
          // Hiển thị mô tả
          imageRW.style.display = "none"; // Ẩn ảnh
          descriptionContentRW.style.display = "block"; // Hiện mô tả
          descriptionButtonRW.textContent = "Quay lại"; // Đổi tên nút
        }
  
        // Chuyển trạng thái
        isDescriptionVisible = !isDescriptionVisible;
      });
    }
  });
  