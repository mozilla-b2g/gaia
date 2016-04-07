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
  shrinkingUI: null,
  peer: null,
  share: function share(f, options) {
    if (navigator.mozNfc) {
      // This is a workaround for bug 1163957 which is only applied to the open
      // activity. The complete solution should be done in bug 1109495.
      if (window.ShrinkingUI && options) {
        NFC.shrinkingUI = new window.ShrinkingUI(options.foregroundElement,
          options.backgroundElement);
        window.addEventListener('shrinking-sent',
          NFC.sendFile.bind(NFC, f));
        navigator.mozNfc.onpeerfound = function(evt) {
          if (!evt.peer) {
            return;
          }
          NFC.peer = evt.peer;
          NFC.shrinkingUI.start();
          // Without calling preventDefault, gecko will fire onpeerlost right
          // after onpeerfound since it think gallery app would not handle it.
          evt.preventDefault();
        };
        navigator.mozNfc.onpeerlost = function() {
          NFC.peer = null;
          NFC.shrinkingUI.stop();
        };
      } else {
        // Enable NFC sharing by defining a "peerready" callback that
        // calls sendFile() to transfer the current image or video to the peer
        navigator.mozNfc.onpeerready = function(event) {
          NFC.peer = event.peer;
          NFC.sendFile(f);
        };
      }
    }
  },

  sendFile: function(f) {
    if (!NFC.peer) {
      return;
    }
    if (typeof f === 'function') {
      var promise = f();
      promise.then(function(file) {
        NFC.peer.sendFile(file);
        if (NFC.shrinkingUI) {
          NFC.shrinkingUI.stop();
        }
      });
    }
    else {
      NFC.peer.sendFile(f);
      if (NFC.shrinkingUI) {
        NFC.shrinkingUI.stop();
      }
    }
  },

  unshare: function unshare() {
    // Disable NFC sharing simply by removing the callback
    if (navigator.mozNfc) {
      NFC.peer = null;
      navigator.mozNfc.onpeerready = null;
      navigator.mozNfc.onpeerfound = null;
      navigator.mozNfc.onpeerlost = null;
      if (NFC.shrinkingUI) {
        NFC.shrinkingUI.stop();
        NFC.shrinkingUI = null;
        window.removeEventListener('shrinking-sent',
          NFC.sendFile);
      }
    }
  }
};
