/* exported NFCShare */
/* global client */

var NFCShare = (function() {

  var _NFCShare = {
    _isEnabled: false,

    get enabled() {
      return this._isEnabled;
    },

    set enabled(value) {
      if (typeof value !== 'boolean') {
        throw Error('expected true or false');
      }

      if (!navigator.mozNfc || value === this._isEnabled) {
        return;
      }

      if (value) {
        navigator.mozNfc.onpeerready = (event) => {
          var peer = event.peer;
          if (!peer) {
            return;
          }

          client.method('getPlaybackStatus').then((status) => {
            return client.method('getSongFile', status.filePath);
          }).then((blob) => {
            peer.sendFile(blob);
          });
        };
      } else {
        navigator.mozNfc.onpeerready = null;
      }

      this._isEnabled = value;
      return this._isEnabled;
    }
  };

  return _NFCShare;

})();
