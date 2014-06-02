/* global DataMobile, Navigation, SimManager, TimeManager,
          UIManager, WifiManager, ImportIntegration */
/* exported AppManager */
'use strict';

var _ = navigator.mozL10n.get;

var AppManager = {

  init: function init() {
    this.isInitialized = true;
    SimManager.init();
    WifiManager.init();
    ImportIntegration.init();
    TimeManager.init();
    UIManager.init();
    Navigation.init();
    DataMobile.init();
    var kSplashTimeout = 700;
    // Retrieve mobile connection if available
    // this is used to keep all tests passing while introducing multi-sim APIs
    var conn = window.navigator.mozMobileConnections &&
               window.navigator.mozMobileConnections[0];

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
      Navigation.manageStep();
      UIManager.activationScreen.classList.add('show');
      // Remove the splash
      UIManager.splashScreen.classList.remove('show');
    }, kSplashTimeout);
  }
};

navigator.mozL10n.ready(function showBody() {
  if (!AppManager.isInitialized) {
    AppManager.init();
  } else {
    UIManager.initTZ();
    UIManager.mainTitle.innerHTML = _('language');
  }
});
