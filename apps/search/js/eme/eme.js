(function() {
  'use strict';
  /* global eme, SettingsListener */

  // see duplicate in homescreen/everything.me.js
  function generateDeviceId() {
    var url = window.URL.createObjectURL(new Blob());
    var id = url.replace('blob:', '');

    window.URL.revokeObjectURL(url);

    return 'fxos-' + id;
  }

  window.eme = {
    api: null,

    /**
     * Get or create deviceId and init search/eme instance.
     * deviceId is shared with the homescreen/eme instance via mozSettings.
     */
    init: function init() {
      SettingsListener.observe('search.deviceId', false,
        function onSettingChange(value) {
          if (!value) {
            value = generateDeviceId();
            navigator.mozSettings.createLock().set({
              'search.deviceId': value
            });
          }
          eme.api.init(value);
      });

      this.init = function noop() {
        // avoid multiple init calls
      };
    }
  };

})();
