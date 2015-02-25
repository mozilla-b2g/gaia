/* global DataMobile, Navigation, SimManager, TimeManager,
          UIManager, WifiManager, ImportIntegration, Tutorial,
          VersionHelper, LanguageManager */
/* exported AppManager */
'use strict';

function notifyCollection() {
  navigator.mozApps.getSelf().onsuccess = function(evt) {
    var app = evt.target.result;
    if (app.connect) {
      app.connect('setup').then(function onConnAccepted(ports) {
        // Get the token data info to attach to message
        var message = {
          txt: 'setup'
        };
        ports.forEach(function(port) {
          port.postMessage(message);
        });
      }, function onConnRejected(reason) {
        console.error('Cannot notify collection: ', reason);
      });
    } else {
      console.error ('mozApps does not have a connect method. ' +
                     'Cannot launch the collection preload process.');

    }
  };
}

var AppManager = {

  init: function init(versionInfo) {
    this.isInitialized = true;

    LanguageManager.init();
    UIManager.init();
    Navigation.init();

    // Send message to populate preinstalled collections.
    // This needs to be done for both upgrade and non-upgrade flows.
    notifyCollection();

    UIManager.splashScreen.addEventListener('transitionend', function onEnd() {
      UIManager.splashScreen.removeEventListener('transitionend', onEnd);
      UIManager.container.removeAttribute('aria-hidden');
    });

    // if it's an upgrade we can jump to tutorial directly
    if (versionInfo && versionInfo.isUpgrade()) {
      var stepsKey = versionInfo.delta();
      // Play the FTU Tuto steps directly on update
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
});
