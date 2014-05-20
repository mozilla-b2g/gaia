'use strict';
/* global eme */

(function() {
  var DEBUG = true;

  // see duplicate in homescreen/everything.me.js
  function generateDeviceId() {
    var url = window.URL.createObjectURL(new Blob());
    var id = url.replace('blob:', '');

    window.URL.revokeObjectURL(url);

    return 'fxos-' + id;
  }

  window.eme = {
    api: null,
    log: function log() {
      if (DEBUG) {
        var args = Array.prototype.slice.apply(arguments);
        args.unshift('evme');
        console.log.apply(console, args);
      }
    },

    /**
     * Get or create deviceId and init search/eme instance.
     * deviceId is shared with the homescreen/eme instance via mozSettings.
     */
    init: function init() {
      return new Promise(function ready(resolve) {
        SettingsListener.observe('search.deviceId', false,
          function onSettingChange(deviceId) {
            if (!deviceId) {
              deviceId = generateDeviceId();
              navigator.mozSettings.createLock().set({
                'search.deviceId': deviceId
              });
            }
            eme.api.init(deviceId);
            resolve();

            eme.log('init: deviceId', deviceId);
        });
      });

      this.init = function noop() {
        // avoid multiple init calls
        eme.log('init: noop');
        return Promise.resolve();
      };
    }
  };

})();
