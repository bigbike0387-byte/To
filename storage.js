/**
 * ============================================
 * ครัวรีเทิน - Central Storage System
 * ฟังก์ชันกลางสำหรับจัดการข้อมูลทั้งระบบ
 * ============================================
 */

// ===== ข้อมูลเริ่มต้น (Initial Data) =====
const INITIAL_DATA = {
    // ผู้ใช้งานระบบ
    users: [
        { id: 'staff001', username: 'chef', password: 'chef123', role: 'staff', name: 'พ่อครัวใหญ่' },
        { id: 'owner001', username: 'owner', password: 'owner123', role: 'owner', name: 'เจ้าของร้าน' }
    ],
    
    // เมนูอาหาร
    menus: [
        { id: 1, name: 'ข้าวผัดหมู', price: 60, category: 'ข้าว', image: '🍚' },
        { id: 2, name: 'ข้าวผัดกุ้ง', price: 80, category: 'ข้าว', image: '🍤' },
        { id: 3, name: 'ผัดกะเพราหมูสับ', price: 55, category: 'ผัด', image: '🥩' },
        { id: 4, name: 'ผัดกะเพราไก่', price: 55, category: 'ผัด', image: '🍗' },
        { id: 5, name: 'ต้มยำกุ้ง', price: 120, category: 'ต้ม', image: '🥘' },
        { id: 6, name: 'น้ำเปล่า', price: 15, category: 'เครื่องดื่ม', image: '💧' },
        { id: 7, name: 'โค้ก', price: 25, category: 'เครื่องดื่ม', image: '🥤' }
    ],
    
    // ออเดอร์
    orders: [],
    
    // ข้อความแชท
    messages: [],
    
    // การแจ้งเตือน
    notifications: [],
    
    // ปัญหาที่แจ้ง
    issues: [],
    
    // รายงาน (คำนวณจาก orders)
    reports: {
        daily: [],
        monthly: []
    },
    
    // ตั้งค่าร้าน
    settings: {
        restaurantName: 'ครัวรีเทิน',
        tables: 10
    }
};

// ===== ฟังก์ชันพื้นฐานจัดการ LocalStorage =====

/**
 * ดึงข้อมูลจาก localStorage
 * @param {string} key - ชื่อ key
 * @returns {any} ข้อมูลที่ดึงมา
 */
function getData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Error reading ${key}:`, error);
        return null;
    }
}

/**
 * บันทึกข้อมูลลง localStorage
 * @param {string} key - ชื่อ key
 * @param {any} data - ข้อมูลที่จะบันทึก
 */
function setData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        // กระตุ้น event ให้หน้าอื่นๆ รู้ว่ามีการเปลี่ยนแปลง
        window.dispatchEvent(new StorageEvent('storage', { key: key }));
    } catch (error) {
        console.error(`Error saving ${key}:`, error);
    }
}

/**
 * เริ่มต้นข้อมูลเริ่มต้นถ้ายังไม่มี
 */
function initializeData() {
    Object.keys(INITIAL_DATA).forEach(key => {
        if (!localStorage.getItem(key)) {
            setData(key, INITIAL_DATA[key]);
            console.log(`Initialized: ${key}`);
        }
    });
}

/**
 * ล้างข้อมูลทั้งหมด (ใช้สำหรับทดสอบ)
 */
function clearAllData() {
    Object.keys(INITIAL_DATA).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('All data cleared');
}

// ===== ฟังก์ชันจัดการ Users =====

/**
 * ตรวจสอบการเข้าสู่ระบบ
 * @param {string} username - ชื่อผู้ใช้
 * @param {string} password - รหัสผ่าน
 * @returns {object|null} ข้อมูลผู้ใช้หรือ null
 */
function login(username, password) {
    const users = getData('users');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        // บันทึก session
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    }
    return null;
}

/**
 * ตรวจสอบว่าเป็นลูกค้าหรือไม่ (ไม่ต้อง login)
 * @param {number} table - หมายเลขโต๊ะ
 */
function loginAsCustomer(table) {
    const customer = { id: `cust_${Date.now()}`, role: 'customer', table: table };
    sessionStorage.setItem('currentUser', JSON.stringify(customer));
    return customer;
}

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบัน
 */
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

/**
 * ออกจากระบบ
 */
function logout() {
    sessionStorage.removeItem('currentUser');
}

// ===== ฟังก์ชันจัดการ Orders =====

/**
 * สร้างออเดอร์ใหม่
 * @param {object} orderData - ข้อมูลออเดอร์
 * @returns {string} ID ของออเดอร์
 */
function createOrder(orderData) {
    const orders = getData('orders') || [];
    const orderId = `ORD${String(orders.length + 1).padStart(3, '0')}`;
    
    const newOrder = {
        id: orderId,
        table: orderData.table,
        items: orderData.items.map(item => ({
            ...item,
            status: 'waiting',
            startedAt: null,
            completedAt: null
        })),
        status: 'waiting',
        createdAt: Date.now(),
        paid: false,
        total: orderData.items.reduce((sum, item) => sum + (item.price * item.qty), 0)
    };
    
    orders.push(newOrder);
    setData('orders', orders);
    
    // สร้างการแจ้งเตือนให้ครัว
    createNotification('order', `มีออเดอร์ใหม่ โต๊ะ ${orderData.table}`, { orderId });
    
    return orderId;
}

/**
 * ดึงออเดอร์ทั้งหมด
 */
function getAllOrders() {
    return getData('orders') || [];
}

/**
 * ดึงออเดอร์ตามโต๊ะ
 * @param {number} table - หมายเลขโต๊ะ
 */
function getOrdersByTable(table) {
    const orders = getAllOrders();
    return orders.filter(o => o.table === table && !o.paid);
}

/**
 * ดึงออเดอร์ตาม ID
 * @param {string} orderId - รหัสออเดอร์
 */
function getOrderById(orderId) {
    const orders = getAllOrders();
    return orders.find(o => o.id === orderId);
}

/**
 * อัปเดตสถานะออเดอร์
 * @param {string} orderId - รหัสออเดอร์
 * @param {string} newStatus - สถานะใหม่
 */
function updateOrderStatus(orderId, newStatus) {
    const orders = getAllOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;
        
        if (newStatus === 'paid') {
            orders[orderIndex].paid = true;
            orders[orderIndex].paidAt = Date.now();
        }
        
        setData('orders', orders);
        
        // แจ้งเตือนลูกค้า
        createNotification('status', `ออเดอร์ ${orderId} เปลี่ยนสถานะเป็น ${getStatusText(newStatus)}`, { 
            orderId, 
            table: orders[orderIndex].table 
        });
        
        return true;
    }
    return false;
}

/**
 * อัปเดตสถานะรายการอาหารในออเดอร์
 * @param {string} orderId - รหัสออเดอร์
 * @param {number} itemIndex - ลำดับรายการ
 * @param {string} newStatus - สถานะใหม่
 */
function updateItemStatus(orderId, itemIndex, newStatus) {
    const orders = getAllOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order && order.items[itemIndex]) {
        order.items[itemIndex].status = newStatus;
        
        if (newStatus === 'cooking' && !order.items[itemIndex].startedAt) {
            order.items[itemIndex].startedAt = Date.now();
        }
        if (newStatus === 'ready') {
            order.items[itemIndex].completedAt = Date.now();
        }
        
        // ตรวจสอบว่าทุกรายการเสร็จหรือยัง
        const allReady = order.items.every(item => item.status === 'ready' || item.status === 'served');
        const allServed = order.items.every(item => item.status === 'served');
        
        if (allServed) {
            order.status = 'served';
        } else if (allReady) {
            order.status = 'ready';
        } else if (order.items.some(item => item.status === 'cooking')) {
            order.status = 'cooking';
        }
        
        setData('orders', orders);
        return true;
    }
    return false;
}

/**
 * แปลงสถานะเป็นภาษาไทย
 */
function getStatusText(status) {
    const statusMap = {
        'waiting': 'รอดำเนินการ',
        'cooking': 'กำลังทำ',
        'ready': 'พร้อมเสิร์ฟ',
        'served': 'เสิร์ฟแล้ว',
        'paid': 'ชำระเงินแล้ว',
        'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || status;
}

/**
 * รับสีของสถานะ
 */
function getStatusColor(status) {
    const colorMap = {
        'waiting': '#9e9e9e',    // เทา
        'cooking': '#ff9800',    // ส้ม
        'ready': '#2196f3',      // ฟ้า
        'served': '#4caf50',     // เขียว
        'paid': '#9c27b0',       // ม่วง
        'cancelled': '#f44336'   // แดง
    };
    return colorMap[status] || '#9e9e9e';
}

// ===== ฟังก์ชันจัดการ Messages =====

/**
 * ส่งข้อความ
 * @param {object} messageData - ข้อมูลข้อความ
 */
function sendMessage(messageData) {
    const messages = getData('messages') || [];
    const newMessage = {
        id: Date.now(),
        table: messageData.table,
        sender: messageData.sender, // 'customer' หรือ 'staff'
        senderName: messageData.senderName,
        text: messageData.text,
        time: Date.now(),
        read: false
    };
    
    messages.push(newMessage);
    setData('messages', messages);
    
    // แจ้งเตือนฝั่งรับ
    const notifyRole = messageData.sender === 'customer' ? 'staff' : 'customer';
    createNotification('message', `ข้อความใหม่จากโต๊ะ ${messageData.table}`, { 
        table: messageData.table,
        forRole: notifyRole
    });
    
    return newMessage;
}

/**
 * ดึงข้อความตามโต๊ะ
 * @param {number} table - หมายเลขโต๊ะ
 */
function getMessagesByTable(table) {
    const messages = getData('messages') || [];
    return messages.filter(m => m.table === table).sort((a, b) => a.time - b.time);
}

/**
 * ดึงข้อความทั้งหมด (สำหรับ staff)
 */
function getAllMessages() {
    const messages = getData('messages') || [];
    return messages.sort((a, b) => b.time - a.time);
}

// ===== ฟังก์ชันจัดการ Notifications =====

/**
 * สร้างการแจ้งเตือน
 * @param {string} type - ประเภท (order, message, status, call)
 * @param {string} message - ข้อความ
 * @param {object} extra - ข้อมูลเพิ่มเติม
 */
function createNotification(type, message, extra = {}) {
    const notifications = getData('notifications') || [];
    const newNotification = {
        id: Date.now(),
        type: type,
        message: message,
        time: Date.now(),
        read: false,
        ...extra
    };
    
    notifications.unshift(newNotification);
    
    // เก็บแค่ 50 รายการล่าสุด
    if (notifications.length > 50) {
        notifications.pop();
    }
    
    setData('notifications', notifications);
    return newNotification;
}

/**
 * ดึงการแจ้งเตือนตาม role
 * @param {string} role - บทบาท (customer/staff/owner)
 * @param {number} table - หมายเลขโต๊ะ (สำหรับ customer)
 */
function getNotifications(role, table = null) {
    const notifications = getData('notifications') || [];
    
    if (role === 'customer' && table) {
        return notifications.filter(n => 
            (n.table === table) || 
            (n.type === 'status' && n.table === table)
        );
    } else if (role === 'staff') {
        return notifications.filter(n => 
            n.type === 'order' || 
            n.type === 'message' || 
            n.type === 'call' ||
            (n.type === 'status' && n.forRole === 'staff')
        );
    } else if (role === 'owner') {
        return notifications.filter(n => 
            n.type === 'issue' || 
            n.type === 'report'
        );
    }
    
    return notifications;
}

/**
 * ทำเครื่องหมายอ่านแล้ว
 * @param {number} notificationId - ID การแจ้งเตือน
 */
function markNotificationAsRead(notificationId) {
    const notifications = getData('notifications') || [];
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
        notifications[index].read = true;
        setData('notifications', notifications);
        return true;
    }
    return false;
}

// ===== ฟังก์ชันจัดการ Issues =====

/**
 * แจ้งปัญหา
 * @param {object} issueData - ข้อมูลปัญหา
 */
function createIssue(issueData) {
    const issues = getData('issues') || [];
    const newIssue = {
        id: Date.now(),
        table: issueData.table,
        message: issueData.message,
        status: 'pending',
        createdAt: Date.now(),
        resolvedAt: null,
        response: null
    };
    
    issues.push(newIssue);
    setData('issues', issues);
    
    createNotification('issue', `มีปัญหาจากโต๊ะ ${issueData.table}: ${issueData.message}`, { issueId: newIssue.id });
    return newIssue;
}

/**
 * ดึงปัญหาทั้งหมด
 */
function getAllIssues() {
    return getData('issues') || [];
}

/**
 * อัปเดตสถานะปัญหา
 * @param {number} issueId - ID ปัญหา
 * @param {string} status - สถานะใหม่
 * @param {string} response - คำตอบ
 */
function updateIssueStatus(issueId, status, response = null) {
    const issues = getData('issues') || [];
    const index = issues.findIndex(i => i.id === issueId);
    
    if (index !== -1) {
        issues[index].status = status;
        if (status === 'resolved') {
            issues[index].resolvedAt = Date.now();
        }
        if (response) {
            issues[index].response = response;
        }
        setData('issues', issues);
        return true;
    }
    return false;
}

// ===== ฟังก์ชันรายงาน =====

/**
 * คำนวณรายงานจากออเดอร์
 */
function calculateReports() {
    const orders = getAllOrders();
    const paidOrders = orders.filter(o => o.paid);
    
    // รายงานรายวัน
    const dailyReport = {};
    const monthlyReport = {};
    const menuStats = {};
    
    paidOrders.forEach(order => {
        const date = new Date(order.paidAt);
        const dateKey = date.toISOString().split('T')[0];
        const monthKey = dateKey.substring(0, 7);
        
        // รายวัน
        if (!dailyReport[dateKey]) {
            dailyReport[dateKey] = { total: 0, orders: 0, items: {} };
        }
        dailyReport[dateKey].total += order.total;
        dailyReport[dateKey].orders += 1;
        
        // รายเดือน
        if (!monthlyReport[monthKey]) {
            monthlyReport[monthKey] = { total: 0, orders: 0 };
        }
        monthlyReport[monthKey].total += order.total;
        monthlyReport[monthKey].orders += 1;
        
        // สถิติเมนู
        order.items.forEach(item => {
            if (!menuStats[item.name]) {
                menuStats[item.name] = { qty: 0, revenue: 0 };
            }
            menuStats[item.name].qty += item.qty;
            menuStats[item.name].revenue += (item.price * item.qty);
        });
    });
    
    return {
        daily: dailyReport,
        monthly: monthlyReport,
        menuStats: menuStats,
        summary: {
            totalRevenue: paidOrders.reduce((sum, o) => sum + o.total, 0),
            totalOrders: paidOrders.length,
            totalItems: paidOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0)
        }
    };
}

// ===== ฟังก์ชันเรียกพนักงาน =====

/**
 * เรียกพนักงาน
 * @param {number} table - หมายเลขโต๊ะ
 * @param {string} reason - เหตุผล
 */
function callStaff(table, reason = 'เรียกพนักงาน') {
    createNotification('call', `โต๊ะ ${table}: ${reason}`, { table });
    return true;
}

// ===== ระบบ Sync ข้อมูลอัตโนมัติ =====

/**
 * ตั้งค่าการ Sync ข้อมูลอัตโนมัติ
 * @param {function} callback - ฟังก์ชันที่จะเรียกเมื่อข้อมูลเปลี่ยน
 * @param {number} interval - ระยะเวลา (ms)
 */
function setupAutoSync(callback, interval = 2000) {
    // 1. ตรวจจับการเปลี่ยนแปลงจากหน้าอื่น
    window.addEventListener('storage', (e) => {
        if (e.key && ['orders', 'messages', 'notifications', 'issues'].includes(e.key)) {
            console.log(`Data changed: ${e.key}`);
            callback(e.key);
        }
    });
    
    // 2. ตรวจสอบเป็นระยะ (fallback)
    setInterval(() => {
        callback('interval');
    }, interval);
    
    console.log('Auto-sync started');
}

// ===== เริ่มต้นระบบ =====
// ตรวจสอบว่าอยู่ใน browser และเริ่มต้นข้อมูล
if (typeof window !== 'undefined') {
    initializeData();
    console.log('🍳 ครัวรีเทิน Storage System Loaded');
}

