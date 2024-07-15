// Externals
import { Action, Dispatch } from 'redux';
import axios from 'axios';

import BasketItem from '../../models/BasketItem';
import { IState } from '../rootReducer';
import { debounce } from 'lodash';

let pendingUpdate = false;
let lastUpdateTotal = 0;
let lastUpdateTimestamp = 0;

export function incrementItem(basketItem: BasketItem) {
  return (dispatch: Dispatch<Action>, getState: () => IState) => {
    updateItemQuantity(dispatch, getState, basketItem, 1);
  };
}

export function decrementItem(basketItem: BasketItem) {
  return (dispatch: Dispatch<Action>, getState: () => IState) => {
    updateItemQuantity(dispatch, getState, basketItem, -1);
  };
}

function updateItemQuantity(dispatch: Dispatch<Action>, getState: () => IState, basketItem: BasketItem, quantityChange: number) {
  const state: IState = getState();

  const foundItem = state.basket.items.find((item) => item.id === basketItem.id);

  if (foundItem && foundItem.quantity + quantityChange < 1) {
    return;
  }

  dispatch({
    type: 'update-item-quantity',
    payload: {
      itemId: basketItem.id,
      quantityChange: quantityChange
    }
  });

  const basketItems = state.basket.items.map((item) => {
    if (item.id === basketItem.id) {
      return {
        ...item,
        quantity: item.quantity + quantityChange,
      };
    }
    return item;
  });

  const newTotal = basketItems.reduce((previousValue: number, currentValue) => {
    return previousValue + currentValue.itemPrice * currentValue.quantity;
  }, 0);

  lastUpdateTotal = newTotal;
  lastUpdateTimestamp = Date.now();
  pendingUpdate = true;

  dispatch({
    type: 'update-basket',
    payload: basketItems
  });

  dispatch({
    type: 'calculating_basket',
    payload: true
  });

  debounceValidateBasket(dispatch, getState);
}

const debounceValidateBasket = debounce(async (dispatch: Dispatch<Action>, getState: () => IState) => {
  if (!pendingUpdate) return;

  pendingUpdate = false;

  try {
    await axios.get('https://2486713dae314753ae6b0ff127002d12.api.mockbin.io/');
    dispatch({
      type: 'update-basket-totals',
      payload: lastUpdateTotal
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    const now = Date.now();
    if (lastUpdateTimestamp > now - 3000) {
      pendingUpdate = true;
      debounceValidateBasket(dispatch, getState);
    } else {
      dispatch({
        type: 'calculating_basket',
        payload: false
      });
    }
  }
}, 3000);
