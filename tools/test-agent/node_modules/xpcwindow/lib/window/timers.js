var _timers = [];

function setTimer(fun, timeout, type) {
  var timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
  _timers.push(timer);
  var event = {
      notify: function(timer) {
          fun();
      }
  };
  timer.initWithCallback(event, timeout, type);
  return timer;
}

window.setTimeout = function setTimeout(fun, timeout) {
  return setTimer(fun, timeout, Ci.nsITimer.TYPE_ONE_SHOT);
};

window.setInterval = function setInterval(fun, timeout) {
  return setTimer(fun, timeout, Ci.nsITimer.TYPE_REPEATING_SLACK);
};

window.clearTimeout = function clearTimeout(timer) {
  if (!timer) {
      return;
  }
  timer.cancel();
  var i = _timers.indexOf(timer);
  if (i >= 0) {
      _timers.splice(_timers.indexOf(timer), 1);
  }
};

window.clearInterval = window.clearTimeout;

