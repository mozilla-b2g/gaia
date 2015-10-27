/* global MockNavigatorSettings */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('Root', function() {
  var realMobileConnections;
  var realSettings;
  var panel;

  var map = {
    '*': {
      'shared/lazyLoader': 'MockLazyLoader'
    }
  };
  var modules = [
    'panels/root/root',
    'MockLazyLoader',
    'shared_mocks/mock_navigator_moz_settings'
  ];

  setup(function(done) {
    this.MockLazyLoader = {
      load: function(scripts, callback) { setTimeout(callback); }
    };

    var requireCtx = testRequire([], map, function() {});
    loadBodyHTML('_root.html');

    define('MockLazyLoader', function() {
      return this.MockLazyLoader;
    }.bind(this));

    requireCtx(modules, function(Root, MockLazyLoader, MockNavigatorSettings) {
      realMobileConnections = navigator.mozMobileConnections;
      realSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      panel = Root();
      done();
    });
  });

  teardown(function() {
    navigator.mozSettings = realSettings;
    navigator.mozMobileConnections = realMobileConnections;
  });

  suite('init', function() {
    var fakeTimer;

    setup(function() {
      fakeTimer = sinon.useFakeTimers();
      this.sinon.stub(panel, '_loadScripts');
      panel.init(document.body);
    });

    teardown(function() {
      fakeTimer.restore();
    });

    test('_loadScripts should be called', function() {
      fakeTimer.tick();
      assert.ok(panel._loadScripts.called);
    });
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
      navigator.mozNfc = {'aa': 'bb'};
      panel.init(document.body);
      assert.isFalse(nfcItem.hidden);
    });

    test('nfc is not available', function() {
      navigator.mozNfc = null;
      panel.init(document.body);
      assert.isTrue(nfcItem.hidden);
    });
  });

  suite('should show/hide sim items correctly', function() {
    var callSettingsItem;
    var dataConnectivityItem;
    var messagingItem;
    var simSecurityItem;
    var simCardManagerItem;

    test('no mobile connections', function() {
      navigator.mozMobileConnections = null;
      panel.init(document.body);
      callSettingsItem = document.getElementById('call-settings');
      dataConnectivityItem = document.getElementById('data-connectivity');
      messagingItem = document.getElementById('messaging-settings');
      simSecurityItem = document.getElementById('simSecurity-settings');
      simCardManagerItem = document.getElementById('simCardManager-settings');
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
      panel.init(document.body);
      callSettingsItem = document.getElementById('call-settings');
      dataConnectivityItem = document.getElementById('data-connectivity');
      messagingItem = document.getElementById('messaging-settings');
      simSecurityItem = document.getElementById('simSecurity-settings');
      simCardManagerItem = document.getElementById('simCardManager-settings');
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
      panel.init(document.body);
      callSettingsItem = document.getElementById('call-settings');
      dataConnectivityItem = document.getElementById('data-connectivity');
      messagingItem = document.getElementById('messaging-settings');
      simSecurityItem = document.getElementById('simSecurity-settings');
      simCardManagerItem = document.getElementById('simCardManager-settings');
      assert.isFalse(callSettingsItem.hidden);
      assert.isFalse(dataConnectivityItem.hidden);
      assert.isFalse(messagingItem.hidden);
      assert.isTrue(simSecurityItem.hidden);
      assert.isFalse(simCardManagerItem.hidden);
    });
  });

  suite('should show/hide developer menu item correctly', function() {
    var developerMenuItem;

    setup(function() {
      MockNavigatorSettings.mSetup();
    });

    teardown(function() {
      MockNavigatorSettings.mTeardown();
    });

    test('developer menu is enabled', function(done) {
      MockNavigatorSettings.mSet({
        'developer.menu.enabled': true
      });
      panel.init(document.body);
      developerMenuItem =
        document.querySelector('[data-show-name="developer.menu.enabled"]');
      panel._showDeveloperMenuItem().then(function() {
        assert.isFalse(developerMenuItem.hidden);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('developer menu is disabled', function(done) {
      MockNavigatorSettings.mSet({
        'developer.menu.enabled': false
      });
      panel.init(document.body);
      developerMenuItem =
        document.querySelector('[data-show-name="developer.menu.enabled"]');
      panel._showDeveloperMenuItem().then(function() {
        assert.isTrue(developerMenuItem.hidden);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });
});
