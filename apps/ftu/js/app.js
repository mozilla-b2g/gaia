/* global DataMobile, Navigation, SimManager, TimeManager,
          UIManager, WifiManager, ImportIntegration, Tutorial, Promise,
          VersionHelper */
/* exported AppManager */
'use strict';

var _ = navigator.mozL10n.get;

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

  init: function init(isUpgrade) {
    this.isInitialized = true;

    UIManager.init();
    Navigation.init();

    if(isUpgrade) {
      return;
    }

    // Send message to populate preinstalled collections
    notifyCollection();

    SimManager.init();
    WifiManager.init();
    ImportIntegration.init();
    TimeManager.init();
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

  var versionInfo;
  Promise.all([
    VersionHelper.getVersionInfo().then(function(info) {
      versionInfo = info;
    }),
    Tutorial.loadConfig()
  ]).then(function() {

    if (!AppManager.isInitialized) {
      AppManager.init(versionInfo.isUpgrade());
    }

    if (versionInfo.isUpgrade()) {
      var stepsKey = versionInfo.delta();
      // Play the FTU Tuto steps directly on update
      UIManager.splashScreen.classList.remove('show');
      UIManager.activationScreen.classList.remove('show');
      UIManager.updateScreen.classList.add('show');

      if (stepsKey && Tutorial.config[stepsKey]) {
        Tutorial.init(stepsKey);
      } else {
        // play the whole tutorial if there is no specific upgrade steps
        Tutorial.init();
      }
    } else {
      UIManager.initTZ();
      UIManager.mainTitle.innerHTML = _('language');
    }
  });
});
