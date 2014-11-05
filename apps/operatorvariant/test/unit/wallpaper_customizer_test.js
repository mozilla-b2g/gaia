/* global requireApp, suite, suiteSetup, suiteTeardown, setup, teardown, test,
   assert, sinon, MockXMLHttpRequest, wallpaperCustomizer, Resources */

'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');
requireApp('operatorvariant/test/unit/mock_xmlhttprequest.js');
requireApp('operatorvariant/test/unit/mock_file_reader.js');

requireApp('operatorvariant/js/resources.js');
requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/wallpaper_customizer.js');

suite('WallpaperCustomizer >', function() {
  const WALLPAPER_SETTING = 'wallpaper.image';
  const TINY_TIMEOUT = 20;

  var realFileReader;
  var realSettings;
  var realXHR;
  var resourcesSpy;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;
    realXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = window.MockXMLHttpRequest;
    realFileReader = window.FileReader;
    window.FileReader = window.MockFileReader;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    window.XMLHttpRequest = realXHR;
    window.FileReader = realFileReader;
  });

  setup(function() {
    this.sinon.useFakeTimers();
    resourcesSpy = sinon.spy(Resources, 'load');
  });

  teardown(function() {
    window.XMLHttpRequest.mTeardown();
    navigator.mozSettings.mTeardown();
    this.sinon.clock.restore();
    resourcesSpy.restore();
  });

  function sendResponseText(text) {
    MockXMLHttpRequest.mSendOnLoad({
      responseText: text,
      response: text
    });
  }

  var configuredValue = 'data:application/object;base64,configuredValue';
  var userValue = 'data:application/object;base64,userValue';
  var defaultValue = 'data:application/object;base64,defaultValue';

  test('First run with valid SIM. Set ', function() {
    var settings = navigator.mozSettings.mSettings;

    var inputParam = {
      uri: '/test/unit/resources/wallpaper.png',
      default: defaultValue
    };

    wallpaperCustomizer.simPresentOnFirstBoot = true;
    wallpaperCustomizer.set(inputParam);

    sendResponseText(configuredValue);
    this.sinon.clock.tick(TINY_TIMEOUT);

    sinon.assert.calledOnce(resourcesSpy);
    sinon.assert.calledWith(resourcesSpy,
                            inputParam.uri, 'blob');

    //Verify if value has been correctly changed
    assert.strictEqual(settings[WALLPAPER_SETTING], configuredValue,
                       WALLPAPER_SETTING + ' has a incorrect value');
  });

  test('Previous run withot SIM. Not set ', function() {
    var settings = navigator.mozSettings.mSettings;
    settings[WALLPAPER_SETTING] = userValue;

    var inputParam = {
      uri: '/test/unit/resources/wallpaper.png',
      default: defaultValue
    };

    wallpaperCustomizer.simPresentOnFirstBoot = false;
    wallpaperCustomizer.set(inputParam);

    sendResponseText(configuredValue);
    this.sinon.clock.tick(TINY_TIMEOUT);

    sinon.assert.notCalled(resourcesSpy);

    //Verify if value has been correctly changed
    assert.strictEqual(settings[WALLPAPER_SETTING], userValue,
                       WALLPAPER_SETTING + ' has a incorrect value');
  });
});
