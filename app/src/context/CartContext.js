import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({});
  const [itemNotes, setItemNotes] = useState({});

  useEffect(() => {
    loadCartFromStorage();
  }, [user]);

  const loadCartFromStorage = async () => {
    try {
      if (user) {
        const storedCart = await AsyncStorage.getItem(`customer_cart_${user.id}`);
        const storedNotes = await AsyncStorage.getItem(`customer_notes_${user.id}`);

        if (storedCart) {
          setCart(JSON.parse(storedCart));
        }
        if (storedNotes) {
          setItemNotes(JSON.parse(storedNotes));
        }
      } else {
        setCart({});
        setItemNotes({});
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  useEffect(() => {
    saveCartToStorage();
  }, [cart, itemNotes, user]);

  const saveCartToStorage = async () => {
    try {
      if (user) {
        await AsyncStorage.setItem(`customer_cart_${user.id}`, JSON.stringify(cart));
        await AsyncStorage.setItem(`customer_notes_${user.id}`, JSON.stringify(itemNotes));
      }
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const addToCart = (item) => {
    console.log('Adding to cart:', item);
    setCart(prev => {
      const existing = prev[item.id];
      const newCart = {
        ...prev,
        [item.id]: {
          item,
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
      console.log('New cart:', newCart);
      return newCart;
    });
  };

  const removeFromCart = (item) => {
    console.log('Removing from cart:', item);
    setCart(prev => {
      const existing = prev[item.id];
      if (!existing) return prev;

      if (existing.quantity === 1) {
        const newCart = { ...prev };
        delete newCart[item.id];
        console.log('Removed item completely');
        return newCart;
      }

      const updatedCart = {
        ...prev,
        [item.id]: {
          ...existing,
          quantity: existing.quantity - 1
        }
      };
      console.log('Reduced quantity:', updatedCart[item.id].quantity);
      return updatedCart;
    });
  };

  const removeItem = (itemId) => {
    console.log('Removing item completely:', itemId);
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[itemId];
      console.log('Cart after removal:', newCart);
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
    console.log('Clearing entire cart');
    setCart({});
    setItemNotes({});

    if (user) {
      AsyncStorage.removeItem(`customer_cart_${user.id}`).catch(console.error);
      AsyncStorage.removeItem(`customer_notes_${user.id}`).catch(console.error);
    }
  };

  const totalItems = Object.values(cart).reduce((sum, cartItem) => {
    if (cartItem && cartItem.quantity) {
      return sum + cartItem.quantity;
    }
    return sum;
  }, 0);

  const totalPrice = Object.values(cart).reduce((sum, cartItem) => {
    if (cartItem && cartItem.item && cartItem.item.price) {
      return sum + (cartItem.item.price * cartItem.quantity);
    }
    return sum;
  }, 0);

  const getCartForRestaurant = (restaurantId) => {
    return Object.values(cart).filter(cartItem =>
      cartItem.item && cartItem.item.restaurantId === restaurantId
    );
  };

  const getOrderItems = () => {
    return Object.values(cart)
      .filter(cartItem => cartItem && cartItem.item)
      .map(cartItem => {
        const item = cartItem.item;
        return {
          id: item.id,
          name: item.name,
          quantity: cartItem.quantity,
          price: item.price,
          note: itemNotes[item.id] || '',
        };
      });
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      removeItem,
      clearCart,
      totalItems,
      totalPrice,
      itemNotes,
      updateItemNote,
      getCartForRestaurant,
      getOrderItems,
      hasItems: totalItems > 0,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
