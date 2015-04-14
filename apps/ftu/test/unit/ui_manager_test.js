/* global MockFxAccountsIACHelper, MocksHelper, MockL10n, MockMozApps,
          MockTzSelect, Navigation, UIManager, WifiManager, WifiUI,
          MockSettingsListener, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

requireApp('ftu/js/ui.js');
requireApp('ftu/js/external_links.js');
requireApp('ftu/js/navigation.js');

requireApp('ftu/test/unit/mock_tutorial.js');
requireApp('ftu/test/unit/mock_mozapps.js');
requireApp('ftu/test/unit/mock_time_manager.js');
requireApp('ftu/test/unit/mock_wifi_manager.js');
requireApp('ftu/test/unit/mock_tz_select.js');
requireApp('ftu/test/unit/mock_operatorVariant.js');
requireApp('ftu/test/unit/mock_fx_accounts_iac_helper.js');
requireApp('ftu/test/unit/mock_utils.js');
requireApp('ftu/test/unit/mock_data_mobile.js');

var mocksHelperForUI = new MocksHelper([
  'Tutorial',
  'TimeManager',
  'WifiUI',
  'WifiManager',
  'OperatorVariant',
  'utils',
  'DataMobile',
  'SettingsListener'
]).init();

if (!window.tzSelect) {
  window.tzSelect = null;
}

suite('UI Manager > ', function() {
  var realL10n,
      realMozApps,
      realFxAccountsIACHelper,
      realTzSelect,
      realSettings,
      realSettingsListener;
  var mocksHelper = mocksHelperForUI;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realTzSelect = window.tzSelect;
    window.tzSelect = MockTzSelect;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockMozApps;

    realFxAccountsIACHelper = window.FxAccountsIACHelper;
    window.FxAccountsIACHelper = MockFxAccountsIACHelper;

    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;
    navigator.mozSettings.mSettings['geolocation.enabled'] = true;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    mocksHelper.suiteSetup();
    loadBodyHTML('/index.html');

    UIManager.init();
    Navigation.init();
    UIManager.activationScreen.classList.add('show');
    window.location.hash = '#languages';
    UIManager.splashScreen.classList.remove('show');
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();

    navigator.mozL10n = realL10n;
    realL10n = null;

    window.tzSelect = realTzSelect;
    realTzSelect = null;

    navigator.mozApps = realMozApps;
    realMozApps = null;

    window.FxAccountsIACHelper = realFxAccountsIACHelper;
    realFxAccountsIACHelper = null;

    navigator.mozSettings = realSettings;
    window.SettingsListener = realSettingsListener;
  });

  suite('Date & Time >', function() {
    suiteSetup(function() {
      Navigation.currentStep = 4;
      Navigation.manageStep();
    });

    suiteTeardown(function() {
      Navigation.currentStep = 1;
      Navigation.manageStep();
    });

    suite('change Time Zone >', function() {
      var timezoneTitle,
          timezoneOverlay,
          regionLabel,
          cityLabel,
          timeLabel,
          FAKE_TIMEZONE;
      var localizeSpy,
          localeFormatSpy;

      setup(function() {
        FAKE_TIMEZONE = {
          utcOffset: '+0:00',
          region: 'fakeRegion',
          city: 'fakeCity'
        };

        timezoneTitle = document.getElementById('time-zone-title');
        timezoneOverlay = document.getElementById('time_zone_overlay');
        regionLabel = document.getElementById('tz-region-label');
        cityLabel = document.getElementById('tz-city-label');
        timeLabel = document.getElementById('time-configuration-label');

        localizeSpy = this.sinon.spy(navigator.mozL10n, 'setAttributes');
        localeFormatSpy =
          this.sinon.spy(navigator.mozL10n.DateTimeFormat.prototype,
                        'localeFormat');
        UIManager.setTimeZone(FAKE_TIMEZONE);
      });

      test('should set/clear timeZoneNeedsConfirmation flag', function() {
        UIManager.setTimeZone(FAKE_TIMEZONE, true);
        assert.isTrue(UIManager.timeZoneNeedsConfirmation);
        UIManager.setTimeZone(FAKE_TIMEZONE, false);
        assert.isFalse(UIManager.timeZoneNeedsConfirmation);
      });

      test('should localize title', function() {
        assert.isTrue(localizeSpy.calledOnce);
        assert.isTrue(localizeSpy.calledWith(timezoneTitle,
                                         'timezoneTitle',
                                         FAKE_TIMEZONE));
      });

      test('should update region', function() {
        assert.equal(regionLabel.textContent, FAKE_TIMEZONE.region);
      });

      test('should highlight timezone in map', function() {
        assert.equal(timezoneOverlay.className,
                     'UTC' + FAKE_TIMEZONE.utcOffset.replace(/[+:]/g, ''));
      });

      test('should update city', function() {
        assert.equal(cityLabel.textContent, FAKE_TIMEZONE.city);
      });

      test('should format the time', function() {
        assert.isTrue(localeFormatSpy.called);
      });
    });
  });

  suite('Geolocation section', function() {

    setup(function() {
      Navigation.currentStep = 5;
      Navigation.manageStep();
    });

    suiteTeardown(function() {
      Navigation.currentStep = 1;
      Navigation.manageStep();
    });

    test('initial value', function() {
      assert.isTrue(MockNavigatorSettings.mSettings['geolocation.enabled']);
      // we set initial value at suite startup
      assert.isTrue(UIManager.geolocationCheckbox.checked);
    });

    test('setting observer updates checked value', function() {
      MockSettingsListener.mTriggerCallback('geolocation.enabled', false);
      assert.isFalse(UIManager.geolocationCheckbox.checked);
    });

  });

  suite('Firefox Accounts section', function() {
    var localizeSpy;
    var nextButton;
    var createAccountButton;

    suiteSetup(function() {
      Navigation.currentStep = 7;
      Navigation.manageStep();
    });

    suiteTeardown(function() {
      Navigation.currentStep = 1;
      Navigation.manageStep();
    });

    setup(function() {
      localizeSpy = this.sinon.spy(navigator.mozL10n, 'setAttributes');
      nextButton = document.getElementById('forward');
      createAccountButton = document.getElementById('fxa-create-account');
    });

    teardown(function() {
      navigator.mozL10n.setAttributes.restore();
    });

    suite('Verified Firefox Account login', function() {
      setup(function() {
        MockFxAccountsIACHelper.account = {
          email: 'foo@bar.com',
          verified: true
        };
        nextButton.setAttribute('data-l10n-id', 'skip');
        UIManager.onFxAFlowDone();
      });

      teardown(function() {
        MockFxAccountsIACHelper.reset();
      });

      test('Should show correct success message', function() {
        assert.isTrue(localizeSpy.calledOnce);
        assert.equal('fxa-signed-in', localizeSpy.args[0][1]);
      });

      test('Should set correct label on button', function() {
        var dataL10n = nextButton.getAttribute('data-l10n-id');
        assert.equal(dataL10n, 'navbar-next');
      });

      test('Should disable create account button', function() {
        assert.isTrue(createAccountButton.disabled);
      });
    });

    suite('Unverified Firefox Account login', function() {
      setup(function() {
        MockFxAccountsIACHelper.account= {
          email: 'foo@bar.com',
          verified: false
        };
        nextButton.setAttribute('data-l10n-id', 'skip');
        UIManager.onFxAFlowDone();
      });

      teardown(function() {
        MockFxAccountsIACHelper.reset();
      });

      test('Should show correct success message', function() {
        assert.isTrue(localizeSpy.calledOnce);
        assert.equal('fxa-email-sent', localizeSpy.args[0][1]);
      });

      test('Should set correct label on button', function() {
        var dataL10n = nextButton.getAttribute('data-l10n-id');
        assert.equal(dataL10n, 'navbar-next');
      });

      test('Should disable create account button', function() {
        assert.isTrue(createAccountButton.disabled);
      });
    });

    suite('Account login - getAccounts no account', function() {
      setup(function() {
        createAccountButton.disabled = false;
        nextButton.setAttribute('data-l10n-id', 'skip');
        UIManager.onFxAFlowDone();
      });

      test('Should not show any success message', function() {
        assert.isFalse(localizeSpy.calledOnce);
      });

      test('Button label should still be skip', function() {
        var dataL10n = nextButton.getAttribute('data-l10n-id');
        assert.equal(dataL10n, 'skip');
      });

      test('Should not disable create account button', function() {
        assert.isFalse(createAccountButton.disabled);
      });
    });

    suite('Account login - getAccounts error', function() {
      setup(function() {
        MockFxAccountsIACHelper.getAccountsError = 'WHATEVER';
        createAccountButton.disabled = false;
        nextButton.setAttribute('data-l10n-id', 'skip');
        UIManager.onFxAFlowDone();
      });

      teardown(function() {
        MockFxAccountsIACHelper.reset();
      });

      test('Button label should still be skip', function() {
        var dataL10n = nextButton.getAttribute('data-l10n-id');
        assert.equal(dataL10n, 'skip');
      });

      test('Should not disable create account button', function() {
        assert.isFalse(createAccountButton.disabled);
      });
    });

    suite('FTU initiates with a existing FxA login - happy path', function() {
      setup(function() {
        MockFxAccountsIACHelper.account = {
          email: 'foo@bar.com',
          verified: true
        };
        UIManager.skipFxA = false;
        UIManager.checkInitialFxAStatus();
      });

      teardown(function() {
        MockFxAccountsIACHelper.reset();
      });

      test('Should not skip FxA', function() {
        assert.isFalse(UIManager.skipFxA);
      });
    });

    suite('FTU initiates with a existing FxA login - getAccounts does not ' +
          'give any results (or maybe it does but not in time)', function() {
      setup(function() {
        MockFxAccountsIACHelper.getAccountsNoCallback = true;
        UIManager.skipFxA = false;
        UIManager.checkInitialFxAStatus();
      });

      teardown(function() {
        MockFxAccountsIACHelper.reset();
      });

      test('Should skip FxA', function() {
        assert.isTrue(UIManager.skipFxA);
      });
    });

    suite('FTU initiates with a existing FxA login - getAccounts error - ' +
          'logout ok', function() {
      var logoutSpy;

      setup(function() {
        MockFxAccountsIACHelper.getAccountsError = 'WHATEVER';
        UIManager.skipFxA = false;
        logoutSpy = this.sinon.spy(MockFxAccountsIACHelper, 'logout');
        UIManager.checkInitialFxAStatus();
      });

      teardown(function() {
        MockFxAccountsIACHelper.reset();
      });

      test('Should logout', function() {
        assert.isTrue(logoutSpy.calledOnce);
      });

      test('And not skip FxA', function() {
        assert.isFalse(UIManager.skipFxA);
      });
    });

    suite('FTU initiates with a existing FxA login - getAccounts error - ' +
          'logout no result or error', function() {
      var logoutSpy;

      setup(function() {
        MockFxAccountsIACHelper.getAccountsError = 'WHATEVER';
        MockFxAccountsIACHelper.logoutNoCallback = true;
        UIManager.skipFxA = false;
        logoutSpy = this.sinon.spy(MockFxAccountsIACHelper, 'logout');
        UIManager.checkInitialFxAStatus();
      });

      teardown(function() {
        MockFxAccountsIACHelper.reset();
      });

      test('Should try to logout', function() {
        assert.isTrue(logoutSpy.calledOnce);
      });

      test('But still skip FxA', function() {
        assert.isTrue(UIManager.skipFxA);
      });
    });

  });

  suite('Browser Privacy section', function() {
    var page,
        input;

    suiteSetup(function() {
      page = document.getElementById('browser_privacy');
      input = document.getElementById('newsletter-input');

      Navigation.currentStep = 8;
      Navigation.manageStep();
    });

    suiteTeardown(function() {
      Navigation.currentStep = 1;
      Navigation.manageStep();
    });

    setup(function() {
      sinon.spy(UIManager, 'scrollToElement');
    });

    teardown(function() {
      UIManager.scrollToElement.restore();
    });

    test('Email input is scrolled when focused > ', function(done) {
      var focusEvt = new CustomEvent('focus');
      var resizeEvt = new CustomEvent('resize');

      input.dispatchEvent(focusEvt);
      window.dispatchEvent(resizeEvt);

      setTimeout(function() {
        assert.isTrue(UIManager.scrollToElement.calledOnce);
        assert.isTrue(UIManager.scrollToElement.calledWith(page, input));
        done();
      }, 100); // there's a timeout on the code
    });
  });

  suite('Change app theme', function() {
    var meta;
    suiteSetup(function() {
      meta = document.createElement('meta');
      meta.content = 'red';
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    });

    teardown(function() {
      document.head.removeChild(meta);
    });

    test('Should change the theme color of the app', function() {
      UIManager.changeStatusBarColor('black');
      assert.equal(meta.getAttribute('content'), 'black');
    });
  });

  suite('Wifi section', function() {
    setup(function() {
      UIManager.init();
      Navigation.currentStep = 3;
      Navigation.manageStep();

      this.sinon.spy(WifiManager, 'scan');
      this.sinon.spy(WifiUI, 'joinNetwork');
      this.sinon.spy(WifiUI, 'addHiddenNetwork');
      this.sinon.spy(WifiUI, 'joinHiddenNetwork');
    });

    teardown(function() {
      Navigation.currentStep = 1;
      Navigation.manageStep();
    });

    test('Refresh networks >', function() {
      UIManager.wifiRefreshButton.click();
      assert.isTrue(WifiManager.scan.calledWith(WifiUI.renderNetworks),
        'should call for a scan of the networks');
    });

    test('Add hidden network >', function() {
      UIManager.joinHiddenButton.click();
      assert.isTrue(WifiUI.addHiddenNetwork.calledOnce,
        'addHiddenNetwork should be called');
    });

    test('Join hidden network > ', function() {
      // simulate we are on Add Hidden Wifi screen
      window.location.hash = '#hidden-wifi-authentication';
      UIManager.wifiJoinButton.disabled = false;
      UIManager.wifiJoinButton.click();
      assert.ok(WifiUI.joinHiddenNetwork.calledOnce,
        'joinHiddenNetwork should be called');
    });

    test('Join hidden network > ', function() {
      UIManager.wifiJoinButton.disabled = false;
      UIManager.wifiJoinButton.click();
      assert.ok(WifiUI.joinNetwork.calledOnce,
        'joinNetwork should be called');
    });
  });

});
