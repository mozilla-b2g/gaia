'use strict';

var MockNavigatorSettings, MockNavigatorMozIccManager, MockL10n, MockDump,
    MocksHelper, HtmlImports;

requireApp('settings/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp('settings/test/unit/mock_navigator_settings.js');
requireApp('settings/test/unit/mock_settings.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/html_imports.js');
require('/shared/test/unit/mocks_helper.js');

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
  setup(function() {
    mocksHelper.setup();

    this.items = [{
      'identifier': 2,
      'text': 'Item stkItemsNaiSetUpCall',
      'nai': 'stkItemsNaiSetUpCall'
    },{
      'identifier': 3,
      'text': 'Item stkItemsNaiSendSs',
      'nai': 'stkItemsNaiSendSs'
    },{
      'identifier': 4,
      'text': 'Item stkItemsNaiSendUssd',
      'nai': 'stkItemsNaiSendUssd'
    },{
      'identifier': 5,
      'text': 'Item stkItemsNaiSendSms',
      'nai': 'stkItemsNaiSendSms'
    },{
      'identifier': 6,
      'text': 'Item stkItemsNaiSendDtmf',
      'nai': 'stkItemsNaiSendDtmf'
    },{
      'identifier': 7,
      'text': 'Item stkItemsNaiLaunchBrowser',
      'nai': 'stkItemsNaiLaunchBrowser'
    },{
      'identifier': 8,
      'text': 'Item stkItemsNaiPlayTone',
      'nai': 'stkItemsNaiPlayTone'
    },{
      'identifier': 9,
      'text': 'Item stkItemsNaiDisplayText',
      'nai': 'stkItemsNaiDisplayText'
    },{
      'identifier': 10,
      'text': 'Item stkItemsNaiGetInkey',
      'nai': 'stkItemsNaiGetInkey'
    },{
      'identifier': 11,
      'text': 'Item stkItemsNaiGetInput',
      'nai': 'stkItemsNaiGetInput'
    },{
      'identifier': 12,
      'text': 'Item stkItemsNaiSelectItem',
      'nai': 'stkItemsNaiSelectItem'
    },{
      'identifier': 13,
      'text': 'Item stkItemsNaiSetUpMenu',
      'nai': 'stkItemsNaiSetUpMenu'
    },{
      'identifier': 14,
      'text': 'Item stkItemsNaiProvideLocalInfo',
      'nai': 'stkItemsNaiProvideLocalInfo'
    },{
      'identifier': 15,
      'text': 'Item stkItemsNaiSetIdleModeText',
      'nai': 'stkItemsNaiSetIdleModeText'
    },{
      'identifier': 16,
      'text': 'Item stkItemsNaiOpenChannel',
      'nai': 'stkItemsNaiOpenChannel'
    },{
      'identifier': 17,
      'text': 'Item stkItemsNaiReceiveData',
      'nai': 'stkItemsNaiReceiveData'
    },{
      'identifier': 18,
      'text': 'Item stkItemsNaiSendData',
      'nai': 'stkItemsNaiSendData'
    },{
      'identifier': 19,
      'text': 'Item stkItemsNaiGetChannelStatus',
      'nai': 'stkItemsNaiGetChannelStatus'
    }];
    this.StkCommandEvent = new CustomEvent('stkasynccommand', {
      detail: { 'message': {
        'iccId': '12345',
        'command': {
          typeOfCommand: navigator.mozIccManager.STK_CMD_SELECT_ITEM,
          options: {
            'title': 'Dummy Test Menu',
            'defaultItem': 1,
            'items': this.items
          }
        }
      }}});
    window.dispatchEvent(this.StkCommandEvent);
  });

  teardown(function() {
    mocksHelper.teardown();
  });

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

    HtmlImports.populate(function() {
      window.addEventListener('iccPageLoaded', function onLoaded(event) {
          done();
        });
      requireApp('settings/js/icc.js');
    });
  });

  test('Check initialization', function() {
    assert.ok(document.getElementById('icc-stk-app-back'));
    assert.ok(document.getElementById('icc-stk-help-exit'));
    assert.ok(document.getElementById('icc-stk-exit'));
    assert.ok(document.getElementById('icc-stk-header'));
    assert.ok(document.getElementById('icc-stk-subheader'));
    assert.ok(document.getElementById('icc-stk-list'));
  });

  test('Correct number of entries into the STK options list', function() {
    assert.equal(document.getElementById('icc-stk-list').childElementCount, 18);
  });

  test('STK Header', function() {
    assert.equal(document.getElementById('icc-stk-header').textContent,
      'Dummy Test Menu');
  });

  test('All items with correct NAI data', function() {
    this.items.forEach(function(item, index) {
      assert.equal(document.querySelector('#icc-stk-list li:nth-child(' +
        (index + 1) + ') small').textContent, item.nai);
    });
  });

  test('All items with correct data', function() {
    this.items.forEach(function(item, index) {
      assert.equal(document.querySelector('#icc-stk-list li:nth-child(' +
        (index + 1) + ') a').textContent, item.text);
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
});
