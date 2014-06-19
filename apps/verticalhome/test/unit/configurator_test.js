'use strict';

/* global configurator, MockNavigatorSettings, IccHelper, App, app,
   MocksHelper  */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/test/unit/mock_app.js');

var mocksHelperForConfigurator = new MocksHelper([
  'App',
  'IccHelper'
]).init();

suite('configurator.js >', function() {
  mocksHelperForConfigurator.attachTestHelpers();

  var realMozSettings;
  var xhr;
  var requests = [];

  var confGridOK = {
    'preferences': {},
    'prediction': {
      'enabled': true,
      'lookahead': 16
    },
    'grid': [
    [
      {
        'entry_point': 'dialer',
        'name': 'Phone',
        'manifestURL': 'app://communications.gaiamobile.org/manifest.webapp',
        'icon':
        'app://communications.gaiamobile.org/dialer/style/icons/Dialer_60.png'
      }
    ]
  ]};

  var confSV = {
    '214-007': [
    {
      'location': 14,
      'manifestURL':
          'https://marketplace.firefox.com/app/' +
          '9f96ce77-5b2d-42ca-a0d9-10a933dd84c4/manifest.webapp'
    },{
      'location': 1000,
      'manifestURL': 'https://mobile.twitter.com/cache/twitter.webapp'
    },{
      'location': 6,
      'manifestURL':
      'https://bits.wikimedia.org/WikipediaMobileFirefoxOS/manifest.webapp'
    },{
      'manifestURL':
      'https://owdstore.hi.inet/operRes/latam/operatorResourcesLatam.webapp'
    }
  ]};

  suiteSetup(function() {
    mocksHelperForConfigurator.suiteSetup();
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    mocksHelperForConfigurator.suiteTeardown();
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mSyncRepliesOnly = false;
  });

  setup(function(done) {
    mocksHelperForConfigurator.setup();
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = function(req) { requests.push(req); };
    requireApp('verticalhome/js/configurator.js', done);
  });

  teardown(function() {
    mocksHelperForConfigurator.teardown();
    xhr.restore();
    navigator.mozSettings.mTeardown();
  });

  test('Sections >', function() {
    var req = requests[0];
    req.response = confGridOK;
    req.onload();

    var grid = configurator.getGrid();
    assert.equal(grid[0][0].entry_point, confGridOK.grid[0][0].entry_point);
    assert.equal(grid[0][0].name, confGridOK.grid[0][0].name);
    assert.equal(grid[0][0].manifestURL, confGridOK.grid[0][0].manifestURL);
    assert.equal(grid[0][0].icon, confGridOK.grid[0][0].icon);

    var prediction = configurator.getSection('prediction');
    assert.equal(prediction.enabled, confGridOK.prediction.enabled);
    assert.equal(prediction.lookahead, confGridOK.prediction.lookahead);

    // This section should be undefined
    assert.isUndefined(configurator.getSection('noExiste'));

    window.app = new App();

    //For configurator remove the listener
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('gaiagrid-layout-ready', true, false, null);
    window.dispatchEvent(evt);
    IccHelper.mProps.iccInfo = {mcc:'214', mnc:'007'};
    IccHelper.mTriggerEventListeners('iccinfochange', {});
  });

  function assertLoadFile(okLoad, eventFirst) {

    window.app = new App();

    configurator.load();

    assert.isFalse(app.mGetInitialized());

    var evt = document.createEvent('CustomEvent');
    var req = requests[0];
    if (eventFirst) {
      evt.initCustomEvent('gaiagrid-layout-ready', true, false, null);
      window.dispatchEvent(evt);
    } else {
      req.response = confGridOK;
      if (okLoad) {
        req.onload();
      } else {
        req.onerror({'type': 'expected error'});
      }
    }
    assert.isFalse(app.mGetInitialized());

    if (eventFirst) {
      req.response = confGridOK;
      if (okLoad) {
        req.onload();
      } else {
        req.onerror({'type': 'expected error'});
      }
    } else {
      evt.initCustomEvent('gaiagrid-layout-ready', true, false, null);
      window.dispatchEvent(evt);
    }

    assert.isTrue(app.mGetInitialized());

    var grid = configurator.getGrid();
    if (okLoad) {
      assert.notEqual(grid, undefined);
    } else {
      assert.equal(grid, undefined);
    }
    // For remove listener
    IccHelper.mProps.iccInfo = {mcc:'214', mnc:'007'};
    IccHelper.mTriggerEventListeners('iccinfochange', {});
  }

  test ('Correct load conf file after event gaiaGridLayoutReady >', function() {
    assertLoadFile(true, true);
  });

  test ('Wrong load conf file after event gaiaGridLayoutReady >', function() {
    assertLoadFile(false, true);
  });

  test ('Correct load conf file before event gaiaGridLayoutReady>', function() {
    assertLoadFile(true, false);
  });

  test ('Wrong load conf file before event gaiaGridLayoutReady >', function() {
    assertLoadFile(false, false);
  });

  function assertSV(xhrOk) {
    sinon.useFakeTimers();
    window.app = new App();
    configurator.load();

    var req = requests[0];
    req.response = confGridOK;
    req.onload();

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('gaiagrid-layout-ready', true, false, null);
    window.dispatchEvent(evt);

    IccHelper.mProps.iccInfo = {mcc:'214', mnc:'007'};
    IccHelper.mTriggerEventListeners('iccinfochange', {});

    var svEventRaise = false;
    window.addEventListener('singlevariant-ready', function svReady() {
      window.removeEventListener('singlevariant-ready', svReady);
      svEventRaise = true;
    });

    req = requests[1];
    req.response = confSV;
    var svApp;
    if (xhrOk) {
      req.onload();
      svApp =
        configurator.getSingleVariantApp(confSV['214-007'][0].manifestURL);
      assert.equal(svApp.manifestURL, confSV['214-007'][0].manifestURL);
      assert.equal(svApp.location, confSV['214-007'][0].location);
      svApp =
          configurator.getSingleVariantApp('nonexistent_manifest');
      assert.isUndefined(svApp);
    } else {
      req.onerror({'type': 'expected error'});
      svApp =
        configurator.getSingleVariantApp(confSV['214-007'][0].manifestURL);
      assert.isUndefined(svApp);
    }
    assert.isTrue(svEventRaise);
  }

  /*
   * It tests the public method 'getSingleVariantApps' getting properties/values
   */
  test('getSingleVariantApps - Correct conf file  >', function() {
    assertSV(true);
  });

  test('getSingleVariantApps - Wrong conf file  >', function() {
    assertSV(false);
  });

  const KEY_SIM_ON_1ST_RUN = 'ftu.simPresentOnFirstBoot';
  /*
   * Checks isSimPresentOnFirstBoot function
   */

  var testCases = [
  {
    'preValSet': undefined,
    'currentMccMnc': '214-007',
    'expecValSet': true,
    'title': KEY_SIM_ON_1ST_RUN +
      'setting value is undefined - isSimPresentOnFirstBoot is true'
  }, {
    'preValSet': '000-000',
    'currentMccMnc': '214-007',
    'expecValSet': false,
    'title': KEY_SIM_ON_1ST_RUN +
      'setting value different to the current mcc-mnc - ' +
      'isSimPresentOnFirstBoot is false'
  }, {
    'preValSet': '214-007',
    'currentMccMnc': '214-007',
    'expecValSet': true,
    'title': KEY_SIM_ON_1ST_RUN +
      'setting value the same as current mcc-mnc - ' +
      'isSimPresentOnFirstBoot is true'
  }
  ];

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      this.sinon.useFakeTimers();
      MockNavigatorSettings.mSettings[KEY_SIM_ON_1ST_RUN] = testCase.preValSet;
      configurator.loadSettingSIMPresent(testCase.currentMccMnc);
      this.sinon.clock.tick();
      assert.equal(configurator.isSimPresentOnFirstBoot,
                   testCase.expecValSet);
    });
  });

});
