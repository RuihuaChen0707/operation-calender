// 全局变量
let currentYear = new Date().getFullYear();
let yearCalendarData = {};
let userEvents = {};
let selectedDate = null;

// Firebase数据库引用
let eventsRef;

// 事件类型颜色映射
const EVENT_COLORS = {
    'school': '#5B9BD5',
    'public': '#7030A0', 
    'islamic': '#00B050',
    'christian': '#FF0000',
    'back_to_school': '#FFFF00'
};

// 事件类型英文名称映射
const EVENT_TYPE_NAMES = {
    'school': 'School Holiday',
    'public': 'Public Holiday',
    'islamic': 'Islamic Holiday', 
    'christian': 'Christian Holiday',
    'back_to_school': 'Back to School'
};

// 月份名称映射
const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

// 星期缩写
const WEEKDAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 等待Firebase初始化
    if (window.firebaseDB) {
        eventsRef = window.firebaseDB.eventsRef;
        initializeCalendar();
        setupEventListeners();
        loadUserEventsFromFirebase();
        setupFirebaseListeners();
    } else {
        // 如果Firebase未加载，等待一下再试
        setTimeout(() => {
            eventsRef = window.firebaseDB.eventsRef;
            initializeCalendar();
            setupEventListeners();
            loadUserEventsFromFirebase();
            setupFirebaseListeners();
        }, 1000);
    }
});

// 初始化日历
function initializeCalendar() {
    // 确保年份在有效范围内
    if (currentYear < 2025) currentYear = 2025;
    if (currentYear > 2035) currentYear = 2035;
    
    loadAvailableYears();
    loadYearCalendarData(currentYear);
}

// 加载可用年份
function loadAvailableYears() {
    fetch('/api/years')
        .then(response => response.json())
        .then(years => {
            const yearSelect = document.getElementById('year-select');
            yearSelect.innerHTML = '';
            
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year + '年';
                if (year === currentYear) {
                    option.selected = true;
                }
                yearSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('加载年份失败:', error);
        });
}

// 加载全年日历数据
function loadYearCalendarData(year) {
    const promises = [];
    
    // 加载12个月的数据
    for (let month = 1; month <= 12; month++) {
        promises.push(
            fetch(`/api/calendar/${year}/${month}`)
                .then(response => response.json())
                .then(data => {
                    yearCalendarData[month] = data;
                })
        );
    }
    
    Promise.all(promises)
        .then(() => {
            renderYearCalendar();
            updateAllEventsLists(); // 添加这行
        })
        .catch(error => {
            console.error('加载年度日历数据失败:', error);
        });
}

// 渲染全年日历
function renderYearCalendar() {
    const yearGrid = document.getElementById('year-grid');
    yearGrid.innerHTML = '';
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 渲染12个月
    for (let month = 1; month <= 12; month++) {
        const monthData = yearCalendarData[month];
        if (!monthData) continue;
        
        // 创建月份容器
        const monthContainer = document.createElement('div');
        monthContainer.className = 'month-container';
        
        // 创建迷你日历
        const miniCalendar = document.createElement('div');
        miniCalendar.className = 'mini-calendar';
        
        // 月份标题
        const header = document.createElement('div');
        header.className = 'mini-calendar-header';
        header.textContent = `${MONTH_NAMES[month - 1]} '${String(currentYear).slice(-2)}`;
        miniCalendar.appendChild(header);
        
        // 星期表头
        const weekdays = document.createElement('div');
        weekdays.className = 'mini-calendar-weekdays';
        WEEKDAY_ABBR.forEach(day => {
            const weekday = document.createElement('div');
            weekday.className = 'mini-weekday';
            weekday.textContent = day;
            weekdays.appendChild(weekday);
        });
        miniCalendar.appendChild(weekdays);
        
        // 日期网格
        const daysContainer = document.createElement('div');
        daysContainer.className = 'mini-calendar-days';
        
        monthData.calendar.forEach(week => {
            week.forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.className = 'mini-day';
                
                if (day === 0) {
                    // 空白单元格（其他月份的日期）
                    dayElement.classList.add('other-month');
                    dayElement.textContent = '';
                } else {
                    const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    dayElement.textContent = day;
                    
                    // 检查是否是今天
                    if (dateStr === todayStr) {
                        dayElement.classList.add('today');
                    }
                    
                    // 检查预设事件
                    if (monthData.preset_events[dateStr]) {
                        const event = monthData.preset_events[dateStr];
                        dayElement.classList.add(event.type);
                    }
                    
                    // 检查用户自定义事件
                    if (userEvents[dateStr]) {
                        const event = userEvents[dateStr];
                        dayElement.classList.add(event.type);
                    }
                    
                    // 添加点击事件
                    dayElement.addEventListener('click', () => openEventModal(dateStr));
                    dayElement.dataset.date = dateStr;
                }
                
                daysContainer.appendChild(dayElement);
            });
        });
        
        miniCalendar.appendChild(daysContainer);
        monthContainer.appendChild(miniCalendar);
        
        // 创建事件列表
        const eventsList = createEventsListForMonth(month);
        monthContainer.appendChild(eventsList);
        
        yearGrid.appendChild(monthContainer);
    }
}

// 为指定月份创建事件列表
function createEventsListForMonth(month) {
    const eventsList = document.createElement('div');
    eventsList.className = 'events-list';
    eventsList.id = `events-list-${month}`;
    
    // 事件列表标题
    const header = document.createElement('div');
    header.className = 'events-list-header';
    header.textContent = `${month}月事件`;
    eventsList.appendChild(header);
    
    // 事件列表内容
    const content = document.createElement('div');
    content.className = 'events-list-content';
    eventsList.appendChild(content);
    
    // 更新事件列表内容
    updateEventsListForMonth(month);
    
    return eventsList;
}

// 更新指定月份的事件列表
function updateEventsListForMonth(month) {
    const eventsList = document.getElementById(`events-list-${month}`);
    if (!eventsList) return;
    
    const content = eventsList.querySelector('.events-list-content');
    content.innerHTML = '';
    
    const monthData = yearCalendarData[month];
    if (!monthData) return;
    
    // 收集该月的所有事件
    const monthEvents = [];
    
    // 收集预设事件
    Object.keys(monthData.preset_events).forEach(dateStr => {
        const eventMonth = parseInt(dateStr.split('-')[1]);
        const eventYear = parseInt(dateStr.split('-')[0]);
        if (eventMonth === month && eventYear === currentYear) {
            const event = monthData.preset_events[dateStr];
            const day = parseInt(dateStr.split('-')[2]);
            monthEvents.push({
                date: dateStr,
                day: day,
                title: event.title || EVENT_TYPE_NAMES[event.type],
                type: event.type,
                isPreset: true
            });
        }
    });
    
    // 收集用户自定义事件
    Object.keys(userEvents).forEach(dateStr => {
        const eventMonth = parseInt(dateStr.split('-')[1]);
        const eventYear = parseInt(dateStr.split('-')[0]);
        if (eventMonth === month && eventYear === currentYear) {
            const event = userEvents[dateStr];
            const day = parseInt(dateStr.split('-')[2]);
            monthEvents.push({
                date: dateStr,
                day: day,
                title: event.title || EVENT_TYPE_NAMES[event.type],
                type: event.type,
                isPreset: false
            });
        }
    });
    
    // 按日期排序
    monthEvents.sort((a, b) => a.day - b.day);
    
    if (monthEvents.length === 0) {
        const noEvents = document.createElement('div');
        noEvents.className = 'no-events';
        noEvents.textContent = '本月无事件';
        content.appendChild(noEvents);
    } else {
        monthEvents.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = `event-item ${event.type}`;
            
            // 颜色点
            const colorDot = document.createElement('div');
            colorDot.className = 'event-color-dot';
            colorDot.style.backgroundColor = EVENT_COLORS[event.type];
            eventItem.appendChild(colorDot);
            
            // 日期
            const eventDate = document.createElement('span');
            eventDate.className = 'event-date';
            eventDate.textContent = `${event.day}日`;
            eventItem.appendChild(eventDate);
            
            // 事件标题
            const eventTitle = document.createElement('span');
            eventTitle.className = 'event-title';
            eventTitle.textContent = event.title;
            eventItem.appendChild(eventTitle);
            
            // 添加点击事件
            eventItem.addEventListener('click', () => openEventModal(event.date));
            eventItem.style.cursor = 'pointer';
            
            content.appendChild(eventItem);
        });
    }
}

// 更新所有月份的事件列表
function updateAllEventsLists() {
    for (let month = 1; month <= 12; month++) {
        updateEventsListForMonth(month);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 年份选择
    document.getElementById('year-select').addEventListener('change', function() {
        currentYear = parseInt(this.value);
        loadYearCalendarData(currentYear);
    });
    
    // 下载按钮
    document.getElementById('download-btn').addEventListener('click', downloadCalendar);
    
    // 模态窗口事件
    setupModalEvents();
}

// 设置模态窗口事件
function setupModalEvents() {
    const modal = document.getElementById('event-modal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.querySelector('.btn-cancel');
    const form = document.getElementById('event-form');
    const deleteBtn = document.getElementById('delete-event');
    
    // 关闭模态窗口
    closeBtn.addEventListener('click', closeEventModal);
    cancelBtn.addEventListener('click', closeEventModal);
    
    // 点击模态窗口外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeEventModal();
        }
    });
    
    // 表单提交
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        saveEvent();
    });
    
    // 删除事件
    deleteBtn.addEventListener('click', deleteEvent);
}

// 打开事件模态窗口
function openEventModal(dateStr) {
    selectedDate = dateStr;
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    
    // 重置表单
    form.reset();
    
    // 设置日期
    document.getElementById('start-date').value = dateStr;
    document.getElementById('end-date').value = dateStr;
    
    // 检查是否已有事件
    const month = parseInt(dateStr.split('-')[1]);
    const monthData = yearCalendarData[month];
    const existingEvent = userEvents[dateStr] || (monthData && monthData.preset_events[dateStr]);
    
    if (existingEvent) {
        document.getElementById('event-title').value = existingEvent.title || '';
        document.getElementById('event-type').value = existingEvent.type;
        
        // 如果是预设事件，禁用删除按钮
        const deleteBtn = document.getElementById('delete-event');
        if (monthData && monthData.preset_events[dateStr]) {
            deleteBtn.style.display = 'none';
        } else {
            deleteBtn.style.display = 'inline-block';
        }
    } else {
        document.getElementById('delete-event').style.display = 'none';
    }
    
    modal.style.display = 'block';
}

// 关闭事件模态窗口
function closeEventModal() {
    const modal = document.getElementById('event-modal');
    modal.style.display = 'none';
    selectedDate = null;
}

// 保存事件
function saveEvent() {
    const title = document.getElementById('event-title').value.trim();
    const type = document.getElementById('event-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }
    
    // 处理日期范围
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
        alert('开始日期不能晚于结束日期');
        return;
    }
    
    // 为日期范围内的每一天添加事件
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        userEvents[dateStr] = {
            title: title,
            type: type,
            color: EVENT_COLORS[type]
        };
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 保存到Firebase
    saveUserEventsToFirebase();
    
    // 关闭模态窗口
    closeEventModal();
}

// 删除事件
function deleteEvent() {
    if (selectedDate && userEvents[selectedDate]) {
        delete userEvents[selectedDate];
        
        // 保存到Firebase
        saveUserEventsToFirebase();
        
        closeEventModal();
    }
}

// 替换原来的saveUserEvents函数
function saveUserEventsToFirebase() {
    if (!eventsRef) return;
    
    // 直接设置整个events节点
    eventsRef.set(userEvents).then(() => {
        console.log('事件已保存到Firebase');
    }).catch((error) => {
        console.error('保存事件失败:', error);
        alert('保存失败，请检查网络连接');
    });
}

// 替换原来的loadUserEvents函数
function loadUserEventsFromFirebase() {
    if (!eventsRef) return;
    
    eventsRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            userEvents = data;
        } else {
            userEvents = {};
        }
        // 加载完成后渲染日历
        renderYearCalendar();
        updateAllEventsLists();
    }).catch((error) => {
        console.error('加载事件失败:', error);
        userEvents = {};
        renderYearCalendar();
        updateAllEventsLists();
    });
}

// 设置Firebase实时监听器
function setupFirebaseListeners() {
    if (!eventsRef) return;
    
    eventsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            userEvents = data;
        } else {
            userEvents = {};
        }
        // 实时更新UI
        renderYearCalendar();
        updateAllEventsLists();
    });
}

// 下载日历功能
function downloadCalendar() {
    // 使用html2canvas库来截图
    if (typeof html2canvas === 'undefined') {
        // 动态加载html2canvas库
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = function() {
            performDownload();
        };
        document.head.appendChild(script);
    } else {
        performDownload();
    }
}

// 执行下载
function performDownload() {
    const yearGrid = document.getElementById('year-grid');
    const legend = document.querySelector('.legend');
    const header = document.querySelector('.calendar-header');
    
    // 创建一个临时容器包含所有要下载的内容
    const downloadContainer = document.createElement('div');
    downloadContainer.style.backgroundColor = 'white';
    downloadContainer.style.padding = '20px';
    downloadContainer.style.fontFamily = 'Arial, sans-serif';
    
    // 克隆标题
    const headerClone = header.cloneNode(true);
    downloadContainer.appendChild(headerClone);
    
    // 克隆全年网格
    const yearGridClone = yearGrid.cloneNode(true);
    downloadContainer.appendChild(yearGridClone);
    
    // 克隆图例
    const legendClone = legend.cloneNode(true);
    downloadContainer.appendChild(legendClone);
    
    // 临时添加到页面
    downloadContainer.style.position = 'absolute';
    downloadContainer.style.left = '-9999px';
    downloadContainer.style.top = '0';
    document.body.appendChild(downloadContainer);
    
    // 使用html2canvas截图
    html2canvas(downloadContainer, {
        backgroundColor: 'white',
        scale: 2, // 提高分辨率
        useCORS: true,
        allowTaint: true
    }).then(canvas => {
        // 移除临时容器
        document.body.removeChild(downloadContainer);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `日历_${currentYear}年.png`;
        link.href = canvas.toDataURL('image/png');
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(error => {
        console.error('下载失败:', error);
        alert('下载失败，请重试');
        // 移除临时容器
        if (document.body.contains(downloadContainer)) {
            document.body.removeChild(downloadContainer);
        }
    });
}

// 键盘快捷键支持
document.addEventListener('keydown', function(event) {
    // ESC键关闭模态窗口
    if (event.key === 'Escape') {
        closeEventModal();
    }
});