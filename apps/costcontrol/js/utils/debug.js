var DEBUGGING = false;

var debug = (function() {
  var SEQ_ID = 0;
  var PROCESS_ID = Date.now();

  var DEBUG_PREFIX = 'CC';

  return function _debug() {
    if (!DEBUGGING) {
      return;
    }

    var currentWindow = window;
    var parents = [];
    while (currentWindow !== currentWindow.parent) {
      parents.push(currentWindow.location.pathname);
      currentWindow = currentWindow.parent;
    }
    parents.push(currentWindow.location.pathname);
    parents = parents.reverse().join('>') + ':';

    var uId = PROCESS_ID;
    var message = ['(' + uId + '-' + (SEQ_ID++) + ')', DEBUG_PREFIX, parents];
    for (var i = 0, len = arguments.length, obj; i < len; i++) {
      obj = arguments[i];
      message.push(typeof obj === 'object' ? JSON.stringify(obj) : obj);
    }
    if (window.dump) {
      window.dump(message.join(' '));
    } else if (console && console.log) {
      console.log(message.join(' '));
    }
  };
}());
