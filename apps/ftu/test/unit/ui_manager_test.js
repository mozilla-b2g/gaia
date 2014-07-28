/* global MockFxAccountsIACHelper, MocksHelper, MockL10n, MockMozApps,
          MockTzSelect, Navigation, UIManager */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

requireApp('ftu/js/ui.js');
requireApp('ftu/js/navigation.js');

requireApp('ftu/test/unit/mock_l10n.js');
requireApp('ftu/test/unit/mock_tutorial.js');
requireApp('ftu/test/unit/mock_mozapps.js');
requireApp('ftu/test/unit/mock_time_manager.js');
requireApp('ftu/test/unit/mock_wifi_manager.js');
requireApp('ftu/test/unit/mock_tz_select.js');
requireApp('ftu/test/unit/mock_operatorVariant.js');
requireApp('ftu/test/unit/mock_fx_accounts_iac_helper.js');

var mocksHelperForUI = new MocksHelper([
  'Tutorial',
  'TimeManager',
  'WifiManager',
  'OperatorVariant'
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

});
