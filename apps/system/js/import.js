'use strict';

(function(exports) {

  /**
   * Handles importing of blobs into the system app.
   * Currently supports the 'import-app' activity, which
   * installs a blob on the device if developer mode is enabled.
   */
  function Import() {}

  Import.prototype = {

    /**
     * Starts listening to activities.
     */
    start: function() {
      window.navigator.mozSetMessageHandler('activity',
        this.handleActivity.bind(this));
    },

    /**
     * Handles activity messages.
     */
    handleActivity: function(activity) {
      var name = activity.source.name;
      switch (name) {
        case 'import-app':
          this.importApp(activity);
          break;
      }
    },

    /**
     * Imports an application into the system.
     */
    importApp: function(activity) {
      var blob = activity.source.data.blob;
      navigator.mozApps.mgmt.import(blob)
        .then((addon) => {
          // Enable the addon by default.
          navigator.mozApps.mgmt.setEnabled(addon, true);

          activity.postResult({
            manifestURL: addon.manifestURL
          });
        })
        .catch((error) => {
          activity.postError(error);
        });
    }
  };

  exports.Import = Import;

}(window));
