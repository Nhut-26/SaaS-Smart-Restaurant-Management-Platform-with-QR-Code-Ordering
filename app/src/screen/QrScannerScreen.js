import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';

const QrScannerScreen = ({ navigation }) => {
  const { user, addRestaurantVisit } = useAuth();
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };

    lockOrientation();

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        if (permission) {
          if (!permission.granted) {
            await requestPermission();
          }
          setHasPermission(permission.granted);
        }
      } catch (error) {
        console.error('Lỗi khi xin quyền camera:', error);
        setHasPermission(false);
      }
    };

    getCameraPermission();
  }, [permission]);

  const handleBarCodeScanned = (scanningResult) => {
    if (!scanned) {
      setScanned(true);
      setIsCameraActive(false);

      try {
        const qrData = JSON.parse(scanningResult.data);

        Alert.alert(
          'Quét mã thành công',
          `Nhà hàng: ${qrData.restaurantName}\nBàn: ${qrData.tableId}`,
          [
            {
              text: 'Quét lại',
              onPress: () => {
                setScanned(false);
                setIsCameraActive(true);
              },
            },
            {
              text: 'Vào menu',
              onPress: () => {
                const restaurantInfo = {
                  id: qrData.restaurantId,
                  name: qrData.restaurantName,
                  tableId: qrData.tableId,
                  scannedAt: new Date().toISOString()
                };

                addRestaurantVisit(restaurantInfo);

                navigation.navigate('Menu', {
                  restaurant: {
                    id: qrData.restaurantId,
                    name: qrData.restaurantName,
                    category: qrData.category || 'default',
                    type: qrData.restaurantType || 'Nhà hàng',
                    tableId: qrData.tableId
                  }
                });
              },
            },
          ]
        );
      } catch (error) {
        Alert.alert(
          'Lỗi',
          'Mã QR không hợp lệ',
          [{
            text: 'OK',
            onPress: () => {
              setScanned(false);
              setIsCameraActive(true);
            }
          }]
        );
      }
    }
  };

  const simulateQRScan = () => {
    handleBarCodeScanned({
      data: JSON.stringify({
        restaurantId: 'rest_001',
        tableId: 'table_005',
        restaurantName: 'Nhà Hàng Hải Sản Biển Đông',
        restaurantType: 'Hải sản',
        category: 'seafood'
      })
    });
  };

  const goToRestaurants = () => {
    navigation.navigate('MainTabs', { screen: 'RestaurantTab' });
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const renderScannerOverlay = () => (
    <View style={styles.scannerOverlay}>
      <View style={styles.scannerFrame}>
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
      </View>

      <View style={styles.cameraControls}>
        <TouchableOpacity
          style={styles.cameraControlButton}
          onPress={toggleCameraFacing}
        >
          <Ionicons name="camera-reverse" size={30} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cameraControlButton}
          onPress={() => setIsCameraActive(false)}
        >
          <Ionicons name="pause" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCamera = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.cameraText}>Đang kiểm tra quyền camera...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera" size={80} color="#FF6B35" />
          <Text style={styles.cameraText}>Không có quyền truy cập camera</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Cấp quyền</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!isCameraActive) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="qr-code" size={120} color="#FF6B35" />
          <Text style={styles.cameraText}>Camera tạm dừng</Text>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() => {
              setScanned(false);
              setIsCameraActive(true);
            }}
          >
            <Text style={styles.resumeButtonText}>Tiếp tục quét</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        {renderScannerOverlay()}
      </View>
    );
  };

  const ActivityIndicator = require('react-native').ActivityIndicator;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét QR Nhà Hàng</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
        >
          <Ionicons name="person-circle" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <Ionicons name="person-circle" size={40} color="#FF6B35" />
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user?.name || 'Khách hàng'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>
      </View>

      {renderCamera()}

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>📍 Hướng dẫn:</Text>
        <Text style={styles.instructionText}>
          1. Tìm mã QR trên bàn nhà hàng
        </Text>
        <Text style={styles.instructionText}>
          2. Đưa camera vào mã QR
        </Text>
        <Text style={styles.instructionText}>
          3. Chờ hệ thống nhận diện
        </Text>
        <Text style={styles.instructionText}>
          4. Truy cập menu và đặt món
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.restaurantButton]}
          onPress={goToRestaurants}
        >
          <Ionicons name="restaurant" size={24} color="#FF6B35" />
          <Text style={styles.controlText}>Tìm nhà hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.scanButton]}
          onPress={simulateQRScan}
        >
          <Ionicons name="scan" size={24} color="white" />
          <Text style={[styles.controlText, { color: 'white' }]}>Quét thử</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.historyButton]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'OrderTab' })}
        >
          <Ionicons name="time" size={24} color="#FF6B35" />
          <Text style={styles.controlText}>Lịch sử</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#4ECDC4" />
        <Text style={styles.infoText}>
          Quét mã QR để truy cập menu nhà hàng, đặt món và thanh toán dễ dàng
        </Text>
      </View>

      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => Alert.alert('Trợ giúp', 'Vui lòng liên hệ hotline: 1800 1234')}
      >
        <Ionicons name="help-circle" size={20} color="#666" />
        <Text style={styles.helpText}>Cần trợ giúp?</Text>
      </TouchableOpacity>
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
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileButton: {
    padding: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cameraContainer: {
    height: 400, 
    margin: 15,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FF6B35',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FF6B35',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FF6B35',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FF6B35',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cameraControlButton: {
    marginHorizontal: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
  },
  cameraPlaceholder: {
    height: 400,
    margin: 15,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    marginTop: 20,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  permissionButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumeButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
  },
  resumeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  restaurantButton: {
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
  },
  historyButton: {
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 20,
  },
  controlText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
});

export default QrScannerScreen;
