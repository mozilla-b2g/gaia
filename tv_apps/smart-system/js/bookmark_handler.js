/* global BookmarkManager */

(function(exports) {
  'use strict';

  var BookmarkHandler = {
    _selfApp: undefined,

    init: function bm_init() {
      BookmarkManager.on('change', this.onBookmarkChanged.bind(this));
    },

    onBookmarkChanged: function bm_onBookmarkChanged(evt) {
      if (evt.operation === 'removed') {
        this.sendMessage('unpin', {
          url: evt.id
        });
      }
    },

    getSelfApp: function bm_getSelfApp() {
      if (this._selfApp) {
        return Promise.resolve(this._selfApp);
      } else {
        var that = this;
        return new Promise(function(resolve) {
          navigator.mozApps.getSelf().onsuccess = function(evt) {
            that._selfApp = evt.target.result;
            resolve(that._selfApp);
          };
        });
      }
    },

    sendMessage: function bm_sendMessage(type, data) {
      var message = {
        type: type,
        data: data
      };

      this.getSelfApp().then(function(selfApp) {
        selfApp.connect('appdeck-channel').then (function(ports) {
          ports.forEach(function(port) {
            port.postMessage(message);
          });
        });
      });
    }
  };

  exports.BookmarkHandler = BookmarkHandler;
}(window));
