from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
import calendar
import json

app = Flask(__name__)

# 预设的沙特阿拉伯假期数据（双语版本）
PRESET_EVENTS = {
    # 2025年
    '2025-02-22': {'title': 'Founding Day (建国日)', 'type': 'public', 'color': '#7030A0'},
    '2025-09-23': {'title': 'Saudi National Day (沙特国庆日)', 'type': 'public', 'color': '#7030A0'},
    '2025-03-30': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-03-31': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-06-06': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-06-07': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-06-08': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    
    # 2026年
    '2026-02-22': {'title': 'Founding Day (建国日)', 'type': 'public', 'color': '#7030A0'},
    '2026-09-23': {'title': 'Saudi National Day (沙特国庆日)', 'type': 'public', 'color': '#7030A0'},
    '2026-03-20': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-03-21': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-05-27': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-05-28': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-05-29': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
}

# 事件类型颜色映射
EVENT_COLORS = {
    'school': '#5B9BD5',      # 学校假期 - 蓝色
    'public': '#7030A0',      # 公共假期 - 紫色
    'islamic': '#00B050',     # 伊斯兰假期 - 绿色
    'christian': '#FF0000',   # 基督教假期 - 红色
    'back_to_school': '#FFFF00'  # 返校期 - 黄色
}

@app.route('/')
def index():
    """主页路由"""
    return render_template('index.html')

@app.route('/api/calendar/<int:year>/<int:month>')
def get_calendar_data(year, month):
    """获取指定年月的日历数据"""
    try:
        # 验证年份范围
        if year < 2025 or year > 2035:
            return jsonify({'error': '年份必须在2025-2035之间'}), 400
        
        # 验证月份范围
        if month < 1 or month > 12:
            return jsonify({'error': '月份必须在1-12之间'}), 400
        
        # 获取月历数据
        cal = calendar.monthcalendar(year, month)
        month_name = calendar.month_name[month]
        
        # 构建日历数据
        calendar_data = {
            'year': year,
            'month': month,
            'month_name': month_name,
            'calendar': cal,
            'preset_events': PRESET_EVENTS,
            'event_colors': EVENT_COLORS
        }
        
        return jsonify(calendar_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events', methods=['GET', 'POST', 'DELETE'])
def manage_events():
    """事件管理API"""
    if request.method == 'GET':
        # 获取所有预设事件
        return jsonify(PRESET_EVENTS)
    
    elif request.method == 'POST':
        # 添加或更新事件（这里返回成功，实际存储由前端localStorage处理）
        data = request.get_json()
        return jsonify({'success': True, 'message': '事件已保存'})
    
    elif request.method == 'DELETE':
        # 删除事件（这里返回成功，实际删除由前端localStorage处理）
        return jsonify({'success': True, 'message': '事件已删除'})

@app.route('/api/years')
def get_available_years():
    """获取可用年份列表"""
    years = list(range(2025, 2036))  # 2025-2035
    return jsonify(years)

# 将底部部分替换为：
if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)