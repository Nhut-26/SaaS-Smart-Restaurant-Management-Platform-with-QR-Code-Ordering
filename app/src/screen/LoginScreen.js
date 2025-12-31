import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      console.log('Bắt đầu đăng nhập...');
      
      // Giả lập login thành công
      const userData = {
        id: 1,
        name: username === 'admin' ? 'Quản trị viên' : 'Nguyễn Văn A',
        email: username.includes('@') ? username : `${username}@gmail.com`,
        phone: '0987654321',
        membership: 'VIP',
        totalSpent: 12500000
      };
      
      console.log('Dữ liệu user:', userData);
      
      // Gọi hàm login từ AuthContext
      const result = await login(userData);
      
      console.log('Kết quả login:', result);
      
      if (result && result.success) {
        console.log('Đăng nhập thành công, điều hướng...');
        // Điều hướng đến CustomerFlow
        navigation.reset({
          index: 0,
          routes: [{ name: 'CustomerFlow' }],
        });
      } else {
        Alert.alert('Đăng nhập thất bại', 'Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      Alert.alert('Đăng nhập thất bại', 'Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Nút chuyển sang Guest (không cần đăng nhập)
  const goToGuestMode = () => {
    navigation.navigate('Welcome');
  };

  // Nút quét QR
  const goToQrScanner = () => {
    navigation.navigate('QrScanner');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.pexels.com/photos/31216391/pexels-photo-31216391.jpeg?cs=srgb&dl=pexels-mahmoudramadan-31216391.jpg&fm=jpg' }}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.loginBox}>
              <Text style={styles.title}>Đăng nhập</Text>
              <Text style={styles.subtitle}>Chào mừng bạn đến với Nhà Hàng Thông Minh</Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tên đăng nhập hoặc email"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.registerLink}>
                <Text style={styles.registerText}>
                  Bạn chưa có tài khoản?{' '}
                  <Text 
                    style={styles.registerLinkText}
                    onPress={() => navigation.navigate('Register')}
                  >
                    Đăng ký
                  </Text>
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => Alert.alert('Thông báo', 'Liên hệ quản lý để lấy lại mật khẩu')}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              {/* Nút chuyển sang Guest Mode */}
              <TouchableOpacity 
                style={styles.guestButton}
                onPress={goToGuestMode}
              >
                <Ionicons name="restaurant-outline" size={20} color="#FF6B35" />
                <Text style={styles.guestButtonText}>Vào với tư cách khách</Text>
              </TouchableOpacity>

              {/* Nút quét QR */}
              <TouchableOpacity 
                style={styles.qrButton}
                onPress={goToQrScanner}
              >
                <Ionicons name="qr-code-outline" size={20} color="#666" />
                <Text style={styles.qrButtonText}>Quét mã QR trên bàn</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: '#666',
  },
  registerLinkText: {
    color: '#ff6b35',
    fontWeight: '600',
  },
  forgotPassword: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: 14,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FFF0EC',
    borderRadius: 8,
  },
  guestButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  qrButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default LoginScreen;