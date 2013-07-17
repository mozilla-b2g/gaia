/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc_mock_loader = {
  load: function(callback) {
    if (typeof callback != 'function') {
      callback = function() {};
    }

    DUMP('STK alternative loader: ICC Loading ...');

    var reqIccFake = SettingsListener.getSettingsLock().get('debug.icc.faked');
    reqIccFake.onsuccess = function iccFaked() {
      // If it's running in a non-B2G gecko or faked forced by settings
      if (!(
        (navigator.mozMobileConnection && navigator.mozMobileConnection.icc) ||
         navigator.mozIccManager) || reqIccFake.result['debug.icc.faked']) {

        DUMP('STK alternative loader: Faking ICC object');

        // Load mocked ICC object
        DUMP('STK alternative loader: Lazy loading ICC mock object');
        LazyLoader.load('/js/icc_mock.js', function() {
          icc_mock.init(function() {
            icc_mock.dispatchMainMenu();
            callback(icc_mock);
          });
        });
      } else {
        DUMP('STK alternative loader: Using real ICC obj.: ' +
          'Registering icc-stkcommand System Message');
        callback(null);
      }
    };

    // Enabling/Disabling Faked STK shall reboot the phone
    var firstTimeCheckICCFakedSetting = true;
    SettingsListener.observe('debug.icc.faked', false, function(value) {
      if (firstTimeCheckICCFakedSetting) {
        firstTimeCheckICCFakedSetting = false;
        return;
      }
      DUMP('STK alternative loader: STK/ICC Faked changed ... rebooting');
      SleepMenu.startPowerOff(true);
    });
  }
};
