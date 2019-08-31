function debounce(asyncFunction: any, callback, options: { wait?: number, maxWait?: number } = {}) {
  let timerId, lastCallTime;
  let inExecution = false;
  let lastInvokeTime = 0;
  const { wait = 200, maxWait = 600} = options;

  function invokeFunc(time): void {
    lastInvokeTime = time;
    inExecution = true;
    asyncFunction().then(() => {
      inExecution = false;
      callback(null);
    }).catch((error) => {
      clear();
      callback(error);
    });
  }

  function remainingWait(time): number {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall;
    const result = Math.min(timeWaiting, maxWait - timeSinceLastInvoke);

    return result < 0 ? wait : result; // TODO verify
  }

  function shouldInvoke(time): boolean {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    return !inExecution && ((timeSinceLastCall >= wait) || (timeSinceLastInvoke >= maxWait));
  }

  function timerExpired(): void {
    const time = Date.now()
    if (shouldInvoke(time)) {
      invokeFunc(time);
      return;
    }
    
    timerId = setTimeout(timerExpired, remainingWait(time))
  }

  function clear() {
    cancelTimer();
    inExecution = false;
    lastInvokeTime = 0;
    lastCallTime = undefined;
  }

  function cancelTimer() {
    if (!timerId) return;
    clearTimeout(timerId);
    timerId = null;
  };

  function setNextTimer(time) {
    cancelTimer();
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function debounced() {
    const time = Date.now();
    lastCallTime = time;
    setNextTimer(time);
  }
  return debounced;
}

export default debounce;