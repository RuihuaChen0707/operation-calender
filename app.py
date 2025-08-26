from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
import calendar
import os
from datetime import datetime

app = Flask(__name__)

# 数据库配置
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///calendar.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 数据库模型
class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    event_type = db.Column(db.String(50), default='custom')
    color = db.Column(db.String(7), default='#5B9BD5')
    description = db.Column(db.Text, default='')
    
    def __repr__(self):
        return f'<Event {self.title} on {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'date': self.date.isoformat(),
            'type': self.event_type,
            'color': self.color,
            'description': self.description
        }

# 预设的沙特阿拉伯假期数据
PRESET_EVENTS = {
    '2025-02-22': {'title': 'Founding Day (建国日)', 'type': 'public', 'color': '#7030A0'},
    '2025-09-23': {'title': 'Saudi National Day (沙特国庆日)', 'type': 'public', 'color': '#7030A0'},
    '2025-03-30': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-03-31': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-06-06': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-06-07': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2025-06-08': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-02-22': {'title': 'Founding Day (建国日)', 'type': 'public', 'color': '#7030A0'},
    '2026-09-23': {'title': 'Saudi National Day (沙特国庆日)', 'type': 'public', 'color': '#7030A0'},
    '2026-03-20': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-03-21': {'title': 'Eid al-Fitr (开斋节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-05-27': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-05-28': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
    '2026-05-29': {'title': 'Eid al-Adha (宰牲节)', 'type': 'islamic', 'color': '#00B050'},
}

EVENT_COLORS = {
    'school': '#5B9BD5',
    'public': '#7030A0',
    'islamic': '#00B050',
    'christian': '#FF0000',
    'back_to_school': '#FFFF00',
    'custom': '#5B9BD5'
}

# 初始化数据库的标志
_db_initialized = False

def init_database():
    """初始化数据库表并插入预设事件"""
    global _db_initialized
    if _db_initialized:
        return
    
    with app.app_context():
        db.create_all()
        
        # 插入预设事件
        for date_str, event_data in PRESET_EVENTS.items():
            event_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            existing_event = Event.query.filter_by(date=event_date, title=event_data['title']).first()
            
            if not existing_event:
                new_event = Event(
                    title=event_data['title'],
                    date=event_date,
                    event_type=event_data['type'],
                    color=event_data['color']
                )
                db.session.add(new_event)
        
        db.session.commit()
        _db_initialized = True

@app.route('/')
def index():
    init_database()  # 确保数据库已初始化
    return render_template('index.html')

@app.route('/api/calendar/<int:year>/<int:month>')
def get_calendar_data(year, month):
    """获取指定年月的日历数据"""
    init_database()  # 确保数据库已初始化
    try:
        if year < 2025 or year > 2035 or month < 1 or month > 12:
            return jsonify({'error': 'Invalid year or month'}), 400
        
        cal = calendar.monthcalendar(year, month)
        month_name = calendar.month_name[month]
        
        # 获取该月的所有事件
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date()
        else:
            end_date = datetime(year, month + 1, 1).date()
        
        events = Event.query.filter(
            Event.date >= start_date,
            Event.date < end_date
        ).all()
        
        # 转换事件为字典格式
        events_dict = {}
        for event in events:
            date_key = event.date.isoformat()
            if date_key not in events_dict:
                events_dict[date_key] = []
            events_dict[date_key].append(event.to_dict())
        
        return jsonify({
            'year': year,
            'month': month,
            'month_name': month_name,
            'calendar': cal,
            'events': events_dict,
            'event_colors': EVENT_COLORS
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events', methods=['GET', 'POST'])
def handle_events():
    init_database()  # 确保数据库已初始化
    if request.method == 'GET':
        try:
            events = Event.query.all()
            events_dict = {}
            
            for event in events:
                date_key = event.date.isoformat()
                if date_key not in events_dict:
                    events_dict[date_key] = []
                events_dict[date_key].append(event.to_dict())
            
            return jsonify(events_dict)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            
            if not data.get('title') or not data.get('date'):
                return jsonify({'error': 'Title and date are required'}), 400
            
            event_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            
            new_event = Event(
                title=data['title'],
                date=event_date,
                event_type=data.get('type', 'custom'),
                color=data.get('color', '#5B9BD5'),
                description=data.get('description', '')
            )
            
            db.session.add(new_event)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Event created successfully',
                'event': new_event.to_dict()
            })
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@app.route('/api/events/<int:event_id>', methods=['PUT', 'DELETE'])
def handle_event(event_id):
    init_database()  # 确保数据库已初始化
    if request.method == 'PUT':
        try:
            event = Event.query.get_or_404(event_id)
            data = request.get_json()
            
            if 'title' in data:
                event.title = data['title']
            if 'date' in data:
                event.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            if 'type' in data:
                event.event_type = data['type']
            if 'color' in data:
                event.color = data['color']
            if 'description' in data:
                event.description = data['description']
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Event updated successfully',
                'event': event.to_dict()
            })
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            event = Event.query.get_or_404(event_id)
            db.session.delete(event)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Event deleted successfully'
            })
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@app.route('/api/years')
def get_available_years():
    years = list(range(2025, 2036))
    return jsonify(years)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)