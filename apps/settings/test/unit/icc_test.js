'use strict';

var MockNavigatorSettings, MockNavigatorMozIccManager, MockL10n, MockDump,
    MocksHelper, HtmlImports;

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp('settings/test/unit/mock_navigator_settings.js');
requireApp('settings/test/unit/mock_settings.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForIccApp = ['Settings'];

mocksForIccApp.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

var realL10n, realMozSettings, realMozIccManager, realDUMP, mocksHelper,
    realReopenSettings;

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
if (!window.reopenSettings) {
  window.reopenSettings = null;
}

suite('STK (App menu) >', function() {
  suiteSetup(function(done) {
    // Load markup of settings APP
    loadBodyHTML('/index.html');
    // Inject the panel of downloads
    var importHook = document.createElement('link');
    importHook.setAttribute('rel', 'import');
    importHook.setAttribute('href', '/elements/icc.html');
    document.head.appendChild(importHook);

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    realDUMP = window.DUMP;
    window.DUMP = MockDump.disable();
    realReopenSettings = window.reopenSettings;
    window.reopenSettings = function mockReopenSettings() {};
    mocksHelper = new MocksHelper(mocksForIccApp);
    mocksHelper.suiteSetup();

    this.STK_NEXT_ACTION_INDICATOR = {
      16: 'stkItemsNaiSetUpCall',
      17: 'stkItemsNaiSendSs',
      18: 'stkItemsNaiSendUssd',
      19: 'stkItemsNaiSendSms',
      32: 'stkItemsNaiPlayTone',
      33: 'stkItemsNaiDisplayText',
      34: 'stkItemsNaiGetInkey',
      35: 'stkItemsNaiGetInput',
      36: 'stkItemsNaiSelectItem',
      37: 'stkItemsNaiSetUpMenu',
      40: 'stkItemsNaiSetIdleModeText',
      48: 'stkItemsNaiPerformCardApdu',  // class "a"
      49: 'stkItemsNaiPowerOnCard',      // class "a"
      50: 'stkItemsNaiPowerOffCard',     // class "a"
      51: 'stkItemsNaiGetReaderStatus',  // class "a"
      64: 'stkItemsNaiOpenChannel',      // class "e"
      65: 'stkItemsNaiCloseChannel',     // class "e"
      66: 'stkItemsNaiReceiveData',      // class "e"
      67: 'stkItemsNaiSendData',         // class "e"
      68: 'stkItemsNaiGetChannelStatus', // class "e"
      96: 'Reserved',                    // for TIA/EIA-136
      129: 'stkItemsNaiEndOfTheProactiveSession'
    };

    // The last item '0' is a terminated characher.
    this.nextActionList = [16, 17, 18, 19, 32, 33, 34, 35, 36, 37, 40,
                           48, 49, 50, 51, 64, 65, 66, 67, 68, 129, 0];

    // Test commands
    this.items = [{
      'identifier': 2,
      'text': 'Item stkItemsNaiSetUpCall', // nai: 16
    },{
      'identifier': 3,
      'text': 'Item stkItemsNaiSendSs', // nai: 17
    },{
      'identifier': 4,
      'text': 'Item stkItemsNaiSendUssd', // nai: 18
    },{
      'identifier': 5,
      'text': 'Item stkItemsNaiSendSms', // nai: 19
    },{
      'identifier': 6,
      'text': 'Item stkItemsNaiPlayTone', // nai: 32
    },{
      'identifier': 7,
      'text': 'Item stkItemsNaiDisplayText', // nai: 33
    },{
      'identifier': 8,
      'text': 'Item stkItemsNaiGetInkey', // nai: 34
    },{
      'identifier': 9,
      'text': 'Item stkItemsNaiGetInput', // nai: 35
    },{
      'identifier': 10,
      'text': 'Item stkItemsNaiSelectItem', // nai: 36
    },{
      'identifier': 11,
      'text': 'Item stkItemsNaiSetUpMenu', // nai: 37
    },{
      'identifier': 12,
      'text': 'Item stkItemsNaiSetIdleModeText', // nai: 40
    },{
      'identifier': 13,
      'text': 'Item stkItemsNaiPerformCardApdu', // nai: 48
    },{
      'identifier': 14,
      'text': 'Item stkItemsNaiPowerOnCard', // nai: 49
    },{
      'identifier': 15,
      'text': 'Item stkItemsNaiPowerOffCard', // nai: 50
    },{
      'identifier': 16,
      'text': 'Item stkItemsNaiGetReaderStatus', // nai: 51
    },{
      'identifier': 17,
      'text': 'Item stkItemsNaiOpenChannel', // nai: 64
    },{
      'identifier': 18,
      'text': 'Item stkItemsNaiCloseChannel', // nai: 65
    },{
      'identifier': 19,
      'text': 'Item stkItemsNaiReceiveData', // nai: 66
    },{
      'identifier': 20,
      'text': 'Item stkItemsNaiSendData', // nai: 67
    },{
      'identifier': 21,
      'text': 'Item stkItemsNaiGetChannelStatus', // nai: 68
    },{
      'identifier': 22,
      'text': 'Item stkItemsNaiEndOfTheProactiveSession', // nai: 129
    }];
    this.StkCommandEvent = new CustomEvent('stkasynccommand', {
      detail: { 'message': {
        'iccId': '12345',
        'command': {
          typeOfCommand: navigator.mozIccManager.STK_CMD_SELECT_ITEM,
          options: {
            'title': 'Dummy Test Menu',
            'defaultItem': 1,
            'items': this.items,
            'isHelpAvailable': true,
            'nextActionList': this.nextActionList
          }
        }
      }}});

    require('/shared/js/html_imports.js', function() {
      HtmlImports.populate(function() {
        var map = {
          'shared/stk_helper': 'shared_mocks/mock_stk_helper'
        };

        testRequire([
          'shared_mocks/mock_stk_helper'
        ], map, function(MockStkHelper) {
          // we have to replace `require` in icc.js
          window.require = function(modules, callback) {
            callback(MockStkHelper);
          };
          testRequire(['icc'], {}, function() {
            done();
          });
        });
      });
    });
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realMozSettings;
    navigator.mozIccManager = realMozIccManager;
    window.DUMP = realDUMP;
    window.reopenSettings = realReopenSettings;
  });

  suite('UI checks >', function() {
    setup(function() {
      mocksHelper.setup();
      window.dispatchEvent(this.StkCommandEvent);
    });

    teardown(function() {
      mocksHelper.teardown();
    });

    test('Check initialization', function() {
      assert.ok(document.getElementById('icc-stk-main-header'));
      assert.ok(document.getElementById('icc-stk-header'));
      assert.ok(document.getElementById('icc-stk-subheader'));
      assert.ok(document.getElementById('icc-stk-list'));
    });

    test('Correct number of entries into the STK options list', function() {
      // The list contains all the items plus the help entry
      assert.equal(document.getElementById('icc-stk-list').childElementCount,
        this.items.length + 1);
    });

    test('STK Header', function() {
      assert.equal(document.getElementById('icc-stk-header').textContent,
        'Dummy Test Menu');
    });

    test('All items with correct NAI data', function() {
      this.items.forEach(function(item, index) {
        assert.equal(document.querySelector('#icc-stk-list li:nth-child(' +
          (index + 1) + ') small').textContent,
          this.STK_NEXT_ACTION_INDICATOR[this.nextActionList[index]]);
      }, this);
    });

    test('All items with correct data', function() {
      this.items.forEach(function(item, index) {
        assert.equal(document.querySelector('#icc-stk-list li:nth-child(' +
          (index + 1) + ') a').textContent, item.text);
      });
    });

    test('Help entry showed (isHelpAvailable)', function() {
      assert.equal(document.querySelector('#icc-stk-list li:nth-child(' +
        (this.items.length + 1) + ') a').textContent,
        'operatorServices-helpmenu');
    });
  });

  suite('Check timeouts >', function() {
    var fakeClock = null;

    setup(function() {
      fakeClock = this.sinon.useFakeTimers();
      mocksHelper.setup();
    });

    teardown(function() {
      fakeClock.restore();
      mocksHelper.teardown();
    });

    test('Wait for timeout (1 sec)', function(done) {
      var testTimeout = 1000;
      navigator.mozIccManager.getIccById('12345').sendStkResponse =
        function(msg, res) {
          assert.equal(res.resultCode,
            navigator.mozIccManager.STK_RESULT_NO_RESPONSE_FROM_USER);
          done();
        };

      MockNavigatorSettings.mSettings['icc.selectTimeout'] = testTimeout;
      window.dispatchEvent(this.StkCommandEvent);
      fakeClock.tick(testTimeout);
    });
  });
});
