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

(function idleTimerAsAIdleObserverWrapper(win) {
  'use strict';

  // stuff the 0th element so id is always a truey value
  var idleTimerRegistry = [undefined];

  // setIdleTimeout()
  win.setIdleTimeout = function setIdleTimeout(idleCallback,
                                               activeCallback,
                                               ms) {
    var idleFired = false;
    var idleTimer = {};

    var triggerIdleCallback = function() {
      // remove the timer
      idleTimer.clearTimer();

      // set idleFired to true
      idleFired = true;

      // fire the real idleCallback
      idleCallback();
    };

    idleTimer.timer = setTimeout(triggerIdleCallback, ms);

    idleTimer.clearTimer = function clearIdleTimer() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = undefined;
      }
    };

    // Create an idle observer with a very short time as
    // we are not interested in when onidle fires (since it's inaccuate),
    // instead, we need to know when onactive callback calls.
    idleTimer.observer = {
      onidle: function observerReportIdle() {
        // Once the onidle fires, the next user action will trigger onactive.

        // No need to reset the timer if it has been set in the init stage.
        if (idleTimer.timer) {
          return;
        }

        // The onidle callback will delay 1 second after user stops actions
        // so reduce 1000ms here to counteract it.
        var time = ms - 1000;
        idleTimer.timer = setTimeout(triggerIdleCallback, time < 0 ? 0 : time);
      },
      onactive: function observerReportActive() {
        // Remove the timer set by onidle
        idleTimer.clearTimer();

        // If idleCallback is not called yet,
        // we should not trigger activeCallback here
        if (!idleFired) {
          return;
        }

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
    if (!idleTimerRegistry[id]) {
      return;
    }

    // Get the idleTimer object and remove it from registry
    var idleTimer = idleTimerRegistry[id];
    idleTimerRegistry[id] = undefined;

    // Properly clean it up, make sure we will never heard from
    // those callbacks ever again.
    navigator.removeIdleObserver(idleTimer.observer);
    idleTimer.clearTimer();
  };

})(this);
