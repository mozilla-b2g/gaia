'use strict';

var IACHandler = {
  _eventPrefix: 'iac-',
  _ports: [],
  init: function onInit() {
    var self = this;

    window.navigator.mozSetMessageHandler('connection',
      function onConnected(request) {
        var keyword = request.keyword;
        var port = request.port;

        // We will save each port by keyword
        if (!self._ports[keyword]) {
          self._ports[keyword] = port;
        }

        port.onmessage = function onReceivedMessage(evt) {
          var message = evt.data;

          /*
           * System will emit a event when received message
           * e.g. iac-ftucomms
           *      iac-[keywords]
           */
          var evtName = self._eventPrefix + keyword;
          var iacEvt = document.createEvent('CustomEvent');

          /*
           * You can get the message by accessing
           * `event.detail`
           *
           * It will store the whole message you passed from postMessage
           */
          iacEvt.initCustomEvent(evtName,
            /* canBubble: */ true, /* cancelable */ false, message);

          window.dispatchEvent(iacEvt);
        };
    });
  },
  getPort: function(keyword) {
    return this._ports[keyword];
  }
};

IACHandler.init();
