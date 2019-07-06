import React from 'react';

// utils
const useForceUpdate = () => React.useReducer(state => !state, false)[1];
const CONTEXT_LISTENERS = Symbol('CONTEXT_LISTENERS');

// createProvider
const createProvider = (OrigProvider, listeners) => React.memo(({ value, children }) => {
  React.useLayoutEffect(() => {
    listeners.forEach(listener => {
      listener(value)
    });
  }, [value]);
  return React.createElement(OrigProvider, { value }, children);
});

// createContext
export const createContext = (defaultValue) => {
  const context = React.createContext(defaultValue, () => 0);
  const listeners = new Set();
  // shared listeners (not ideal)
  context[CONTEXT_LISTENERS] = listeners;
  // hacked provider
  context.Provider = createProvider(context.Provider, listeners);
  // no support for consumer
  delete context.Consumer;
  return context;
};

// useContextSelector
export const useContextSelector = (context, selector) => {
  const listeners = context[CONTEXT_LISTENERS];
  if (!listeners) {
    throw new Error('useContextSelector requires special context');
  }
  const forceUpdate = useForceUpdate();
  const value = React.useContext(context);
  const selected = selector(value);
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    ref.current = { selector, value, selected };
  });
  React.useLayoutEffect(() => {
    const callback = (nextValue) => {
      try {
        if (ref.current.value === nextValue
          || Object.is(ref.current.selected, ref.current.selector(nextValue))) {
          return;
        }
      } catch (e) {
        // ignored (stale props or some other reason)
      }
      ref.current.value = nextValue;
      forceUpdate();
    };
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, [forceUpdate, listeners]);
  return selected;
};

// useContext
export const useContext = context => useContextSelector(context, x => x);
