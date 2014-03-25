(function(exports) {
'use strict';
var LockScreen = function() {
  document.getElementById('unlock')
    .addEventListener('click', this.onUnlock.bind(this));

  document.getElementById('camera')
    .addEventListener('click', this.onCamera.bind(this));

  navigator.mozApps.getSelf().onsuccess = (function(evt) {
    var app = evt.target.result;
    app.connect('lockscreencomms').then(
    (function(ports) {
      this.ports = ports;
      console.log('>> channel connected');
    }).bind(this),
    (function(reason) {
      console.log('>> connect to lockscreen channel is failed: ',
        reason);
    }).bind(this));
  }).bind(this);
};

LockScreen.prototype = {
  ports: null
};

LockScreen.prototype.onUnlock = function() {
  console.log('>> call onUnlock');
  this.post('unlock');
};

LockScreen.prototype.onCamera = function() {
  console.log('>> call onCamera');
  var cameraAppUrl =
    window.location.href.replace('system', 'camera');
  var cameraAppManifestURL =
    cameraAppUrl.replace(/(\/)*(index.html)*$/, '/manifest.webapp');
  cameraAppUrl += '#secure';
  this.post('invoke-secureapp', cameraAppUrl, cameraAppManifestURL);
};

LockScreen.prototype.post = function() {
  var type = arguments[0],
      message = { 'type': type };
  if ('invoke-secureapp' === type) {
    message.url = arguments[1];
    message.manifestUrl = arguments[2];
  }
  this.ports.forEach(function(port) {
    port.postMessage(message);
  });
};

exports.lockScreen = new LockScreen();
})(window);
