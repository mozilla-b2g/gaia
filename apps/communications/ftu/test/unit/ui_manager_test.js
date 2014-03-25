/* global MocksHelper, MockL10n, MockMozApps, MockTzSelect,
          Navigation, UIManager */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

requireApp('communications/ftu/js/ui.js');
requireApp('communications/ftu/js/navigation.js');

requireApp('communications/ftu/test/unit/mock_l10n.js');
requireApp('communications/ftu/test/unit/mock_tutorial.js');
requireApp('communications/ftu/test/unit/mock_tutorial_steps.js');
requireApp('communications/ftu/test/unit/mock_tutorial_navigator.js');
requireApp('communications/ftu/test/unit/mock_time_manager.js');
requireApp('communications/ftu/test/unit/mock_wifi_manager.js');
requireApp('communications/ftu/test/unit/mock_tz_select.js');
requireApp('communications/ftu/test/unit/mock_operatorVariant.js');

var mocksHelperForUI = new MocksHelper([
  'Tutorial',
  'TutorialSteps',
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
      realTzSelect;
  var mocksHelper = mocksHelperForUI;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realTzSelect = window.tzSelect;
    window.tzSelect = MockTzSelect;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockMozApps;

    mocksHelper.suiteSetup();
    loadBodyHTML('/ftu/index.html');

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
