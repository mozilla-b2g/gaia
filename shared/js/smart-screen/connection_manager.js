'use strict';
/* global evt */

(function(exports) {
  /**
   * This class monitors incoming messages from [IAC](http://mzl.la/1TKR6zw) and
   * fires event corresponding with incoming messages. ConnectionManager fires
   * only `unpin` event for now.
   *
   * @class  ConnectionManager
   * @fires ConnectionManager#unpin
   */
  var ConnectionManager = function() {};

  ConnectionManager.prototype = evt({
    _channels: undefined,

    init: function cm_init(channels) {
      var that = this;
      this._channels = channels;
      this._channels.forEach(function(channel) {
        window.addEventListener(channel, that);
      });
    },

    uninit: function cm_uninit() {
      var that = this;
      this._channels.forEach(function(channel) {
        window.removeEventListener(channel, that);
      });
    },

    // all messages should contain `type` and `data`, like this:
    // {
    //   type: 'unpin',
    //   data: {
    //     name: 'Music',
    //     manifestURL: 'app://music.gaiamobile.org/manifest.webapp',
    //     launchURL: 'app://music.gaiamobile.org/'
    //   }
    // }
    handleEvent: function cm_handleEvent(evt) {
      var message = evt.detail;
      if (message && message.type) {
        /**
         * @event ConnectionManager#unpin
         * @type {Object}
         * @property {String} name - name of unpinned app
         * @property {String} manifestURL - manifestURL of unpinned app
         * @property {String} launchURL - launchURL of unpinned app
         */
        this.fire(message.type, message.data);
      }
    }
  });

  exports.ConnectionManager = ConnectionManager;
}(window));
