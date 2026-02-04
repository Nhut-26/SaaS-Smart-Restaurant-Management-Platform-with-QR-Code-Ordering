import { useState, useCallback, useMemo } from 'react';
import { useCart } from '../context/CartContext';

const useCartOperations = () => {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    itemNotes,
    updateItemNote,
    getOrderItems
  } = useCart();

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedItemForNote, setSelectedItemForNote] = useState(null);
  const [tempNote, setTempNote] = useState('');

  const cartTotal = useMemo(() => {
    return Object.values(cart).reduce((sum, cartItem) =>
      sum + (cartItem.item.price * cartItem.quantity), 0
    );
  }, [cart]);

  const totalItems = useMemo(() => {
    return Object.values(cart).reduce((sum, cartItem) => sum + cartItem.quantity, 0);
  }, [cart]);

  const getItemQuantity = useCallback((itemId) => {
    return cart[itemId]?.quantity || 0;
  }, [cart]);

  const getItemNote = useCallback((itemId) => {
    return itemNotes[itemId] || '';
  }, [itemNotes]);

  const addItemToCart = useCallback((item, quantity = 1) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(item);
    }
  }, [addToCart]);

  const removeItemFromCart = useCallback((item, quantity = 1) => {
    for (let i = 0; i < quantity; i++) {
      removeFromCart(item);
    }
  }, [removeFromCart]);

  const setItemQuantity = useCallback((item, quantity) => {
    if (quantity <= 0) {
      removeFromCart(item);
      return;
    }

    const currentQuantity = getItemQuantity(item.id);
    const difference = quantity - currentQuantity;

    if (difference > 0) {
      addItemToCart(item, difference);
    } else if (difference < 0) {
      removeItemFromCart(item, Math.abs(difference));
    }
  }, [getItemQuantity, addItemToCart, removeItemFromCart, removeFromCart]);

  const handleAddNote = useCallback((item) => {
    setSelectedItemForNote(item);
    setTempNote(getItemNote(item.id));
    setShowNoteModal(true);
  }, [getItemNote]);

  const saveNote = useCallback(() => {
    if (selectedItemForNote) {
      updateItemNote(selectedItemForNote.id, tempNote);
      setShowNoteModal(false);
      setSelectedItemForNote(null);
      setTempNote('');
    }
  }, [selectedItemForNote, tempNote, updateItemNote]);

  const cancelNote = useCallback(() => {
    setShowNoteModal(false);
    setSelectedItemForNote(null);
    setTempNote('');
  }, []);

  const isItemInCart = useCallback((itemId) => {
    return !!cart[itemId];
  }, [cart]);

  const cartItemsArray = useMemo(() => {
    return Object.values(cart).map(cartItem => ({
      ...cartItem,
      note: itemNotes[cartItem.item.id] || ''
    }));
  }, [cart, itemNotes]);

  const cartItemsByCategory = useMemo(() => {
    return cartItemsArray.reduce((groups, item) => {
      const category = item.item.category || 'Khác';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  }, [cartItemsArray]);

  const canAddMoreItems = useCallback((item) => {
    if (item.stock_count === undefined) return true;
    const currentQuantity = getItemQuantity(item.id);
    return currentQuantity < item.stock_count;
  }, [getItemQuantity]);

  const getRemainingStock = useCallback((item) => {
    if (item.stock_count === undefined) return Infinity;
    const currentQuantity = getItemQuantity(item.id);
    return item.stock_count - currentQuantity;
  }, [getItemQuantity]);

  return {
    cart,
    itemNotes,
    showNoteModal,
    selectedItemForNote,
    tempNote,

    cartTotal,
    totalItems,

    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    updateItemNote,
    getOrderItems,

    addItemToCart,
    removeItemFromCart,
    setItemQuantity,

    handleAddNote,
    saveNote,
    cancelNote,
    setShowNoteModal,
    setTempNote,

    getItemQuantity,
    getItemNote,
    isItemInCart,
    canAddMoreItems,
    getRemainingStock,

    cartItemsArray,
    cartItemsByCategory,

    resetCart: clearCart
  };
};

export default useCartOperations;
