import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const ReservationScreen = ({ navigation, route }) => {
  const { restaurant } = route.params || {
    id: '1',
    name: 'Nhà Hàng Mẫu',
    type: 'Mẫu'
  };

  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [time, setTime] = useState('18:00');
  const [people, setPeople] = useState('2');
  const [specialRequest, setSpecialRequest] = useState('');

  const parseTime = (t) => {
    if (!t || typeof t !== 'string') return null;
    const [h, m] = t.split(':').map(x => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return { h, m };
  };

  const open = parseTime(restaurant.open_time) || { h: 8, m: 0 };
  const close = parseTime(restaurant.close_time) || { h: 22, m: 0 };

  const availableHours = [];
  for (let hh = open.h; hh <= close.h; hh++) {
    availableHours.push(hh);
  }

  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const [selectedHour, setSelectedHour] = useState(open.h);
  const [selectedMinute, setSelectedMinute] = useState(open.m);
  const peopleOptions = ['1', '2', '3', '4', '5', '6', '8', '10+'];

  const getNextDays = (count = 14) => {
    const days = [];
    const base = new Date();
    base.setHours(0,0,0,0);
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const handleContinue = () => {
    if (!people || parseInt(people) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn số người');
      return;
    }

    const hh = (selectedHour || 0).toString().padStart(2, '0');
    const mm = (selectedMinute || 0).toString().padStart(2, '0');
    const selectedTime = `${hh}:${mm}`;

    const bookingDT = new Date(selectedDate);
    bookingDT.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

    const openDT = new Date(selectedDate);
    openDT.setHours(open.h, open.m, 0, 0);
    const closeDT = new Date(selectedDate);
    closeDT.setHours(close.h, close.m, 0, 0);

    if (bookingDT < openDT || bookingDT > closeDT) {
      Alert.alert('Thông báo', 'Vui lòng chọn giờ trong khoảng giờ mở cửa của nhà hàng.');
      return;
    }

    navigation.navigate('TableBooking', {
      restaurant,
      date: selectedDate.toISOString(),
      time: selectedTime,
      people: parseInt(people),
      specialRequest,
    });
  };

  const incrementPeople = () => {
    const current = parseInt(people) || 1;
    setPeople(Math.min(current + 1, 20).toString());
  };

  const decrementPeople = () => {
    const current = parseInt(people) || 2;
    setPeople(Math.max(current - 1, 1).toString());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt bàn</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantCard}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantType}>{restaurant.type}</Text>
          <View style={styles.restaurantDetails}>
            <Text style={styles.detailItem}>
              <Ionicons name="location" size={16} color="#666" /> {restaurant.address || '123 Đường ABC'}
            </Text>
            <Text style={styles.detailItem}>
              <Ionicons name="time" size={16} color="#666" /> {restaurant.openingHours || '08:00 - 22:00'}
            </Text>
            <Text style={styles.detailItem}>
              <Ionicons name="call" size={16} color="#666" /> {restaurant.phone || '(028) 1234 5678'}
            </Text>
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userCard}>
          <Text style={styles.sectionTitle}>Thông tin người đặt</Text>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={40} color="#FF6B35" />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'Khách hàng'}</Text>
              <Text style={styles.userPhone}>{user?.phone || 'Chưa cập nhật số điện thoại'}</Text>
              <TouchableOpacity
                style={styles.updateInfoButton}
                onPress={() => navigation.navigate('ProfileTab')}
              >
                <Text style={styles.updateInfoText}>Cập nhật thông tin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Date Selection (14-day picker) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ngày đặt bàn</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScroll}
          >
            {getNextDays(14).map((d) => {
              const isSelected = d.getDate() === selectedDate.getDate() &&
                d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear();

              const isToday = d.getDate() === new Date().getDate() &&
                d.getMonth() === new Date().getMonth() &&
                d.getFullYear() === new Date().getFullYear();

              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  style={[styles.dateItem, isSelected && styles.dateItemSelected, isToday && styles.dateItemToday]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text style={[styles.dateText, isSelected && styles.dateTextSelected, isToday && styles.dateTextToday]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {d.toLocaleDateString('vi-VN', { weekday: 'short' })}
                  </Text>
                  {isToday && <Text style={styles.todayLabel}>Hôm nay</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Selection: chọn giờ và phút, giới hạn trong giờ mở cửa */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Giờ đặt bàn</Text>

          <Text style={{ marginBottom: 8, color: '#666' }}>
            Mở cửa: {restaurant.open_time || '08:00'} - {restaurant.close_time || '22:00'}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {availableHours.map((hh) => {
                  const label = hh.toString().padStart(2, '0');
                  const isActive = selectedHour === hh;
                  return (
                    <TouchableOpacity
                      key={`h-${hh}`}
                      style={[styles.timeSlot, isActive && styles.timeSlotActive]}
                      onPress={() => setSelectedHour(hh)}
                    >
                      <Text style={[styles.timeSlotText, isActive && styles.timeSlotTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={{ marginHorizontal: 8, fontSize: 18 }}>:</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {minuteOptions.map((mm) => {
                  const label = mm.toString().padStart(2, '0');
                  const isActive = selectedMinute === mm;
                  return (
                    <TouchableOpacity
                      key={`m-${mm}`}
                      style={[styles.timeSlot, isActive && styles.timeSlotActive]}
                      onPress={() => setSelectedMinute(mm)}
                    >
                      <Text style={[styles.timeSlotText, isActive && styles.timeSlotTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* People Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Số người</Text>
          <View style={styles.peopleContainer}>
            <TouchableOpacity
              style={styles.peopleButton}
              onPress={decrementPeople}
            >
              <Ionicons name="remove" size={24} color="#FF6B35" />
            </TouchableOpacity>

            <View style={styles.peopleDisplay}>
              <Text style={styles.peopleCount}>{people}</Text>
              <Text style={styles.peopleLabel}>người</Text>
            </View>

            <TouchableOpacity
              style={styles.peopleButton}
              onPress={incrementPeople}
            >
              <Ionicons name="add" size={24} color="#FF6B35" />
            </TouchableOpacity>
          </View>

          <View style={styles.peopleOptions}>
            {peopleOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.peopleOption,
                  people === option && styles.peopleOptionActive
                ]}
                onPress={() => setPeople(option)}
              >
                <Text style={[
                  styles.peopleOptionText,
                  people === option && styles.peopleOptionTextActive
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Special Requests */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Yêu cầu đặc biệt (tùy chọn)</Text>
          <TextInput
            style={styles.requestInput}
            placeholder="Ví dụ: Bàn cạnh cửa sổ, không gian yên tĩnh..."
            value={specialRequest}
            onChangeText={setSpecialRequest}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Reservation Policy */}
        <View style={styles.policyCard}>
          <Ionicons name="information-circle" size={20} color="#4ECDC4" />
          <Text style={styles.policyText}>
            • Hủy đặt bàn miễn phí trước 2 giờ{'\n'}
            • Đến muộn quá 15 phút, đặt bàn có thể bị hủy{'\n'}
            • Nhà hàng có thể liên hệ để xác nhận đặt bàn
          </Text>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Tiếp tục chọn bàn</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  restaurantType: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 15,
  },
  restaurantDetails: {
    marginTop: 10,
  },
  detailItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  updateInfoButton: {
    alignSelf: 'flex-start',
  },
  updateInfoText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonActive: {
    backgroundColor: '#FFF0EC',
    borderColor: '#FF6B35',
  },
  dateDay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeSlots: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeSlotActive: {
    backgroundColor: '#FFF0EC',
    borderColor: '#FF6B35',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#666',
  },
  timeSlotTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  peopleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  peopleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  peopleDisplay: {
    alignItems: 'center',
    marginHorizontal: 30,
  },
  peopleCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  peopleLabel: {
    fontSize: 14,
    color: '#666',
  },
  peopleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  peopleOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    margin: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  peopleOptionActive: {
    backgroundColor: '#FFF0EC',
    borderColor: '#FF6B35',
  },
  peopleOptionText: {
    fontSize: 14,
    color: '#666',
  },
  peopleOptionTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  dateScroll: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dateItem: {
    width: 78,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateItemSelected: {
    backgroundColor: '#FF6B35',
  },
  dateItemToday: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dateTextSelected: {
    color: 'white',
  },
  dateTextToday: {
    color: '#000000',
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  dayTextSelected: {
    color: 'white',
  },
  todayLabel: {
    fontSize: 10,
    color: '#000000',
    marginTop: 4,
    fontWeight: '500',
  },
  requestInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  policyText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 18,
    borderRadius: 12,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default ReservationScreen;
