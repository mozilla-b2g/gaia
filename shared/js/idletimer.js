/*
  This file implements window.setIdleTimeout() and
  window.clearIdleTimeout(). They look like setTimeout() except the
  setIdleTimeout() function takes two callbacks:

  setIdleTimeout(idleCallback, activeCallback, ms):
    idleCallback will fire after specific microsecond of idle.
    The time it takes will calculated from the time
    setIdleTimeout() is called and resets as user interacts.

    activeCallback will fire when the first user action *after*
    idleCallback fires

    returns id.

  clearIdleTimeout(id):
    takes the id returns from setIdleTimeout() and cancels it.

*/

// Wrap everything into a closure so we will not expose idleTimerRegistry

'use strict';

(function idleTimerAsAIdleObserverWrapper(win) {

  // stuff the 0th element so id is always a truey value
  var idleTimerRegistry = [undefined];

  // setIdleTimeout()
  win.setIdleTimeout = function setIdleTimeout(idleCallback,
                                               activeCallback,
                                               ms) {
    var startTimestamp = Date.now();
    var idleFired = false;

    var idleTimer = {
      timer: undefined,
      resetStartTimestamp: function resetStartTimestamp() {
        startTimestamp = Date.now();
      }
    };

    // If the system unix time changes, we would need to update
    // the number we kept in startTimestamp, or bad things will happen.
    window.addEventListener('moztimechange', idleTimer.resetStartTimestamp);

    // Create an idle observer with a very short time as
    // we are not interested in when onidle fires (since it's inaccuate),
    // instead, we need to know when onactive callback calls.
    idleTimer.observer = {
      onidle: function observerReportIdle() {
        // Once the onidle fires, the next user action will trigger
        // onactive.

        // The time it takes for onidle to fire need to be subtracted from
        // the real time we are going to set to setTimeout()
        var time = (ms - (Date.now() - startTimestamp));

        // Let's start the real count down and wait for that.
        idleTimer.timer = setTimeout(function idled() {
          // remove the timer
          idleTimer.timer = undefined;

          // set idleFired to true
          idleFired = true;

          // fire the real idleCallback
          idleCallback();
        }, time);
      },
      onactive: function observerReportActive() {
        // Remove the timer set by onidle
        if (idleTimer.timer) {
          clearTimeout(idleTimer.timer);
          idleTimer.timer = undefined;
        }

        // Reset the timestamp; the next real count down should start
        // from the time onactive fires
        startTimestamp = Date.now();

        // If idleCallback is not called yet,
        // we should not trigger activeCallback here
        if (!idleFired)
          return;

        // fire the real activeCallback
        activeCallback();

        // reset the flag
        idleFired = false;

        // After a short time, onidle will fire again.
        // timer will be registered there again.
      },
      time: 1
    };

    // Register the idleObserver
    navigator.addIdleObserver(idleTimer.observer);

    // Push the idleTimer object to the registry
    idleTimerRegistry.push(idleTimer);

    // return the id so people can do clearIdleTimeout();
    return (idleTimerRegistry.length - 1);
  };

  // clearIdleTimeout()
  win.clearIdleTimeout = function clearIdleTimeout(id) {
    if (!idleTimerRegistry[id])
      return;

    // Get the idleTimer object and remove it from registry
    var idleTimer = idleTimerRegistry[id];
    idleTimerRegistry[id] = undefined;

    // Properly clean it up, make sure we will never heard from
    // those callbacks ever again.
    navigator.removeIdleObserver(idleTimer.observer);
    window.removeEventListener('moztimechange', idleTimer.resetStartTimestamp);
    if (idleTimer.timer)
      clearTimeout(idleTimer.timer);
  };

})(this);
