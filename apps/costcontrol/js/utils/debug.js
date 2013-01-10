var debug = (function() {
  var DEBUG_ID = 0;

  var DEBUGGING = false;
  var DEBUG_PREFIX = 'CC';

  var currentWindow = window;

  return function() {
    if (!DEBUGGING)
      return;

    var parents = [currentWindow.location.pathname];
    while (currentWindow.location.pathname !==
           currentWindow.parent.location.pathname) {
      parents.push(currentWindow.location.pathname);
      currentWindow = currentWindow.parent;
    }
    parents = parents.reverse().join('>') + ':';

    var uId = DEBUG_ID++;
    var message = ['(' + uId + ')', DEBUG_PREFIX, parents];
    for (var i = 0, len = arguments.length, obj; i < len; i++) {
      obj = arguments[i];
      message.push(typeof obj === 'object' ? JSON.stringify(obj) : obj);
    }
    if (window.dump)
      window.dump(message.join(' '));
    else if (console && console.log)
      console.log(message.join(' '));
  };
}());
