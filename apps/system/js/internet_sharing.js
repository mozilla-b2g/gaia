'use strict';
/* global ModalDialog */
/* global Service */

(function(exports) {

  // Local reference to mozSettings
  var settings;

  /**
   * Internet Sharing module responsible for checking the availability of
   * internet sharing based on the status of airplane mode.
   * @requires ModalDialog
   * @class InternetSharing
   */
  function InternetSharing() {}

  InternetSharing.prototype = {
    /**
     * Called whenever there is a setting change in wifi tethering.
     * Validates that we can turn internet sharing on, and saves state to
     * @memberof InternetSharing.prototype
     */
    internetSharingSettingsChangeHanlder: function(evt) {
      if (Service.query('AirplaneMode.isActive') && true === evt.settingValue) {
        var title = 'apmActivated';
        var buttonText = 'ok';
        var message ='noHotspotWhenAPMisOnWifiHotspot';

        ModalDialog.alert(title, message, { title: buttonText });
        settings.createLock().set({
          'tethering.wifi.enabled': false
        });
      }
    },

    /**
     * Starts the InternetSharing class.
     * @memberof InternetSharing.prototype
     */
    start: function() {
      settings = window.navigator.mozSettings;
      // listen changes after value is restored.
      settings.addObserver('tethering.wifi.enabled',
        this.internetSharingSettingsChangeHanlder.bind(this));
    }
  };

  exports.InternetSharing = InternetSharing;

}(window));
