'use strict';

mocha.globals([
  'MockSettingsListener'
]);

suite('start testing > ', function() {
  var DisplayContrustor;

  var mockSettingsListener;

  var display;
  var mockElements;
  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_settings_listener',
      'panels/display/display'
    ];
    var maps = {
      'panels/display/display': {
        'shared/settings_listener': 'shared_mocks/mock_settings_listener'
      }
    };
    testRequire(modules, maps, function(MockSettingsListener, Display) {
      mockSettingsListener = MockSettingsListener;
      DisplayContrustor = Display;
      done();
    });
  });

  setup(function() {
    display = DisplayContrustor();
    mockElements = {
      brightnessAuto: {},
      brightnessManual: {}
    };
  });

  suite('start test display module > ', function() {
    test('init', function() {
      var testConfig = {'testKey': 'testData'};
      this.sinon.stub(display, 'initBrightnessItems');
      display.init({}, testConfig);
      assert.deepEqual(display.initBrightnessItems.args[0], [testConfig]);
    });

    test('initBrightnessItems with ambientLight', function() {
      var brightnessValue = true;
      var config = {
        ambientLight: true
      };
      display.elements = mockElements;
      display.initBrightnessItems(config);
      mockSettingsListener.mTriggerCallback('screen.automatic-brightness',
        brightnessValue);
      assert.equal(mockElements.brightnessAuto.hidden, false);
      assert.equal(mockElements.brightnessManual.hidden, brightnessValue);
    });

    test('initBrightnessItems without ambientLight', function() {
      var config = {};
      display.elements = mockElements;
      display.initBrightnessItems(config);
      assert.equal(mockElements.brightnessAuto.hidden, true);
      assert.equal(mockElements.brightnessManual.hidden, false);

      assert.deepEqual(mockSettingsListener.getSettingsLock().locks[0], {
        'screen.automatic-brightness': false
      });
    });
  });
});
