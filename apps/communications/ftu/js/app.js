'use strict';

var _ = navigator.mozL10n.get;

var AppManager = {

  init: function init() {
    this.isLocalized = true;
    SimManager.init();
    WifiManager.init();
    ImportIntegration.init();
    TimeManager.init();
    UIManager.init();
    Navigation.init();
    DataMobile.init();
    VariantManager.init();
    var kSplashTimeout = 700;
    // Retrieve mobile connection if available
    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var conn = window.navigator.mozMobileConnection ||
               window.navigator.mozMobileConnections &&
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
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // Helper to get settings
  var getSetting = function(type, cb) {
    var setting = 'deviceinfo.' + type;
    var req = navigator.mozSettings.createLock().get(setting);
    req.onsuccess = function() {
      var value = req.result[setting];
      cb(value);
    }
    req.onerror = function() {
      console.log('Can\'t get ' + setting + ': ' + req.error);
    }
  }
  getSetting('previous_os', function(previous_os) {
    getSetting('os', function(os) {
      // This key determine if udpate ftu exists
      var stepsKey = previous_os + '..' + os;
      var hasSteps = Object.keys(TutorialSteps).indexOf(stepsKey) > 0;
      if (hasSteps) {
        // Play the FTU Tuto steps directly on update
        UIManager.init();
        UIManager.splashScreen.classList.remove('show');
        UIManager.activationScreen.classList.remove('show');
        UIManager.updateScreen.classList.add('show');
        Tutorial.init(stepsKey);
      } else {
        if (!AppManager.isLocalized) {
          AppManager.init();
        } else {
          UIManager.initTZ();
          UIManager.mainTitle.innerHTML = _('language');
        }
      }
    });
  });
});

