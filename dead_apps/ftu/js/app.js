/* global DataMobile, Navigation, SimManager, TimeManager,
          UIManager, WifiManager, ImportIntegration, Tutorial,
          VersionHelper, LanguageManager, eventSafety */
/* exported AppManager */
'use strict';

var AppManager = {
  EVENT_PREFIX: 'ftu-',

  init: function init(versionInfo) {
    window.performance.mark('initialize');
    this.isInitialized = true;

    LanguageManager.init();
    UIManager.init();
    Navigation.init();

    window.performance.mark('navigationLoaded');
    this.publish('setup');

    var splashTimeout = 1025;
    var splashScreenHidden = this.whenEvent(UIManager.splashScreen,
                                            'transitionend',
                                            splashTimeout).then(() => {
      UIManager.container.removeAttribute('aria-hidden');
      window.performance.mark('visuallyLoaded');
    });

    var languageListReady = this.whenEvent(window, 'languagelistready');

    Promise.all([splashScreenHidden, languageListReady]).then(() => {
      window.performance.mark('fullyLoaded');
    });

    // if it's an upgrade we can jump to tutorial directly
    if (versionInfo && versionInfo.isUpgrade()) {
      var stepsKey = versionInfo.delta();
      // Play the FTU Tuto steps directly on update
      UIManager.changeStatusBarColor(UIManager.DARK_THEME);
      UIManager.splashScreen.classList.remove('show');
      UIManager.activationScreen.classList.remove('show');
      UIManager.updateScreen.classList.add('show');

      // Load and play the what's new tutorial
      Tutorial.init(stepsKey, function() {
        Tutorial.start();
      });
      return;
    }

    SimManager.init();
    WifiManager.init();
    ImportIntegration.init();
    TimeManager.init();
    DataMobile.init();
    Tutorial.init();

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
        window.performance.mark('navigationInteractive');
        window.performance.mark('contentInteractive');
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
      window.performance.mark('navigationInteractive');
      window.performance.mark('contentInteractive');
    }, kSplashTimeout);
  },
  whenEvent: function (target, name, timeoutMs) {
    return new Promise((resolve, reject) => {
      eventSafety(target, name, resolve, timeoutMs || 1000);
    });
  },
  publish: function(name, detail) {
    var evt = new CustomEvent(this.EVENT_PREFIX + name,
    {
      bubbles: true,
      detail: detail || this
    });
    window.dispatchEvent(evt);
  }
};

function init() {
  VersionHelper.getVersionInfo().then(function(versionInfo) {
    if (!AppManager.isInitialized) {
      AppManager.init(versionInfo);
    } else {
      UIManager.initTZ();
      if (!UIManager.mainTitle.hasAttribute('data-l10n-id')) {
        UIManager.mainTitle.setAttribute('data-l10n-id', 'language');
      }
    }
  });
}


init();
document.addEventListener('DOMRetranslated', init);

document.l10n.ready.then(() => {
  window.performance.mark('l10nready');
});

