'use strict';

/* global Configurator, MockNavigatorSettings, IccHelper,
   MocksHelper, MockVersionHelper, verticalPreferences,
   MockNavigatorGetFeature, LazyLoader */

require('/shared/js/homescreens/vertical_preferences.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_get_feature.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/test/unit/mock_version_helper.js');
require('/shared/js/lazy_loader.js');

var mocksHelperForConfigurator = new MocksHelper([
  'VersionHelper',
  'IccHelper'
]).init();

suite('configurator.js >', function() {
  mocksHelperForConfigurator.attachTestHelpers();

  var realGetFeature;
  var realMozSettings;
  var requests = [];
  var configurator;

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
    realGetFeature = navigator.getFeature;
    navigator.getFeature = MockNavigatorGetFeature;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    mocksHelperForConfigurator.suiteTeardown();
    navigator.getFeature = realGetFeature;
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mSyncRepliesOnly = false;
  });

  setup(function(done) {
    mocksHelperForConfigurator.setup();
    requireApp('verticalhome/js/configurator.js', function() {
      configurator = new Configurator();
      requests = [];
      done();
    });
  });

  teardown(function() {
    mocksHelperForConfigurator.teardown();
    navigator.mozSettings.mTeardown();
  });

  test('Sections >', function(done) {
    this.sinon.stub(LazyLoader, 'getJSON')
      .returns(Promise.resolve(confGridOK));
    configurator.load();

    window.addEventListener('configuration-ready', function ready() {
      window.removeEventListener('configuration-ready', ready);
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

      // For configurator remove the listener
      IccHelper.mProps.iccInfo = {mcc:'214', mnc:'007'};
      IccHelper.mTriggerEventListeners('iccinfochange', {});
      done();
    });
  });

  function assertLoadFile(okLoad, done) {
    window.addEventListener('configuration-ready', function ready() {
      window.removeEventListener('configuration-ready', ready);
      var grid = configurator.getGrid();
      if (okLoad) {
        assert.notEqual(grid, undefined);
      } else {
        assert.equal(grid, undefined);
      }
      // For remove listener
      IccHelper.mProps.iccInfo = {mcc:'214', mnc:'007'};
      IccHelper.mTriggerEventListeners('iccinfochange', {});
      done();
    });

    configurator.load();
  }

  test('Correct load conf file >', function(done) {
    this.sinon.stub(LazyLoader, 'getJSON')
      .returns(Promise.resolve(confGridOK));
    assertLoadFile(true, done);
  });

  test('Wrong load conf file >', function(done) {
    this.sinon.stub(LazyLoader, 'getJSON')
      .returns(Promise.reject({'type': 'expected error'}));
    assertLoadFile(false, done);
  });

  function assertSV(xhrOk, done) {
    sinon.useFakeTimers();

    IccHelper.mProps.iccInfo = {mcc:'214', mnc:'007'};
    IccHelper.mTriggerEventListeners('iccinfochange', {});

    window.addEventListener('singlevariant-ready', function svReady() {
      window.removeEventListener('singlevariant-ready', svReady);
      var svApp;
      if (xhrOk) {
        svApp =
          configurator.getSingleVariantApp(confSV['214-007'][0].manifestURL);
        assert.equal(svApp.manifestURL, confSV['214-007'][0].manifestURL);
        assert.equal(svApp.location, confSV['214-007'][0].location);
        svApp =
            configurator.getSingleVariantApp('nonexistent_manifest');
        assert.isUndefined(svApp);
      } else {
        svApp =
          configurator.getSingleVariantApp(confSV['214-007'][0].manifestURL);
        assert.isUndefined(svApp);
      }
      done();
    });

    configurator.load();
  }

  /*
   * It tests the public method 'getSingleVariantApps' getting properties/values
   */
  test('getSingleVariantApps - Correct conf file  >', function(done) {
    this.sinon.stub(LazyLoader, 'getJSON')
      .returns(Promise.resolve(confSV));
    assertSV(true, done);
  });

  test('getSingleVariantApps - Wrong conf file  >', function(done) {
    this.sinon.stub(LazyLoader, 'getJSON')
      .returns(Promise.reject({'type': 'expected error'}));
    assertSV(false, done);
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

  suite('migration> ', function() {
    var updateHandler = null;
    var vpGetStub = null;
    var vpEvtUpdateStub = null;

    var mGrid_layout = {
      'grid': [
        [
          {
            'name': 'Phone',
            'manifestURL': 'app://communications/manifest.webapp',
            'icon': 'app://communications/icons/Dialer_60.png',
            'entry_point': 'dialer'
          },
          {
            'name': 'Messages',
            'manifestURL': 'app://sms/manifest.webapp',
            'icon': 'app://sms/icons/Sms_60.png'
          }
        ],
        [
          {
            'name': 'Contacts',
            'manifestURL': 'app://communications/manifest.webapp',
            'icon': 'app://communications/icons/Contacts_60.png',
            'entry_point': 'contacts'
          },
          {
            'name': 'Settings',
            'manifestURL': 'app://settings/manifest.webapp',
            'icon': 'app://settings/icons/Settings_60.png'
          }
        ]
      ]
    };

    var mGrid_layout2 = {
      'grid': [
        [
          {
            'name': 'Messages2',
            'manifestURL': 'app://sms/manifest.webapp',
            'icon': 'app://sms/icons/Sms_60.png'
          }
        ],
        [
          {
            'name': 'Contacts2',
            'manifestURL': 'app://communications/manifest.webapp',
            'icon': 'app://communications/icons/Contacts_60.png',
            'entry_point': 'contacts'
          }
        ]
      ]
    };

    function dispatchUpdatedEvent(grid) {
      updateHandler({
        type: 'updated',
        target: {
          name: 'grid.layout',
          value: grid
        }
      });
    }

    setup(function() {
      vpGetStub = sinon.stub(verticalPreferences, 'get', function(field) {
        return {
          then: function(cb) {
            cb(mGrid_layout);
          }
        };
      });

      vpEvtUpdateStub = sinon.stub(verticalPreferences, 'addEventListener',
        function(type, handler) {
          updateHandler = handler;
        }
      );

      MockVersionHelper.mIsUpgrade = true;
    });

    teardown(function() {
      vpGetStub.restore();
      vpEvtUpdateStub.restore();
    });

    function assertGridOk(gridTest, gridOk) {
      assert.notEqual(gridTest, undefined);
      assert.equal(gridTest.length, gridOk.length);
      for (var i = 0, iLen = gridOk.length; i < iLen; i++) {
        assert.equal(gridTest[i].length, gridOk[i].length);
        for (var j = 0, jLen = gridOk[i].length; j < jLen; j++) {
          assert.equal(gridTest[i].length, gridOk[i].length);
          assert.equal(gridTest[i][j].name, gridOk[i][j].name);
        }
      }
    }

    test('Upgrade from old homescreen - grid.layout ready >', function(done) {
      window.addEventListener('configuration-ready', function ready() {
        window.removeEventListener('configuration-ready', ready);
        var grid = configurator.getGrid();
        assertGridOk(grid, mGrid_layout.grid);
        done();
      });

      configurator.load();
      sinon.assert.callCount(vpEvtUpdateStub, 0);
    });

    test('Upgrade from old homescreen - grid.layout not ready >', function() {
      var gridTest = mGrid_layout;
      mGrid_layout = undefined;
      configurator.load();
      sinon.assert.calledOnce(vpEvtUpdateStub);
      var grid = configurator.getGrid();
      assert.equal(grid, undefined);

      dispatchUpdatedEvent(mGrid_layout2);
      grid = configurator.getGrid();
      assertGridOk(grid, mGrid_layout2.grid);
      mGrid_layout = gridTest;
    });
  });
});
