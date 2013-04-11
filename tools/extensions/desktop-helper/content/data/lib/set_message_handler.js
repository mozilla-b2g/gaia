!function() {


  if (/system.gaiamobile.org/.test(location.href)) {
    var frameListeners = {};

    // Receive a setMessageHandler from the app
    window.addEventListener('message', function(e) {
      if (e.data.action == 'dispatchMessage' &&
            e.data.payload.detail.type === 'setMessageHandler') {
        var detail = e.data.payload.detail;
        frameListeners[detail.eventName] =
          frameListeners[detail.eventName] || [];

        frameListeners[detail.eventName].push(e.source);
      }
    });

    // Fake a message handler. I thought of the name myself as there is no
    // alternative in the real Gaia (only through Gecko).
    FFOS_RUNTIME.makeNavigatorShim('mozTriggerMessageHandler', function(name,
                                                                  detail) {
      (frameListeners[name] || []).forEach(function(l) {
        l.postMessage({
          action: 'triggerMessageHandler',
          evName: name,
          payload: detail
        }, '*');
      });
    }, true);
  }

  // so this is how it works:
  // 1. When registering with mozSetMessageHandler we have an EventEmitter
  //    like object that lives in the app iFrame context;
  //    additionally we tell the system app that we're interested in this event
  // 2. An event gets fired via mozTriggerMessageHandler,
  //    the system app checks which apps are interested and does a
  //    `postMessage` to them
  // 3. App grabs the listeners and invokes them based on this data
  var messageListeners = {};

  // React on events from the system app regarding message handlers
  window.addEventListener('message', function(e) {
    if (e.data.action === 'triggerMessageHandler') {
      (messageListeners[e.data.evName] || []).forEach(function(fn) {
        fn(e.data.payload);
      });
    }
  });

  // mozSetMessageHandler called from within the app
  FFOS_RUNTIME.makeNavigatorShim('mozSetMessageHandler', function(evName, cb) {
    FFOS_RUNTIME.sendFrameEvent({
      type: 'setMessageHandler',
      eventName: evName
    });

    messageListeners[evName] = messageListeners[evName] || [];
    messageListeners[evName].push(cb);
  }, true);
}();
