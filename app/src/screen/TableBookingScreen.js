import React, { useState, useEffect } from 'react'; // Đảm bảo đã import useEffect
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const TableBookingScreen = ({ route, navigation }) => {
  const { date, time, people } = route.params || {};
  
  const [tables, setTables] = useState([
    { id: 1, name: 'Bàn 1', capacity: 2, status: 'available' },
    { id: 2, name: 'Bàn 2', capacity: 4, status: 'occupied' },
    { id: 3, name: 'Bàn 3', capacity: 6, status: 'available' },
    { id: 4, name: 'Bàn 4', capacity: 2, status: 'reserved' },
    { id: 5, name: 'Bàn 5', capacity: 8, status: 'available' },
    { id: 6, name: 'Bàn 6', capacity: 4, status: 'available' },
    { id: 7, name: 'Bàn 7', capacity: 2, status: 'occupied' },
    { id: 8, name: 'Bàn 8', capacity: 4, status: 'available' },
  ]);
  
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#28a745';
      case 'occupied': return '#dc3545';
      case 'reserved': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Trống';
      case 'occupied': return 'Có khách';
      case 'reserved': return 'Đã đặt';
      default: return 'Không xác định';
    }
  };

  const handleTablePress = (table) => {
    if (table.status === 'available') {
      setSelectedTable(table);
      setShowModal(true);
    } else {
      Alert.alert('Thông báo', `Bàn ${table.name} hiện không khả dụng`);
    }
  };

  const confirmBooking = () => {
    if (!customerName.trim() || !phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    // Update table status
    const updatedTables = tables.map(table => 
      table.id === selectedTable.id ? { ...table, status: 'reserved' } : table
    );
    setTables(updatedTables);
    
    Alert.alert(
      'Thành công',
      `Đã đặt ${selectedTable.name} thành công!\nNgày: ${date}\nGiờ: ${time}\nSố người: ${people}`,
      [{ text: 'OK', onPress: () => {
        setShowModal(false);
        navigation.goBack();
      }}]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn bàn</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.infoText}>{date || 'Chưa chọn'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.infoText}>{time || 'Chưa chọn'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.infoText}>{people || '0'} người</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.tableGrid}>
        {tables.map((table) => (
          <TouchableOpacity
            key={table.id}
            style={[
              styles.tableCard,
              { borderColor: getStatusColor(table.status) }
            ]}
            onPress={() => handleTablePress(table)}
            disabled={table.status !== 'available'}
          >
            <View style={styles.tableHeader}>
              <Text style={styles.tableName}>{table.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(table.status) }]}>
                <Text style={styles.statusText}>{getStatusText(table.status)}</Text>
              </View>
            </View>
            <View style={styles.tableInfo}>
              <View style={styles.tableDetail}>
                <Ionicons name="people" size={14} color="#666" />
                <Text style={styles.detailText}>{table.capacity} người</Text>
              </View>
              {table.status === 'available' && (
                <View style={styles.availableIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                  <Text style={styles.availableText}>Có thể đặt</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận đặt bàn</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tableInfoModal}>
              <Text style={styles.selectedTableName}>Bàn {selectedTable?.name}</Text>
              <Text style={styles.selectedTableInfo}>
                {selectedTable?.capacity} người • Ngày {date} • {time}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Họ tên"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmBooking}
              >
                <Text style={styles.confirmButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tableGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tableCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  tableInfo: {
    marginTop: 5,
  },
  tableDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  availableIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  availableText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#28a745',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tableInfoModal: {
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  selectedTableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  selectedTableInfo: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#FF6B35',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TableBookingScreen;