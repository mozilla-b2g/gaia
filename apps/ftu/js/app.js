/* global Utils, DataMobile, Navigation, SimManager, TimeManager,
          UIManager, WifiManager, ImportIntegration, Tutorial,
          VersionHelper, LanguageManager */
/* exported AppManager */
(function(exports) {
'use strict';

function _AppManager() {
  /*jshint validthis:true */
}

_AppManager.prototype = {
  EVENT_PREFIX: 'ftu-',

  debug: function() {
    var args = Array.from(arguments);
    args.unshift('AppManager');
    console.log.apply(console, args);
  },

  bootstrap: function() {
    this.broadcast('bootstrap');
    var whenFirstLocalized = new Promise((resolve, reject) => {
      navigator.mozL10n.once(function firstLocalized() {
        console.log('AppManager localized');
        window.performance.mark('l10nready');
        resolve();
      });
    });
    var gotVersionInfo = VersionHelper.getVersionInfo();

    return Promise.all([
      whenFirstLocalized,
      gotVersionInfo
    ]).then((results) => {
      console.log('gotVersionInfo: ', results[1]);
      this.versionInfo = results[1];
    }).catch(e => {
      console.warn('Error in FTU startup path: ', e);
    });
  },

  init: function init() {
    var versionInfo = this.versionInfo;

    window.performance.mark('initialize');
    this.isInitialized = true;

    UIManager.init();
    LanguageManager.init();
    Navigation.init();

    window.performance.mark('navigationLoaded');
    // Send message to populate preinstalled collections.
    // This needs to be done for both upgrade and non-upgrade flows.
    this.notify('setup', { txt: 'setup' }, {
      connectionRejectedMessage: 'Cannot notify of setup',
      noConnectMethodMessage: 'mozApps does not have a connect method. ' +
                              'Cannot launch the collection preload process.'
    });

    var splashTimeout = 1025;
    var splashScreenHidden = Utils.whenEvent(UIManager.splashScreen,
                                            'transitionend',
                                            splashTimeout).then(() => {
      UIManager.container.removeAttribute('aria-hidden');
      window.performance.mark('visuallyLoaded');
    });

    var languageListReady = new Promise((resolve, reject) => {
      function onPanelReady(panel) {
        if (panel.name === 'language') {
          window.removeEventListener('panelready');
          resolve(panel);
        }
      }
      window.addEventListener('panelready', onPanelReady);
    });

    Promise.all([splashScreenHidden, languageListReady]).then(() => {
      window.performance.mark('fullyLoaded');
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

  notify: function(keyword, message, options = {}) {
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      if (app.connect) {
        app.connect(keyword).then(function onConnAccepted(ports) {
          // Get the token data info to attach to message
          ports.forEach(function(port) {
            port.postMessage(message);
          });
        }, function onConnRejected(reason) {
          var msg = options.connectionRejectedMessage ||
                    ('Cannot notify of ' + keyword + ': ');
          console.error(msg, reason);
        });
      } else {
        var msg = options.noConnectMethodMessage ||
                  ('mozApps does not have a connect method. ' +
                   'Cannot notify of ' + keyword);
        console.error(msg);
      }
    };
    // also raise as custom event on our window
    this.broadcast(keyword);
  },

  broadcast: function(name, payload) {
    window.dispatchEvent(new CustomEvent(this.EVENT_PREFIX + name),
                         { detail: payload || this });
  }
};

var AppManager = exports.AppManager = new _AppManager();
AppManager.bootstrap().then(() => {
  AppManager.init();
});

})(window);
