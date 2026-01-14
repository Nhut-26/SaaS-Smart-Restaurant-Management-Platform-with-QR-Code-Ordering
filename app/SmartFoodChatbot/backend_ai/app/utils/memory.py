import time

class ChatMemory:
    def __init__(self, ttl=3600): # TTL = 3600 giây (1 giờ)
        self.sessions = {}
        self.ttl = ttl

    def save_context(self, user_id, user_msg, ai_reply):
        if user_id not in self.sessions:
            self.sessions[user_id] = []
        
        entry = {
            "timestamp": time.time(),
            "chat": f"User: {user_msg}\nAI: {ai_reply}"
        }
        self.sessions[user_id].append(entry)
        self.cleanup(user_id)

    def get_history(self, user_id):
        self.cleanup(user_id)
        if user_id in self.sessions:
            return "\n".join([item["chat"] for item in self.sessions[user_id]])
        return ""

    def cleanup(self, user_id):
        """Xóa các tin nhắn cũ hơn 1 giờ"""
        if user_id in self.sessions:
            now = time.time()
            self.sessions[user_id] = [
                m for m in self.sessions[user_id] if now - m["timestamp"] < self.ttl
            ]

memory_store = ChatMemory()