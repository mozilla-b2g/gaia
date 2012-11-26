'use strict';

var _ = navigator.mozL10n.get;

var AppManager = {
  thereIsSIM: false,
  init: function init() {
    this.isLocalized = true;
    WifiManager.init();
    FacebookIntegration.init();
    TimeManager.init();
    UIManager.init();
    Navigation.init();
    DataMobile.init();
    var kSplashTimeout = 700;
    // Retrieve mobile connection if available
    var conn = window.navigator.mozMobileConnection;
    if (!conn) {
      setTimeout(function() {
        // For desktop
        window.location.hash = '#';
        UIManager.splashScreen.classList.remove('show');
        UIManager.activationScreen.classList.add('show');
        window.location.hash = '#languages';
      }, kSplashTimeout);
      return;
    }

    // Do we need pin code after splash screen?
    setTimeout(function() {
      // TODO Include VIVO SIM Card management
      // https://bugzilla.mozilla.org/show_bug.cgi?id=801269#c6
      var self = this;
      var req = conn.getCardLock('pin');
      req.onsuccess = function spl_checkSuccess() {
        AppManager.thereIsSIM = true;
        if (req.result.enabled) {
          UIManager.pincodeScreen.classList.add('show');
          document.getElementById('fake-sim-pin').focus();
        } else {
          UIManager.activationScreen.classList.add('show');
          window.location.hash = '#languages';
        }
      };
      req.onerror = function() {
        UIManager.activationScreen.classList.add('show');
        window.location.hash = '#languages';
      };
      // Remove the splash
      UIManager.splashScreen.classList.remove('show');
    }, kSplashTimeout);
  }
};

window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  if (!AppManager.isLocalized) {
    AppManager.init();
  } else {
    UIManager.mainTitle.innerHTML = _('language');
  }
});

