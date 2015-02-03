/* global RootPanelHandler */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

mocha.globals([
  'RootPanelHandler'
]);

Object.defineProperty(document, 'readyState', {
  value: 'loading',
  configurable: true
});
require('/js/startup.js');

suite('RootPanelHandler', function() {
  var rootPanelHandler;
  var rootElement;

  setup(function() {
    loadBodyHTML('./_root.html');
    rootElement = document.getElementById('root');
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('should show/hide nfc item correctly', function() {
    var realNfc;
    var nfcItem;

    setup(function() {
      realNfc = navigator.mozNfc;
      nfcItem = document.querySelector('.nfc-settings');
    });

    teardown(function() {
      navigator.mozNfc = realNfc;
    });

    test('nfc is available', function() {
      navigator.mozNfc = {};
      rootPanelHandler = RootPanelHandler(rootElement);
      assert.isFalse(nfcItem.hidden);
    });

    test('nfc is not available', function() {
      navigator.mozNfc = null;
      rootPanelHandler = RootPanelHandler(rootElement);
      assert.isTrue(nfcItem.hidden);
    });
  });

  suite('should show/hide sim items correctly', function() {
    var realMozMobileConnections;

    var callSettingsItem;
    var dataConnectivityItem;
    var messagingItem;
    var simSecurityItem;
    var simCardManagerItem;

    setup(function() {
      realMozMobileConnections = navigator.mozMobileConnections;
      callSettingsItem = document.getElementById('call-settings');
      dataConnectivityItem = document.getElementById('data-connectivity');
      messagingItem = document.getElementById('messaging-settings');
      simSecurityItem = document.getElementById('simSecurity-settings');
      simCardManagerItem = document.getElementById('simCardManager-settings');
    });

    teardown(function() {
      navigator.mozMobileConnections = realMozMobileConnections;
    });

    test('no mobile connections', function() {
      navigator.mozMobileConnections = null;
      rootPanelHandler = RootPanelHandler(rootElement);
      assert.isTrue(callSettingsItem.hidden);
      assert.isTrue(dataConnectivityItem.hidden);
      assert.isTrue(messagingItem.hidden);
      assert.isTrue(simSecurityItem.hidden);
      assert.isTrue(simCardManagerItem.hidden);
    });

    test('single sim', function() {
      navigator.mozMobileConnections = {
        length: 1
      };
      rootPanelHandler = RootPanelHandler(rootElement);
      assert.isFalse(callSettingsItem.hidden);
      assert.isFalse(dataConnectivityItem.hidden);
      assert.isFalse(messagingItem.hidden);
      assert.isFalse(simSecurityItem.hidden);
      assert.isTrue(simCardManagerItem.hidden);
    });

    test('multiple sims', function() {
      navigator.mozMobileConnections = {
        length: 2
      };
      rootPanelHandler = RootPanelHandler(rootElement);
      assert.isFalse(callSettingsItem.hidden);
      assert.isFalse(dataConnectivityItem.hidden);
      assert.isFalse(messagingItem.hidden);
      assert.isTrue(simSecurityItem.hidden);
      assert.isFalse(simCardManagerItem.hidden);
    });
  });

  suite('should show/hide developer menu item correctly', function() {
    var realMozSettings;
    var developerMenuItem;
    var fakeSettings;

    setup(function() {
      realMozSettings = navigator.mozSettings;
      navigator.mozSettings = {
        createLock: function() {
          return {
            get: function(name) {
              if (name === 'developer.menu.enabled') {
                return Promise.resolve(fakeSettings);
              } else {
                return Promise.reject();
              }
            }
          };
        }
      };
      developerMenuItem =
        document.querySelector('[data-show-name="developer.menu.enabled"]');
    });

    teardown(function() {
      navigator.mozSettings = realMozSettings;
    });

    test('developer menu is enabled', function(done) {
      fakeSettings = {
        'developer.menu.enabled': true
      };
      rootPanelHandler = RootPanelHandler(rootElement);
      rootPanelHandler._updateDeveloperMenuItem().then(function() {
        assert.isFalse(developerMenuItem.hidden);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('developer menu is disabled', function(done) {
      fakeSettings = {
        'developer.menu.enabled': false
      };
      rootPanelHandler = RootPanelHandler(rootElement);
      rootPanelHandler._updateDeveloperMenuItem().then(function() {
        assert.isTrue(developerMenuItem.hidden);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });
});
