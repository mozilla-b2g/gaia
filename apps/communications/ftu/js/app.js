'use strict';

var _ = navigator.mozL10n.get;

var AppManager = {
  init: function init() {
    this.isLocalized = true;
    // Init Wifi Manager
    WifiManager.init();
    // Init FB Integration
    FacebookIntegration.init();
    // Init time management
    TimeManager.init();
    // Init UI and Navigation Bar
    UIManager.init();
    Navigation.init();
    // Retrieve mobile connection if available
    var conn = window.navigator.mozMobileConnection;
    if (!conn) {
      setTimeout(function() {
        // For desktop
        window.location.hash = '#';
        UIManager.splashScreen.classList.remove('show');
        UIManager.activationScreen.classList.add('show');
        window.location.hash = '#languages';
      },1000);
      return;
    }

    // Do we need pin code after splash screen?
    setTimeout(function() {
      // TODO Inclide VIVO SIM Card management
      var req = conn.getCardLock('pin');
      req.onsuccess = function spl_checkSuccess() {
        if (req.result.enabled) {
          UIManager.pincodeScreen.classList.add('show');
          document.getElementById('sim_pin').focus();
        } else {
          UIManager.activationScreen.classList.add('show');
          window.location.hash = '#languages';
        }
      };
      req.onerror = function() {
        UIManager.activationScreen.classList.add('show');
        window.location.hash = '#languages';
      }
      // Remove the splash
      UIManager.splashScreen.classList.remove('show');
    },3000);
  }
};

window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  if (!AppManager.isLocalized) {
    AppManager.init();
  }
});

window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
  AppManager.currentActivity = activity;
});
