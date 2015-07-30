'use strict';
/* global MockNavigatorSettings */
requireApp('settings/shared/test/unit/load_body_html_helper.js');
requireApp('settings/test/unit/mock_navigator_settings.js');

suite('STK Item >', function() {
  var modules = [
    'panels/root/stk_item',
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_stk_helper',
    'shared_mocks/mock_dump',
    'shared_mocks/mock_navigator_moz_icc_manager'
  ];

  var map = {
    '*': {
      'shared/l10n' : 'shared_mocks/mock_l10n',
      'shared/stk_helper': 'shared_mocks/mock_stk_helper'
    }
  };

  var realL10n;
  var realMozIccManager;
  var realMozSettings;
  var subject;
  var fakeTimer;
  var mockSTKHelper;

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

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(STKItem, MockL10n, MockSTKHelper,
      MockDump, MockNavigatorMozIccManager) {
        realMozSettings = navigator.mozSettings;
        loadBodyHTML('./_root.html');
        realL10n = navigator.mozL10n;
        navigator.mozL10n = MockL10n;
        realMozIccManager = navigator.mozIccManager;
        navigator.mozIccManager = MockNavigatorMozIccManager;
        mockSTKHelper = MockSTKHelper;

        navigator.mozSettings = MockNavigatorSettings;

        window.Settings = {
          mozSettings: navigator.mozSettings
        };

        MockDump.mSuiteSetup();
        fakeTimer = sinon.useFakeTimers();

        subject = STKItem({
          iccMainHeader: document.querySelector('#icc-mainheader'),
          iccEntries: document.querySelector('#icc-entries')
        });
        fakeTimer.tick();

        done();
    });
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();
    fakeTimer.restore();
  });

  suite('Single SIM >', function() {
    setup(function() {
      MockNavigatorSettings.mTriggerObservers('icc.applications', {
        settingValue: JSON.stringify({
          '1': {
            'iccId': '1111111111111',
            'entries': dummySTKMenuEntries
          }})});
    });

    test('One entry into the STK applications list', function() {
      assert.equal(subject._elements.iccEntries.childElementCount, 1);
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

    test('Two entries into the STK applications list', function() {
      assert.equal(subject._elements.iccEntries.childElementCount, 2);
    });

    test('Operator name (SIM 1) showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li span').textContent, 'DummyOperator');
    });

    test('SIM number (SIM 1) showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li small').getAttribute('data-l10n-id'), 'sim1');
    });

    test('Operator name (SIM 2) showed in the list', function() {
      assert.equal(document.querySelector(
        '#icc-entries li:nth-child(2) span').textContent, 'DummyOperator');
    });

    test('SIM number (SIM 2) showed in the list', function() {
      assert.equal(document.querySelector('#icc-entries li:nth-child(2) small').
        getAttribute('data-l10n-id'), 'sim2');
    });
  });

  suite('Icons >', function() {
    var icons = [{
      'pixels':[0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
                0x000000FF,0x000000FF,0x000000FF,0x000000FF,
                0xFFFFFFFF,0x000000FF,0xFFFFFFFF,0x000000FF,
                0xFFFFFFFF,0x000000FF,0x000000FF,0xFFFFFFFF],
      'codingScheme': 'basic',
      'width': 4,
      'height': 4
    }];

    function updateMenu(withIcons) {
      if (withIcons) {
        dummySTKMenuEntries.icons = icons;
      } else {
        delete dummySTKMenuEntries.icons;
      }

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
    }

    setup(function() {
      this.sinon.stub(mockSTKHelper, 'getFirstIconRawData', function(stkItem) {
        return stkItem.icons && stkItem.icons.length > 0 ?
          stkItem.icons[0] : null;
      });
    });

    teardown(function () {
      delete dummySTKMenuEntries.icons;
    });

    test('Icons should be rendered correctly', function() {
      updateMenu(true);
      assert.isDefined(subject._elements.iccEntries.dataset.customIcon);
      assert.equal(document.querySelector('#icc-entries li:nth-child(1) span').
        childElementCount, 1);
      assert.equal(document.querySelector('#icc-entries li:nth-child(2) span').
        childElementCount, 1);
    });

    test('Default icon should be rendered if no icons are defined', function() {
      updateMenu();
      assert.isUndefined(subject._elements.iccEntries.dataset.customIcon);
      assert.equal(document.querySelector('#icc-entries li:nth-child(1) a').
        dataset.icon, 'sim-toolkit');
      assert.equal(document.querySelector('#icc-entries li:nth-child(2) a').
        dataset.icon, 'sim-toolkit');
      assert.isNull(
        document.querySelector('#icc-entries li:nth-child(1) > span'),
        'span with icon should not be added to the DOM');
      assert.isNull(
        document.querySelector('#icc-entries li:nth-child(2) > span'),
        'span with icon should not be added to the DOM');
    });

    test('Update menu in ICC panel.', function() {
      window.Settings.currentPanel = '#icc';
      updateMenu(false);
      assert.equal(window.Settings.currentPanel, '#root');
    });

    test('Update menu in other panel.', function() {
      window.Settings.currentPanel = '#developer';
      updateMenu(false);
      assert.equal(window.Settings.currentPanel, '#developer');
    });
  });
});
