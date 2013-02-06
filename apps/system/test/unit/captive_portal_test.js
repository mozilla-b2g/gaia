// Captive Portal Test

'use strict';
// Ignore leak, otherwise an error would occur when using MockMozActivity.
mocha.setup({ignoreLeaks: true});

requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mocks_helper.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mock_navigator_settings.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_notification_screen.js');

requireApp('system/js/captive_portal.js');

var mocksForCaptivePortal = ['SettingsListener', 'NotificationScreen'];

mocksForCaptivePortal.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('captive portal > ', function() {
	var realWifiManager;
	var realSettingsListener;
	var realL10n;
	var realSettings;
	var realActivity;
	var mocksHelper;
	var timeout = 10;
	var subject;

	suiteSetup(function() {
		mocksHelper = new MocksHelper(mocksForCaptivePortal);
    mocksHelper.suiteSetup();
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockWifiManager;
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;
	});

	suiteTeardown(function() {
		mocksHelper.suiteTeardown();
		navigator.mozWifiManager = realWifiManager;
		window.SettingsListener = realSettingsListener;
		window.MozActivity = realActivity;
		navigator.mozL10n = realL10n;
		navigator.mozSettings = realSettings;
	});

	setup(function() {
		mocksHelper.setup();
		var event = new MockChromeEvent({
			type: 'captive-portal-login',
			url: 'http://developer.mozilla.org'
		});
		CaptivePortal.init();
		CaptivePortal.handleEvent(event);
	});

	test('system/captive portal login w manual enable wifi', function() {
		MockSettingsListener.mCallback(true);
		assert.ok(MockNotificationScreen.wasMethodCalled['addNotification']);
	});

	test('system/captive portal login w/o manual enable wifi', function() {
		MockSettingsListener.mCallback(true);
		assert.equal(mockMozActivityInstance.name, 'view');
	});
});


mocha.setup({ignoreLeaks: false});

