/* global MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('homescreens > homescreen name', () => {
  var modules = [
    'shared_mocks/mock_settings_listener',
    'unit/mock_apps_cache',
    'panels/homescreens/homescreen_name'
  ];

  var map = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/apps_cache': 'unit/mock_apps_cache'
    }
  };

  var homescreenName;

  var realNavigatorSettings;
  var realSettingsListener;

  var mockSettingsListener;
  var mockAppsCache;

  suiteSetup(() => {
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(() => {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    window.SettingsListener = realSettingsListener;
  });

  setup(done => {
    var requireCtx = testRequire([], map, () => {
    });
    requireCtx(modules, (MockSettingsListener, MockAppsCache,
                         HomescreenName) => {
      homescreenName = HomescreenName();
      realSettingsListener = window.SettingsListener;
      window.SettingsListener = MockSettingsListener;
      mockSettingsListener = MockSettingsListener;
      mockAppsCache = MockAppsCache;
      done();
    });
  });

  test('_init() should watch name property changes', () => {
    sinon.stub(homescreenName, '_watchNameChange');
    homescreenName._init();
    assert.equal(homescreenName._watchNameChange.calledOnce, true);
  });

  test('Name is set to a default value', () => {
    assert.equal(homescreenName.name, '');
  });

  test('Getting Homescreen.name must call _updateManifestName()', done => {
    var updateManifestNameStub = sinon.stub(homescreenName,
      '_updateManifestName');
    homescreenName.getName();
    setTimeout(() => {
      assert.isTrue(updateManifestNameStub.calledOnce);
      updateManifestNameStub.restore();
      done();
    });
  });
});
