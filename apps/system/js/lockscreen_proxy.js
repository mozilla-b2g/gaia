/**
 * Forward messages from LockScreen.
 */

(function(exports) {
'use strict';
var LockScreenProxy = function() {
  this.publish('secure-modeon');
  window.addEventListener('iac-lockscreencomms', this);
};
LockScreenProxy.prototype.handleEvent = function(evt) {
  console.log('>> lockscreen channel message: ', evt.detail);
  var message = evt.detail;
  switch (message.type) {
    case 'unlock':
      this.publish('will-unlock');
      break;
    case 'invoke-secureapp':
      this.publish('secure-launchapp', {
        appURL: message.url,
        appManifestURL: message.manifestUrl
      });
      break;
  }
};

LockScreenProxy.prototype.publish = function(type, detail) {
  var evt = new CustomEvent(type, {detail: detail});
  window.dispatchEvent(evt);
  console.log('>> proxy forwared: ', evt.type);
};
exports.lockScreenProxy = new LockScreenProxy();
})(window);
