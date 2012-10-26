var eventLoop = (function() {

  var exit = false;

  return {
    start: function() {
      var th = Components.classes['@mozilla.org/thread-manager;1']
                          .getService();
      var thr = th.currentThread;

      while (thr.hasPendingEvents() || !exit) {
        thr.processNextEvent(true);
      }

    },

    stop: function() {
      exit = true;
    }
  };

}());

window.xpcEventLoop = eventLoop;
