'use strict';

var _ = navigator.mozL10n.get;

var AppManager = {
  settings: navigator.mozSettings,

  init: function init() {
    this.isLocalized = true;
    // Quick fix for bug 831697 (only for v1.0.1),
    // should be fixed when uplifting 814840
    if (this.settings) {
      var lock = this.settings.createLock();
      lock.set({'lockscreen.enabled': false});
    }

    SimManager.init();
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
        UIManager.activationScreen.classList.add('show');
        window.location.hash = '#languages';

        UIManager.splashScreen.classList.remove('show');
      }, kSplashTimeout);
      return;
    }

    // Do we need pin code after splash screen?
    setTimeout(function() {
      // TODO Include VIVO SIM Card management
      // https://bugzilla.mozilla.org/show_bug.cgi?id=801269#c6
      var self = this;
      Navigation.manageStep();
      UIManager.activationScreen.classList.add('show');
      // Remove the splash
      UIManager.splashScreen.classList.remove('show');
    }, kSplashTimeout);
  },

  finish: function finish() {
    WifiManager.finish();
    if (this.settings) {
      console.log('settings existe');
      var req = this.settings.createLock().set({'lockscreen.enabled': true});
    }
    window.close();
  }

};

navigator.mozL10n.ready(function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  if (!AppManager.isLocalized) {
    AppManager.init();
  } else {
    UIManager.initTZ();
    UIManager.mainTitle.innerHTML = _('language');
  }
});

