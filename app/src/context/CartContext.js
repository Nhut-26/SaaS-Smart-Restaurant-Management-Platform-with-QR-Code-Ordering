import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { userType, sessionId, isGuest } = useAuth();
  const [cart, setCart] = useState({});
  const [itemNotes, setItemNotes] = useState({});

  // Load cart from storage khi component mount
  useEffect(() => {
    loadCartFromStorage();
  }, [userType, sessionId]);

  const loadCartFromStorage = async () => {
    try {
      if (isGuest && sessionId) {
        const storedCart = await AsyncStorage.getItem(`guest_cart_${sessionId}`);
        const storedNotes = await AsyncStorage.getItem(`guest_notes_${sessionId}`);
        
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        }
        if (storedNotes) {
          setItemNotes(JSON.parse(storedNotes));
        }
      } else if (!isGuest) {
        // Load cart for logged in user từ server hoặc local
        // TODO: Implement cho customer
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  // Save cart to storage khi cart thay đổi
  useEffect(() => {
    saveCartToStorage();
  }, [cart, itemNotes, isGuest, sessionId]);

  const saveCartToStorage = async () => {
    try {
      if (isGuest && sessionId) {
        await AsyncStorage.setItem(`guest_cart_${sessionId}`, JSON.stringify(cart));
        await AsyncStorage.setItem(`guest_notes_${sessionId}`, JSON.stringify(itemNotes));
      }
      // TODO: Save cho customer (sync với server)
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          item,
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
  };

  const removeFromCart = (item) => {
    setCart(prev => {
      const existing = prev[item.id];
      if (!existing) return prev;
      
      if (existing.quantity === 1) {
        const newCart = { ...prev };
        delete newCart[item.id];
        return newCart;
      }
      
      return {
        ...prev,
        [item.id]: {
          ...existing,
          quantity: existing.quantity - 1
        }
      };
    });
  };

  const removeItem = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[itemId];
      return newCart;
    });
  };

  const updateItemNote = (itemId, note) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: note
    }));
  };

  const clearCart = () => {
    setCart({});
    setItemNotes({});
  };

  const totalItems = Object.values(cart).reduce((sum, cartItem) => sum + cartItem.quantity, 0);
  
  const totalPrice = Object.values(cart).reduce(
    (sum, cartItem) => sum + (cartItem.item.price * cartItem.quantity), 
    0
  );

  const clearGuestCart = async () => {
    if (isGuest && sessionId) {
      await AsyncStorage.removeItem(`guest_cart_${sessionId}`);
      await AsyncStorage.removeItem(`guest_notes_${sessionId}`);
      clearCart();
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      removeItem,
      clearCart,
      clearGuestCart,
      totalItems,
      totalPrice,
      itemNotes,
      updateItemNote,
      isGuestCart: isGuest
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);