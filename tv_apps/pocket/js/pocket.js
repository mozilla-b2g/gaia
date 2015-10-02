'use strict';

navigator.mozApps.getSelf().onsuccess = function(evt) {
  var selfApp = evt.target.result;
  var iacmsg = {
    type: 'view',
    data: {
      type: 'url',
      url: 'https://getpocket.com/',
    }
  };

  selfApp.connect('webpage-open').then(function (ports) {
    ports.forEach(function(port) {
      port.postMessage(iacmsg);
    });

    // XXX: smart-system application opening transition would failed,
    // if the application exit quickly. Bug 1208414 would be use to
    // trace this issue.
    setTimeout(function(){
      self.close();
    }, 1500);
  });
};
