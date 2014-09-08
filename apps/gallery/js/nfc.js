/* exported NFC */

'use strict';

/*
 * This module helps to manage NFC sharing in an app.
 * Call share() when the UI displays an object that can be shared as a file.
 * Pass the file or blob object itself or a function that returns a Promise
 * that resolves to the file.
 * When the UI changes so that no sharable object is visible, call unshare().
 */
var NFC = {
  share: function share(f) {
    // Enable NFC sharing by defining a "peerready" callback that
    // calls sendFile() to transfer the current image or video to the peer
    if (navigator.mozNfc) {
      navigator.mozNfc.onpeerready = function(event) {
        if (typeof f === 'function') {
          var promise = f();
          promise.then(function(file) { event.peer.sendFile(file); });
        }
        else {
          event.peer.sendFile(f);
        }
      };
    }
  },

  unshare: function unshare() {
    // Disable NFC sharing simply by removing the callback
    if (navigator.mozNfc) {
      navigator.mozNfc.onpeerready = null;
    }
  }
};
