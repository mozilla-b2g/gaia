/* global MockFxAccountsIACHelper, MocksHelper, MockL10n, MockMozApps,
          MockTzSelect, Navigation, UIManager, WifiUI */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

requireApp('ftu/js/ui.js');
requireApp('ftu/js/external_links.js');
requireApp('ftu/js/navigation.js');
requireApp('ftu/js/wifi.js');

requireApp('ftu/test/unit/mock_l10n.js');
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
  'WifiManager',
  'OperatorVariant',
  'utils',
  'DataMobile'
]).init();

if (!window.tzSelect) {
  window.tzSelect = null;
}

suite('UI Manager > ', function() {
  var realL10n,
      realMozApps,
      realFxAccountsIACHelper,
      realTzSelect;
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

        localizeSpy = this.sinon.spy(navigator.mozL10n, 'localize');
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

  suite('Firefox Accounts section', function() {
    var localizeSpy;
    suiteSetup(function() {
      Navigation.currentStep = 7;
      Navigation.manageStep();
    });

    suiteTeardown(function() {
      Navigation.currentStep = 1;
      Navigation.manageStep();
    });

    setup(function() {
      localizeSpy = this.sinon.spy(navigator.mozL10n, 'localize');
    });

    teardown(function() {
      navigator.mozL10n.localize.restore();
    });

    test('Show correct success message after verified login', function() {
      var verifiedAcct = {
        email: 'foo@bar.com',
        verified: true
      };
      UIManager.fxaGetAccounts(verifiedAcct);
      assert.isTrue(localizeSpy.calledOnce);
      assert.equal('fxa-signed-in', localizeSpy.args[0][1]);
    });

    test('Show correct success message after unverified login', function() {
      var unverifiedAcct = {
        email: 'foo@bar.com',
        verified: false
      };
      UIManager.fxaGetAccounts(unverifiedAcct);
      assert.isTrue(localizeSpy.calledOnce);
      assert.equal('fxa-email-sent', localizeSpy.args[0][1]);
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
    var joinHiddenNetworkStub;

    suiteSetup(function() {
      Navigation.currentStep = 3;
      Navigation.manageStep();
    });

    suiteTeardown(function() {
      Navigation.currentStep = 1;
      Navigation.manageStep();
    });

    setup(function() {
      joinHiddenNetworkStub = this.sinon.stub(WifiUI, 'joinHiddenNetwork',
        function() {
          return;
      });
    });

    test('Join hidden network button click > ', function() {
      var spy = this.sinon.spy(WifiUI, 'addHiddenNetwork');
      var _ = navigator.mozL10n.get;
      UIManager.joinHiddenButton.click();
      assert.isTrue(spy.calledOnce,
        'on click, addHiddenNetwork should be called');
      assert.equal(window.location.hash, '#hidden-wifi-authentication');
      assert.equal(UIManager.mainTitle.textContent, _('authentication'));
      UIManager.hiddenWifiPassword.value = 'testPassword';
      UIManager.hiddenWifiSsid.value = 'testSSID';
      // Checks WPA-PSK
      UIManager.hiddenWifiSecurity.options[2].selected = true;
      UIManager.wifiJoinButton.disabled = false;
      UIManager.wifiJoinButton.click();
      assert.ok(joinHiddenNetworkStub.called,
        'joinHiddenNetwork should be called');
    });

  });

});
