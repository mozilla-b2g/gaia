'use strict';

window.addEventListener('load', function() {
  navigator.mozSetMessageHandler("connection", function(connectionRequest) {
    if (connectionRequest.keyword !== "test") {
      return;
    }

    var port = connectionRequest.port;
    port.onmessage = function(event) {
      port.postMessage(event.data);
    };
  });
});
