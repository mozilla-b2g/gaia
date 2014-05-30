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

  suite('About Browser > ', function() {
    var baseURL = 'https://marketplace.cdn.mozilla.net/media/docs/privacy/',
        link;

    setup(function() {
      link = document.getElementById('privacy-marketplace-link');
    });

    test('Privacy Policy Link (bn-BD)', function() {
      var settingValue = 'bn-BD';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'bn-BD.html');
    });
    test('Privacy Policy Link (bn-IN)', function() {
      var settingValue = 'bn-IN';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'bn-IN.html');
    });
    test('Privacy Policy Link (cs)', function() {
      var settingValue = 'cs-CS';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'cs.html');
    });
    test('Privacy Policy Link (de)', function() {
      var settingValue = 'de-DE';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'de.html');
    });
    test('Privacy Policy Link (el)', function() {
      var settingValue = 'el-EL';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'el.html');
    });
    test('Privacy Policy Link (en-US)', function() {
      var settingValue = 'en';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'en-US.html');
    });
    test('Privacy Policy Link (es)', function() {
      var settingValue = 'es-ES';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'es.html');
    });
    test('Privacy Policy Link (hi)', function() {
      var settingValue = 'hi-HI';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'hi.html');
    });
    test('Privacy Policy Link (hr)', function() {
      var settingValue = 'hr-HR';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'hr.html');
    });
    test('Privacy Policy Link (hu)', function() {
      var settingValue = 'hu-HU';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'hu.html');
    });
    test('Privacy Policy Link (it)', function() {
      var settingValue = 'it-IT';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'it.html');
    });
    test('Privacy Policy Link (mk)', function() {
      var settingValue = 'mk-MK';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'mk.html');
    });
    test('Privacy Policy Link (pl)', function() {
      var settingValue = 'pl-PL';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'pl.html');
    });
    test('Privacy Policy Link (pt-BR)', function() {
      var settingValue = 'pt';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'pt-BR.html');
    });
    test('Privacy Policy Link (ru)', function() {
      var settingValue = 'ru-RU';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'ru.html');
    });
    test('Privacy Policy Link (sr)', function() {
      var settingValue = 'sr-SR';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'sr.html');
    });
    test('Privacy Policy Link (ta)', function() {
      var settingValue = 'ta-TA';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'ta.html');
    });
    test('Privacy Policy Link (zh-CN)', function() {
      var settingValue = 'zh';
      UIManager.updatePrivacyLinks(settingValue);
      assert.equal(link.href, baseURL + 'zh-CN.html');
    });
  });
});
