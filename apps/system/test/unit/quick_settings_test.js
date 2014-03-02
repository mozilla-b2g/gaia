// Quick Settings Test
'use strict';

mocha.globals(['SettingsHelper']);

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_settings_helper.js');

requireApp('system/js/quick_settings.js');

var mocksForQuickSettings = new MocksHelper(['SettingsListener']).init();

suite('quick settings > ', function() {
  var realWifiManager;
  var realSettingsListener;
  var realL10n;
  var realSettings;
  var realMozMobileConnection;
  var realActivity;
  var fakeQuickSettingsNode;
  var realSettingsHelper;

  mocksForQuickSettings.attachTestHelpers();
  suiteSetup(function() {
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockWifiManager;
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;
    try {
      realActivity = window.MozActivity;
    }
    catch (e) {
      console.log('Access MozActivity failed, passed realActivity assignment');
    }
    window.MozActivity = MockMozActivity;
    realSettingsHelper = window.SettingsHelper;
    window.SettingsHelper = MockSettingsHelper;
  });

  suiteTeardown(function() {
    navigator.mozWifiManager = realWifiManager;
    window.SettingsListener = realSettingsListener;
    navigator.MozMobileConnection = realMozMobileConnection;
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realSettings;
    if (typeof(realActivity) !== 'undefined') {
      window.MozActivity = realActivity;
    }
    window.SettingsHelper = realSettingsHelper;
    realSettingsHelper = null;
  });

  setup(function() {
    fakeQuickSettingsNode = document.createElement('div');
    fakeQuickSettingsNode.id = 'quick-settings';
    document.body.appendChild(fakeQuickSettingsNode);

    QuickSettings.ELEMENTS.forEach(function testAddElement(elementName) {
      var elt = document.createElement('div');
      elt.id = 'quick-settings-' + elementName;
      fakeQuickSettingsNode.appendChild(elt);
    });
    QuickSettings.init();
    window.SettingsHelper.mSetup();
  });

  teardown(function() {
    fakeQuickSettingsNode.parentNode.removeChild(fakeQuickSettingsNode);
  });

  test('system/quick settings/enable wifi: Connected', function() {
    MockWifiManager.connection.status = 'connected';
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    QuickSettings.handleEvent({
      type: 'wifi-statuschange',
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], true);
  });

  test('system/quick settings/enable wifi: Connecting failed', function() {
    MockWifiManager.connection.status = 'connectingfailed';
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    QuickSettings.handleEvent({
      type: 'wifi-statuschange',
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], false);
  });

  test('system/quick settings/enable wifi: Disconnected', function() {
    MockWifiManager.connection.status = 'disconnected';
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    QuickSettings.handleEvent({
      type: 'wifi-statuschange',
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], false);
  });

  test('system/quick settings/disable wifi', function() {
    MockSettingsListener.mCallbacks['wifi.enabled'](true);
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], false);
  });

  var testCases = [
  {
    'title': 'Style sheet is not quick settings style sheet',
    'styleSheets': [
    {
      'href':
          'app://system.gaiamobile.org/fake/quick_settings/quick_settings.css',
      'cssRules': [
      {
        'selectorText': '#quick-settings-data[data-enabled][data-network="2G"]',
        'style': {
          'backgroundImage': 'url("images/data-2g-on.png")'
        }
      }]
    }],
    'newValues': {
      'data_2G': '/changed/2G_OFF.png',
      'data_2G_enabled': '/changed/2G_ON.png'
    },
    'expectedResult': {
      'backgroundImage': 'url("images/data-2g-on.png")'
    }
  },
  {
    'title': 'Quick settings style sheet and not CSSRule',
    'styleSheets': [
    {
      'href':
         'app://system.gaiamobile.org/style/quick_settings/quick_settings.css',
      'cssRules': [
      {
        'selectorText':
           '#quick-settings-should-not-change[data-enabled][data-network="2G"]',
        'style': {
          'backgroundImage': 'url("images/data-2g-on.png")'
        }
      }]
    }],
    'newValues': {
      'data_2G': '/changed/2G_OFF.png',
      'data_2G_enabled': '/changed/2G_ON.png'
    },
    'expectedResult': {
      'backgroundImage': 'url("images/data-2g-on.png")'
    }
  },
  {
    'title': 'Quick settings style sheet, cssRule and enable Icon',
    'styleSheets': [
    {
      'href':
        'app://system.gaiamobile.org/style/quick_settings/quick_settings.css',
      'cssRules': [
      {
        'selectorText': '#quick-settings-data[data-enabled][data-network="2G"]',
        'style': {
          'backgroundImage': 'url("images/data-2g-on.png")'
        }
      }]
    }],
    'newValues': {
      'data_2G': '/changed/2G_OFF.png',
      'data_2G_enabled': '/changed/2G_ON.png'
    },
    'expectedResult': {
      'backgroundImage': 'url("/changed/2G_ON.png")'
    }
  },
  {
    'title': 'Quick settings style sheet, cssRule and disabled Icon',
    'styleSheets': [
    {
      'href':
        'app://system.gaiamobile.org/style/quick_settings/quick_settings.css',
      'cssRules': [
      {
        'selectorText': '#quick-settings-data[data-network="2G"]',
        'style': {
          'backgroundImage': 'url("images/data-2g-off.png")'
        }
      }]
    }],
    'newValues': {
      'data_2G': '/changed/2G_OFF.png',
      'data_2G_enabled': '/changed/2G_ON.png'
    },
    'expectedResult': {
      'backgroundImage': 'url("/changed/2G_OFF.png")'
    }
  }];

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      QuickSettings.changeQSStyleSheet(testCase.styleSheets, 'data', 'network',
                                       testCase.newValues);
      assert.equal(testCase.styleSheets[0].cssRules[0].style.backgroundImage,
                   testCase.expectedResult.backgroundImage);
    });
  });
});
