// Global variables
let currentYear = new Date().getFullYear();
let selectedDate = null;
let yearCalendarData = {};
let userEvents = {};

// Event type mappings
const EVENT_TYPE_NAMES = {
    'holiday': '节假日',
    'work': '工作日',
    'personal': '个人事件',
    'meeting': '会议',
    'birthday': '生日',
    'anniversary': '纪念日',
    'other': '其他'
};

// Event colors
const EVENT_COLORS = {
    'holiday': '#ff6b6b',
    'work': '#4ecdc4',
    'personal': '#45b7d1',
    'meeting': '#96ceb4',
    'birthday': '#feca57',
    'anniversary': '#ff9ff3',
    'other': '#a8a8a8'
};

// Month names
const MONTH_NAMES = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// Weekday abbreviations
const WEEKDAY_ABBR = ['日', '一', '二', '三', '四', '五', '六'];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
    setupEventListeners();
});

// Initialize calendar
function initializeCalendar() {
    loadAvailableYears();
    loadYearCalendarData(currentYear);
    loadUserEvents();
}

// Load available years
function loadAvailableYears() {
    window.calendarAPI.getAvailableYears()
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
            console.error('Failed to load available years:', error);
        });
}

// Load year calendar data
function loadYearCalendarData(year) {
    const promises = [];
    
    for (let month = 1; month <= 12; month++) {
        const promise = window.calendarAPI.getCalendarData(year, month)
            .then(data => {
                yearCalendarData[month] = data;
            })
            .catch(error => {
                console.error(`Failed to load data for ${year}-${month}:`, error);
                yearCalendarData[month] = { events: {} };
            });
        promises.push(promise);
    }
    
    Promise.all(promises).then(() => {
        renderYearCalendar();
        updateAllEventsLists();
    });
}

// Load user events
function loadUserEvents() {
    window.calendarAPI.getEvents()
        .then(events => {
            userEvents = {};
            events.forEach(event => {
                userEvents[event.date] = {
                    title: event.title,
                    type: event.event_type,
                    color: EVENT_COLORS[event.event_type]
                };
            });
            renderYearCalendar();
            updateAllEventsLists();
        })
        .catch(error => {
            console.error('Failed to load user events:', error);
            userEvents = {};
        });
}

// Render year calendar
function renderYearCalendar() {
    const yearGrid = document.getElementById('year-grid');
    yearGrid.innerHTML = '';
    
    for (let month = 1; month <= 12; month++) {
        const monthContainer = createMonthContainer(month);
        yearGrid.appendChild(monthContainer);
    }
}

// Create month container
function createMonthContainer(month) {
    const container = document.createElement('div');
    container.className = 'month-container';
    
    // Month calendar
    const monthCalendar = createMonthCalendar(month);
    container.appendChild(monthCalendar);
    
    // Events list
    const eventsList = createEventsListForMonth(month);
    container.appendChild(eventsList);
    
    return container;
}

// Create month calendar
function createMonthCalendar(month) {
    const monthDiv = document.createElement('div');
    monthDiv.className = 'month';
    
    // Month header
    const header = document.createElement('div');
    header.className = 'month-header';
    header.textContent = MONTH_NAMES[month - 1];
    monthDiv.appendChild(header);
    
    // Weekday headers
    const weekdayHeader = document.createElement('div');
    weekdayHeader.className = 'weekday-header';
    WEEKDAY_ABBR.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'weekday';
        dayHeader.textContent = day;
        weekdayHeader.appendChild(dayHeader);
    });
    monthDiv.appendChild(weekdayHeader);
    
    // Calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';
    
    // Get month data
    const monthData = yearCalendarData[month] || { events: {} };
    
    // Calculate first day and number of days
    const firstDay = new Date(currentYear, month - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, month, 0).getDate();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.textContent = day;
        
        const dateStr = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Check for preset events (from API)
        const presetEvent = monthData.events[dateStr];
        if (presetEvent) {
            dayDiv.classList.add('has-event', presetEvent.type);
            dayDiv.style.backgroundColor = EVENT_COLORS[presetEvent.type];
        }
        
        // Check for user events
        const userEvent = userEvents[dateStr];
        if (userEvent) {
            dayDiv.classList.add('has-event', userEvent.type);
            dayDiv.style.backgroundColor = EVENT_COLORS[userEvent.type];
        }
        
        // Add click event
        dayDiv.addEventListener('click', () => openEventModal(dateStr));
        dayDiv.style.cursor = 'pointer';
        
        calendarGrid.appendChild(dayDiv);
    }
    
    monthDiv.appendChild(calendarGrid);
    return monthDiv;
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
    
    // 收集预设事件 (注意：现在使用 events 而不是 preset_events)
    Object.keys(monthData.events).forEach(dateStr => {
        const eventMonth = parseInt(dateStr.split('-')[1]);
        const eventYear = parseInt(dateStr.split('-')[0]);
        if (eventMonth === month && eventYear === currentYear) {
            const event = monthData.events[dateStr];
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
    const existingEvent = userEvents[dateStr] || (monthData && monthData.events[dateStr]);
    
    if (existingEvent) {
        document.getElementById('event-title').value = existingEvent.title || '';
        document.getElementById('event-type').value = existingEvent.type;
        
        // 如果是预设事件，禁用删除按钮
        const deleteBtn = document.getElementById('delete-event');
        if (monthData && monthData.events[dateStr]) {
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
    const promises = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const eventData = {
            date: dateStr,
            title: title,
            event_type: type
        };
        
        // 检查是否已存在事件
        if (userEvents[dateStr]) {
            // 更新现有事件
            promises.push(
                window.calendarAPI.updateEvent(userEvents[dateStr].id, eventData)
                    .then(() => {
                        userEvents[dateStr] = {
                            title: title,
                            type: type,
                            color: EVENT_COLORS[type]
                        };
                    })
            );
        } else {
            // 创建新事件
            promises.push(
                window.calendarAPI.createEvent(eventData)
                    .then(response => {
                        userEvents[dateStr] = {
                            id: response.id,
                            title: title,
                            type: type,
                            color: EVENT_COLORS[type]
                        };
                    })
            );
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    Promise.all(promises)
        .then(() => {
            renderYearCalendar();
            updateAllEventsLists();
            closeEventModal();
        })
        .catch(error => {
            console.error('保存事件失败:', error);
            alert('保存失败，请检查网络连接');
        });
}

// 删除事件
function deleteEvent() {
    if (selectedDate && userEvents[selectedDate]) {
        const eventId = userEvents[selectedDate].id;
        
        window.calendarAPI.deleteEvent(eventId)
            .then(() => {
                delete userEvents[selectedDate];
                renderYearCalendar();
                updateAllEventsLists();
                closeEventModal();
            })
            .catch(error => {
                console.error('删除事件失败:', error);
                alert('删除失败，请检查网络连接');
            });
    }
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