/* global DataMobile, Navigation, SimManager, TimeManager,
          UIManager, WifiManager, ImportIntegration,
          VersionHelper, LanguageManager, eventSafety */
/* exported AppManager */
'use strict';

var AppManager = {
  EVENT_PREFIX: 'ftu-',

  init: function init(versionInfo) {
    console.log('AppManager init');
    window.performance.mark('initialize');
    this.isInitialized = true;
    this.versionInfo = versionInfo;

    LanguageManager.init();
    UIManager.init();
    Navigation.init();
    console.log('/components init');

    window.performance.mark('navigationLoaded');
    this.publish('setup');

    var splashTimeout = 1025;
    var splashScreenHidden = this.whenEvent(UIManager.splashScreen,
                                            'transitionend',
                                            splashTimeout).then(() => {
      UIManager.container.removeAttribute('aria-hidden');
      console.log('splashScreenHidden callback');
      window.performance.mark('visuallyLoaded');
    });

    var isUpgrade = versionInfo && versionInfo.isUpgrade();
    if (isUpgrade) {
      // if it's an upgrade we just show the update screen to launch tutorial
      splashScreenHidden.then(() => {
        window.performance.mark('fullyLoaded');
      });
      UIManager.changeStatusBarColor(UIManager.DARK_THEME);
      UIManager.splashScreen.classList.remove('show');
      var updateScreen = UIManager.updateScreen;
      console.log('Show the upgrade tutorial');
      // stash the version info
      updateScreen.dataset.upgradeFrom = versionInfo.previous.toString();
      updateScreen.dataset.upgradeTo = versionInfo.current.toString();

      UIManager.activationScreen.classList.remove('show');
      updateScreen.classList.add('show');
      return;
    }

    var languageListReady = this.whenEvent(window, 'languagelistready');
    Promise.all([splashScreenHidden, languageListReady]).then(() => {
      window.performance.mark('fullyLoaded');
    });

    SimManager.init();
    WifiManager.init();
    ImportIntegration.init();
    TimeManager.init();
    DataMobile.init();
    console.log('2ndary components init');

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
      console.log('kSplashTimeout');
      // TODO Include VIVO SIM Card management
      // https://bugzilla.mozilla.org/show_bug.cgi?id=801269#c6
      Navigation.manageStep();
      UIManager.activationScreen.classList.add('show');
      // Remove the splash
      UIManager.splashScreen.classList.remove('show');
      console.log('kSplashTimeout, removing show class from splashScreen');
      window.performance.mark('navigationInteractive');
      window.performance.mark('contentInteractive');
    }, kSplashTimeout);
    console.log('/init');
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

