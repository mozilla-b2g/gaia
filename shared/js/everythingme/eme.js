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
      eme.api.init(generateDeviceId());

      // TODO: make this work (if still needed)
      // do we need a device id for the partners api?
      // we are not tracking any events anyway.
      //
      // SettingsListener.observe('search.deviceId', false,
      //   function onSettingChange(value) {
      //     if (!value) {
      //       value = generateDeviceId();
      //       navigator.mozSettings.createLock().set({
      //         'search.deviceId': value
      //       });
      //     }
      //     eme.api.init(value);
      // });

      this.init = function noop() {
        // avoid multiple init calls
      };
    }
  };

})();
