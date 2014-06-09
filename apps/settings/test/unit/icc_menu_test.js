'use strict';

var MockNavigatorSettings, MockNavigatorMozIccManager, MockL10n, MockDump,
    MocksHelper;

requireApp('settings/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp('settings/test/unit/mock_navigator_settings.js');
requireApp('settings/test/unit/mock_settings.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks_helper.js');

var mocksForIccMenu = ['Settings'];

mocksForIccMenu.forEach(function(mockName) {
  if (!window[mockName]) {
    window[mockName] = null;
  }
});

var dummySTKMenuEntries = {
  'title': 'DummyOperator',
  'items': [{
    'identifier': 1,
    'text': 'Dummy 1'
  },
  {
    'identifier': 2,
    'text': 'Dummy 2'
  },
  {
    'identifier': 3,
    'text': 'Dummy 3'
  }],
  'presentationType': 0
};

var realL10n, realMozSettings, realMozIccManager, realDUMP, mocksHelper;
if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}
if (!window.navigator.mozSettings) {
  window.navigator.mozSettings = null;
}
if (!window.navigator.mozIccManager) {
  window.navigator.mozIccManager = null;
}
if (!window.DUMP) {
  window.DUMP = null;
}

suite('STK (Main menu) >', function() {
  suiteSetup(function(done) {
    loadBodyHTML('./_root.html');
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    realDUMP = window.DUMP;
    window.DUMP = MockDump.disable();
    mocksHelper = new MocksHelper(mocksForIccMenu);
    mocksHelper.suiteSetup();
    requireApp('settings/js/icc_menu.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realMozSettings;
    navigator.mozIccManager = realMozIccManager;
    window.DUMP = realDUMP;
    mocksHelper.suiteTeardown();
    MockNavigatorSettings.mTeardown();
  });

  suite('Single SIM >', function() {
    setup(function() {
      mocksHelper.setup();
      MockNavigatorSettings.mTriggerObservers('icc.applications', {
        settingValue: JSON.stringify({
          '1': {
            'iccId': '1111111111111',
            'entries': dummySTKMenuEntries
          }})});
    });

    teardown(function() {
      mocksHelper.teardown();
    });

    test('One entry into the STK applications list', function() {
      assert.equal(document.getElementById('icc-entries').childElementCount, 1);
    });

    test('Operator name showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li a').textContent, 'DummyOperator');
    });

    test('SIM number not showed in the list', function() {
      assert.isNull(document.querySelector(
        '#icc-entries li small'));
    });
  });

  suite('Dual SIM >', function() {
    setup(function() {
      mocksHelper.setup();
      MockNavigatorSettings.mTriggerObservers('icc.applications', {
        settingValue: JSON.stringify({
          '1': {
            'iccId': '1111111111111',
            'entries': dummySTKMenuEntries
          },
          '2': {
            'iccId': '2222222222222',
            'entries': dummySTKMenuEntries
          }})});
    });

    teardown(function() {
      mocksHelper.teardown();
    });

    test('Two entries into the STK applications list', function() {
      assert.equal(document.getElementById('icc-entries').childElementCount, 2);
    });

    test('Operator name (SIM 1) showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li a').textContent, 'DummyOperator');
    });

    test('SIM number (SIM 1) showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li small').textContent, 'SIM 1');
    });

    test('Operator name (SIM 2) showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li:nth-child(2) a').textContent, 'DummyOperator');
    });

    test('SIM number (SIM 2) showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li:nth-child(2) small').textContent, 'SIM 2');
    });
  });
});
