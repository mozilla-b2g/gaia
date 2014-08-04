'use strict';

/* global fb */

navigator.mozSetMessageHandler('connection', function(connectionRequest) {
  if (connectionRequest.keyword !== 'ftu-connection') {
    return;
  }

  function onMessage(event) {
    var data = event.data;

    // The Facebook access token
    var tokenData = data.tokenData;
    var totalFriends = data.totalFriends;

    fb.utils.setCachedNumFriends(totalFriends, function done1() {
      fb.utils.setCachedAccessToken(tokenData, function done2() {
        fb.utils.setLastUpdate(Date.now(), function done3() {
          var req = fb.sync.scheduleNextSync();
          req.onsuccess = function scheduleSuccess() {
            // We introduce a 5 second delay to allow to consolidate all
            // the operations
            window.setTimeout(window.close, 5000);
          };
        });
      });
    });
  }

  var port = connectionRequest.port;
  port.onmessage = onMessage;
  port.start();
});
