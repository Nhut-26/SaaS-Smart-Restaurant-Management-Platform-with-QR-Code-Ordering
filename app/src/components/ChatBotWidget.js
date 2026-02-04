import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
    Dimensions, Image, KeyboardAvoidingView, Platform, Modal,
    ActivityIndicator, ScrollView, Animated, PanResponder, Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useChatBot } from '../context/ChatBotContext';

const { width, height } = Dimensions.get('window');

const COLORS = {
    primary: '#FF6B35',
    primaryLight: '#FFF0EC',
    white: '#FFFFFF',
    textDark: '#2D3436',
    textGray: '#636E72',
    userBubble: '#FF6B35',
    botBubble: '#FFFFFF',
    background: '#F5F6FA'
};

// --- TIN NHẮN NHANH (QUICK ACTIONS) ---
const QUICK_ACTIONS = [
    { id: '1', label: '🍽️ Gợi ý quán', query: 'Gợi ý quán ngon gần đây' },
    { id: '2', label: '📅 Đặt bàn', query: 'Tôi muốn đặt bàn' },
    { id: '3', label: '🥗 Món ăn ngon', query: 'Gợi ý món ăn ngon hot nhất' },
];

// --- COMPONENT: FORM ĐẶT BÀN ---
const BookingForm = ({ preFill, onSubmit }) => {
    const [info, setInfo] = useState({
        date: preFill?.date || '',
        time: preFill?.time || '',
        people: preFill?.people ? String(preFill.people) : '',
        phone: preFill?.phone || '',
        name: preFill?.name || ''
    });
    const [sent, setSent] = useState(false);

    const handleSubmit = () => {
        if (!info.date || !info.time || !info.people || !info.phone) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập đủ: Ngày, Giờ, Khách, SĐT");
            return;
        }
        setSent(true);
        onSubmit(`Đặt bàn ngày ${info.date} lúc ${info.time}, ${info.people} người. Tên: ${info.name}, SĐT: ${info.phone}`);
    };

    if (sent) return (
        <View style={[styles.card, { alignItems: 'center', padding: 20 }]}>
            <Ionicons name="checkmark-circle" size={40} color="green" />
            <Text style={{ color: 'green', fontWeight: 'bold', marginTop: 5 }}>Đã gửi yêu cầu!</Text>
        </View>
    );

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Phiếu Đặt Bàn</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="DD-MM-YYYY" value={info.date} onChangeText={t => setInfo({ ...info, date: t })} />
                <TextInput style={[styles.inputSmall, { width: 80 }]} placeholder="HH:MM" value={info.time} onChangeText={t => setInfo({ ...info, time: t })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TextInput style={[styles.inputSmall, { width: 80 }]} placeholder="Số khách" value={info.people} onChangeText={t => setInfo({ ...info, people: t })} />
                <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="SĐT" value={info.phone} onChangeText={t => setInfo({ ...info, phone: t })} />
            </View>
            <TextInput style={[styles.inputSmall, { marginTop: 10 }]} placeholder="Tên của bạn" value={info.name} onChangeText={t => setInfo({ ...info, name: t })} />
            <TouchableOpacity style={styles.btnFull} onPress={handleSubmit}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Gửi Yêu Cầu</Text>
            </TouchableOpacity>
        </View>
    );
};

// --- COMPONENT: LIST QUÁN ---
const RestaurantList = ({ data, onSelect }) => {
    if (!data || data.length === 0) return null;

    return (
        <View style={{ marginTop: 10, height: 240 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10 }}>
                {data.map((item, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.resCard}
                        activeOpacity={0.9}
                        // Khi click, gửi tin nhắn: "Chọn quán [Tên Quán]" (để flow đặt bàn chạy tiếp)
                        onPress={() => onSelect(`Xem quán ${item.restaurant_name || item.name}`)}
                    >
                        {/* 1. ẢNH MÓN ĂN (HOẶC ẢNH QUÁN) */}
                        <Image
                            source={{
                                uri: (item.image_url)

                            }}
                            style={styles.resImg}
                            resizeMode="cover"
                        />

                        <View style={{ padding: 10 }}>
                            {/* 2. TÊN CHÍNH (Tên món ăn) */}
                            <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#2D3436' }} numberOfLines={1}>
                                {item.name}
                            </Text>

                            {/* 3. TÊN PHỤ (Nếu là tìm món -> Hiện "Tại: Tên Quán") */}
                            {item.is_dish ? (
                                <Text style={{ fontSize: 12, color: '#FF6B35', fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                                    🏪 Tại: {item.restaurant_name}
                                </Text>
                            ) : (
                                // Nếu tìm quán bình thường -> Hiện địa chỉ
                                <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }} numberOfLines={1}>
                                    📍 {item.address || "Đang cập nhật"}
                                </Text>
                            )}

                            {/* 4. GIÁ & ĐÁNH GIÁ */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                                <View style={{ backgroundColor: '#FFF0EC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 11, color: '#FF6B35', fontWeight: 'bold' }}>
                                        {item.price_range || "Menu"}
                                    </Text>
                                </View>
                                {item.rating && (
                                    <Text style={{ fontSize: 11, color: '#888' }}>⭐ {item.rating}</Text>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

// --- COMPONENT: CHỌN BÀN ---
const TableSelector = ({ data, onSelect }) => (
    <View style={styles.card}>
        <Text style={styles.cardTitle}>🪑 Chọn bàn trống:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {data.map((t, i) => (
                <TouchableOpacity key={i} style={styles.chip} onPress={() => onSelect(`Tôi chọn ${t}`)}>
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>{t}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

// --- MAIN WIDGET ---
const ChatBotWidget = () => {
    const { messages, handleSendMessage, isLoading, modalVisible, setModalVisible } = useChatBot();
    const [text, setText] = useState('');
    const listRef = useRef(null);

    // KÉO THẢ
    const pan = useRef(new Animated.ValueXY({ x: width - 80, y: height - 150 })).current;
    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { pan.setOffset({ x: pan.x._value, y: pan.y._value }); pan.setValue({ x: 0, y: 0 }); },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (e, gs) => {
            pan.flattenOffset();
            if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) setModalVisible(true); // Click detection
        }
    })).current;

    useEffect(() => {
        if (modalVisible && listRef.current) setTimeout(() => listRef.current.scrollToEnd({ animated: true }), 200);
    }, [messages, modalVisible]);

    const renderItem = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={{ marginVertical: 8, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                    <Text style={{ color: isUser ? 'white' : COLORS.textDark }}>{item.text}</Text>
                </View>
                {/* RENDER UI THEO CUSTOM_TYPE TỪ SERVER */}
                {!isUser && item.custom_type === 'booking_form' && <BookingForm preFill={item.pre_fill} onSubmit={handleSendMessage} />}
                {!isUser && (item.custom_type === 'restaurant_suggest' || item.custom_type === 'menu_suggest') &&
                    <RestaurantList data={item.data} onSelect={handleSendMessage} />
                }
                {!isUser && item.custom_type === 'table_selection' && <TableSelector data={item.data} onSelect={handleSendMessage} />}
            </View>
        );
    };

    if (!modalVisible) return (
        <Animated.View style={[styles.floatBtn, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} {...panResponder.panHandlers}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4712/4712009.png' }} style={{ width: 40, height: 40 }} />
        </Animated.View>
    );

    return (
        <Modal animationType="slide" transparent={true} visible={modalVisible}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Trợ Lý FoodAI</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
                    </View>

                    {/* Chat List */}
                    <FlatList ref={listRef} data={messages} renderItem={renderItem} keyExtractor={(_, i) => i.toString()} style={{ padding: 10 }} />

                    {isLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 10 }} />}

                    {/* Quick Actions */}
                    <View style={{ height: 60 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10 }}>
                            {QUICK_ACTIONS.map(a => (
                                <TouchableOpacity key={a.id} style={styles.quickChip} onPress={() => handleSendMessage(a.query)}>
                                    <Text style={{ fontSize: 15, fontWeight: '600' }}>{a.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Input */}
                    <View style={styles.inputArea}>
                        <TextInput style={styles.input} placeholder="Nhập tin nhắn..." value={text} onChangeText={setText} onSubmitEditing={() => { handleSendMessage(text); setText('') }} />
                        <TouchableOpacity style={styles.sendBtn} onPress={() => { handleSendMessage(text); setText('') }}>
                            <Ionicons name="send" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    floatBtn: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, zIndex: 9999 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { height: '85%', backgroundColor: '#F5F6FA', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    header: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#EEE' },
    bubble: { padding: 12, borderRadius: 16, maxWidth: '80%' },
    bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 0 },
    bubbleBot: { backgroundColor: 'white', borderTopLeftRadius: 0, borderWidth: 1, borderColor: '#EEE' },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginTop: 10, width: width * 0.75, borderWidth: 1, borderColor: '#EEE' },
    cardTitle: { fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
    inputSmall: { backgroundColor: '#F9F9F9', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
    btnFull: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    resCard: { width: 200, backgroundColor: 'white', borderRadius: 12, marginRight: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#EEE' },
    resImg: { width: '100%', height: 110, resizeMode: 'cover', borderRadius: 8, },
    chip: { backgroundColor: COLORS.primaryLight, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FFDCC9' },
    quickChip: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#DDD' },
    inputArea: { padding: 10, flexDirection: 'row', backgroundColor: 'white', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#F0F2F5', padding: 10, borderRadius: 20, marginRight: 10 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});

export default ChatBotWidget;