function debounce(asyncFunction: any, callback, options: { wait?: number } = {}) {
  let timerId = null;
  let lastCall = 0;
  let inExecution = false;
  const { wait = 200 } = options;

  function invokeFunc(): void {
    inExecution = true;
    asyncFunction().then(() => {
      clear();
      callback(null);
    }).catch((error) => {
      clear();
      callback(error);
    });
  }

  function shouldInvoke(time): boolean {
    const timeSinceLastCall = time - lastCall;
    return !inExecution || (timeSinceLastCall >= wait);
  }

  function timerExpired(): void {
    if (tryExecute(Date.now())) {
      return;
    }

    setNextTimer();
  }

  function tryExecute(time) {
    if (shouldInvoke(time)) {
      invokeFunc();
      return true;
    }
    return false;

  }

  function clear() {
    cancelTimer();
    inExecution = false;
  }

  function cancelTimer() {
    if (!timerId) return;
    clearTimeout(timerId);
    timerId = null;
  };

  function setNextTimer() {
    cancelTimer();
    timerId = setTimeout(timerExpired, wait);
  }

  function debounced() {
    lastCall = Date.now();
    if (!timerId) {
      setNextTimer();
      return;
    }
    tryExecute(lastCall);
  }
  return debounced;
}

export default debounce;