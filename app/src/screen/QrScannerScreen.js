import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const QrScannerScreen = ({ navigation }) => {
  const [scanned, setScanned] = useState(false);
  const { setGuestSession } = useAuth();

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    try {
      const qrData = JSON.parse(data);
      Alert.alert(
        'Quét mã thành công',
        `Nhà hàng: ${qrData.restaurantName}\nBàn: ${qrData.tableId}`,
        [
          {
            text: 'Quét lại',
            onPress: () => setScanned(false),
          },
          {
            text: 'Vào menu',
            onPress: () => {
              const sessionId = `guest_${Date.now()}`;
              setGuestSession(sessionId, qrData.restaurantId, qrData.tableId);
              navigation.navigate('GuestFlow');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Lỗi',
        'Mã QR không hợp lệ',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  const simulateQRScan = () => {
    handleBarCodeScanned({ 
      type: 'QR_CODE', 
      data: JSON.stringify({
        restaurantId: 'rest_001',
        tableId: 'table_005',
        restaurantName: 'Nhà hàng Mẫu'
      })
    });
  };

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 22 }} />
        <Text style={styles.headerTitle}>Quét QR Menu</Text>
        <TouchableOpacity onPress={goToLogin}>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraPlaceholder}>
        <View style={styles.scannerFrame}>
          <Ionicons name="qr-code" size={120} color="#FF6B35" />
          <Text style={styles.scannerText}>
            Đưa mã QR vào khung để quét
          </Text>
        </View>
        
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            📍 Hướng dẫn:
          </Text>
          <Text style={styles.instructionText}>
            1. Tìm mã QR trên bàn
          </Text>
          <Text style={styles.instructionText}>
            2. Đưa camera vào mã QR
          </Text>
          <Text style={styles.instructionText}>
            3. Chờ hệ thống nhận diện
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
        >
          <Ionicons name="flashlight" size={30} color="#FF6B35" />
          <Text style={styles.controlText}>Đèn flash</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.scanButton]}
          onPress={simulateQRScan}
        >
          <Ionicons name="scan" size={30} color="white" />
          <Text style={[styles.controlText, { color: 'white' }]}>Quét thử</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={goToLogin}
        >
          <Ionicons name="person" size={30} color="#FF6B35" />
          <Text style={styles.controlText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loginText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  scannerText: {
    marginTop: 20,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  instructions: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '80%',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  simulateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  loginButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
  },
  controlButton: {
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#FF6B35',
    padding: 10,
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
  },
});

export default QrScannerScreen;