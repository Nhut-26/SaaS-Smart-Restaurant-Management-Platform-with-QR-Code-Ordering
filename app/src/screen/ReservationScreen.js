import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

const ReservationScreen = ({ navigation }) => {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [people, setPeople] = useState(2);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleReservation = () => {
    Alert.alert(
      'Xác nhận đặt bàn',
      `Bạn muốn đặt bàn cho ${people} người vào ${date.toLocaleDateString('vi-VN')} lúc ${time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đặt bàn', 
          onPress: () => {
            navigation.navigate('TableBooking', {
              date: date.toISOString().split('T')[0],
              time: time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              people
            });
          }
        },
      ]
    );
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đặt bàn</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn ngày</Text>
          <TouchableOpacity 
            style={styles.inputButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.inputText}>
              {date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn giờ</Text>
          <TouchableOpacity 
            style={styles.inputButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.inputText}>
              {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}
        </View>

        {/* People Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Số người</Text>
          <View style={styles.peopleSelector}>
            <TouchableOpacity 
              style={styles.peopleButton}
              onPress={() => setPeople(Math.max(1, people - 1))}
            >
              <Ionicons name="remove" size={20} color="#FF6B35" />
            </TouchableOpacity>
            
            <View style={styles.peopleDisplay}>
              <Text style={styles.peopleCount}>{people}</Text>
              <Text style={styles.peopleText}>người</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.peopleButton}
              onPress={() => setPeople(people + 1)}
            >
              <Ionicons name="add" size={20} color="#FF6B35" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#FF6B35" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Lưu ý</Text>
            <Text style={styles.infoText}>
              • Đặt bàn trước ít nhất 1 giờ
              • Hủy đặt trước 2 giờ để không bị phí
              • Đến trễ 15 phút sẽ hủy đặt tự động
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.reserveButton}
          onPress={handleReservation}
        >
          <Text style={styles.reserveButtonText}>Tiếp tục chọn bàn</Text>
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  peopleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  peopleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peopleDisplay: {
    alignItems: 'center',
  },
  peopleCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  peopleText: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  reserveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  reserveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReservationScreen;