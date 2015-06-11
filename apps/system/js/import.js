'use strict';
(function(exports) {

  /* global LazyLoader, AchievementsService */

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
      window.addEventListener('activity-import-app',
        this.handleActivity.bind(this));
    },

    /**
     * Imports an application into the system.
     */
    handleActivity: function(e) {
      var blob = e.detail.source.data.blob;
      navigator.mozApps.mgmt.import(blob)
        .then((addon) => {
          // Enable the addon by default.
          navigator.mozApps.mgmt.setEnabled(addon, true);

          try {
            LazyLoader.load(['shared/js/achievements-service.js']).then(() => {
              var achievementsService = new AchievementsService();
              var _ = navigator.mozL10n.get;

              achievementsService.reward({
                criteria: 'achievements/add-on-all-star',
                evidence: 'urn:customizer:add-on:save',
                name: _('achievements-add-on-all-star-name'),
                description: _('achievements-add-on-all-star-description'),
                image: '/style/achievements/add-on-all-star.png'
              });
            });
          } catch (e) {
            console.error('error rewarding an achievement', e);
          }

          e.detail.postResult({
            manifestURL: addon.manifestURL
          });
        })
        .catch((error) => {
          e.detail.postError(error);
        });
    }
  };

  exports.Import = Import;

}(window));
