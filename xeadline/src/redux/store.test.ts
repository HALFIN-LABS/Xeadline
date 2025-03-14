import { configureStore } from '@reduxjs/toolkit';
import testReducer, { increment, decrement, incrementByAmount } from './slices/testSlice';

describe('Redux Store', () => {
  it('should handle initial state', () => {
    const store = configureStore({
      reducer: {
        test: testReducer,
      },
    });

    const state = store.getState();
    expect(state.test.value).toBe(0);
  });

  it('should handle increment action', () => {
    const store = configureStore({
      reducer: {
        test: testReducer,
      },
    });

    store.dispatch(increment());
    const state = store.getState();
    expect(state.test.value).toBe(1);
  });

  it('should handle decrement action', () => {
    const store = configureStore({
      reducer: {
        test: testReducer,
      },
    });

    store.dispatch(decrement());
    const state = store.getState();
    expect(state.test.value).toBe(-1);
  });

  it('should handle incrementByAmount action', () => {
    const store = configureStore({
      reducer: {
        test: testReducer,
      },
    });

    store.dispatch(incrementByAmount(5));
    const state = store.getState();
    expect(state.test.value).toBe(5);
  });
});