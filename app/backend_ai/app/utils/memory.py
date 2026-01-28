# FILE: backend_ai/app/utils/memory.py
import time
from collections import defaultdict

class ChatMemory:
    def __init__(self):
        # Lưu trữ trạng thái phiên làm việc: {user_id: {key: value}}
        self.states = defaultdict(dict)
        # Lưu trữ lịch sử chat: {user_id: [{"role": "user", "content": ...}]}
        self.histories = defaultdict(list)
        # Timeout cho session (ví dụ: 30 phút không chat sẽ xóa bộ nhớ đệm)
        self.last_interaction = defaultdict(float)

    def _update_timestamp(self, user_id):
        self.last_interaction[str(user_id)] = time.time()

    def update_state(self, user_id, key, value):
        """Lưu trữ trạng thái (Ví dụ: đang chọn bàn, số người, tên quán...)"""
        self.states[str(user_id)][key] = value
        self._update_timestamp(user_id)

    def get_state(self, user_id, key):
        """Lấy giá trị trạng thái"""
        self._update_timestamp(user_id)
        return self.states[str(user_id)].get(key)

    def clear_state(self, user_id):
        """Xóa trạng thái khi đã hoàn thành đơn"""
        if str(user_id) in self.states:
            del self.states[str(user_id)]
        self._update_timestamp(user_id)

    def add_chat_history(self, user_id, user_msg, bot_msg):
        """Lưu lịch sử chat để AI nhớ ngữ cảnh"""
        self.histories[str(user_id)].append({"role": "user", "content": user_msg})
        self.histories[str(user_id)].append({"role": "assistant", "content": bot_msg})
        
        # Giới hạn lịch sử: Chỉ nhớ 20 câu gần nhất để tiết kiệm token
        if len(self.histories[str(user_id)]) > 20:
             self.histories[str(user_id)] = self.histories[str(user_id)][-20:]
        
        self._update_timestamp(user_id)

    def get_chat_history_str(self, user_id):
        """Chuyển lịch sử thành chuỗi văn bản cho AI đọc"""
        history = self.histories[str(user_id)]
        return "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history])

# Khởi tạo instance duy nhất (Singleton) để dùng chung cho toàn bộ App
memory = ChatMemory()