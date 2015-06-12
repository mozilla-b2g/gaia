'use strict';

/* globals loadBodyHTML*/

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Developer > ', function() {

  var modules = [
    'MockDialogService',
    'unit/mock_apps_cache',
    'shared_mocks/mock_screen_layout',
    'unit/mock_settings_cache',
    'shared_mocks/mock_navigator_moz_power',
    'panels/developer/developer'
  ];
  var maps = {
    'panels/developer/developer': {
      'modules/dialog_service': 'MockDialogService',
      'modules/apps_cache': 'unit/mock_apps_cache',
      'shared/screen_layout': 'shared_mocks/mock_screen_layout',
      'modules/settings_cache': 'unit/mock_settings_cache'
    }
  };
  var developer, realMozPower, mozPower, dialogService, settingsCache;

  suiteSetup(function(done) {
    loadBodyHTML('_developer.html');

    realMozPower = navigator.mozPower;

    // Create a new requirejs context
    var requireCtx = testRequire([], maps, function() {});

    // Define MockDialogService
    define('MockDialogService', function() {
      return {
        show: function() {},
        alert: function() {},
        confirm: function() {}
      };
    });

    requireCtx(modules, function(MockDialogService, MockAppsCache,
      MockScreenLayout, MockSettingsCache, MockNavigatorMozPower, Developer) {
      navigator.mozPower = mozPower = MockNavigatorMozPower;
      var panel = document.body;
      developer = Developer();
      dialogService = MockDialogService;
      settingsCache = MockSettingsCache;
      developer.init({
        resetSwitch: panel.querySelector('.reset-devtools'),
        ftuLauncher: panel.querySelector('.ftuLauncher'),
        softwareHomeButton: panel.querySelector('.software-home-button'),
        homegesture: panel.querySelector('.homegesture')
      });
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozPower = realMozPower;
  });

  suite('developer initialized', function() {
    test('constructed', function() {
      assert.isFalse(developer._elements.resetSwitch.disabled);
    });
  });

  suite('factory reset', function() {
    test('button clicked', function() {
      var _resetDeviceStub = sinon.stub(developer, '_resetDevice');
      developer._elements.resetSwitch.click();
      assert(_resetDeviceStub.calledOnce);
      _resetDeviceStub.restore();
    });

    suite('_resetDevice', function() {
      var _wipeStub;
      function waitFor(test, callback) {
        test() ? callback() : setTimeout(() => waitFor(test, callback), 25);
      }

      setup(function() {
        _wipeStub = sinon.stub(developer, '_wipe');
      });

      teardown(function() {
        developer._wipe.restore();
      });

      test('with restricted devtools', function(done) {
        this.sinon.stub(dialogService, 'confirm').returns(
          Promise.resolve({ type: 'submit' }));
        developer._resetDevice();
        waitFor(() => _wipeStub.calledWith('root'), done);
      });

      test('with unrestricted devtools', function(done) {
        sinon.stub(settingsCache, 'getSettings', callback => callback({
          'devtools.unrestricted': true
        }));
        sinon.stub(dialogService, 'show', function() {
          return Promise.resolve({ type: 'submit', value: 'final_warning'});
        });
        developer._resetDevice();
        waitFor(() => dialogService.show.args.length === 2, () => {
          assert.equal(dialogService.show.args[1][0],
            'full-developer-mode-final-warning');
          done();
        });
      });
    });

    test('_wipe', function() {
      sinon.stub(mozPower, 'factoryReset');
      ['normal', 'root'].forEach(reason => {
        developer._wipe(reason);
        assert(mozPower.factoryReset.calledWith(reason));
      });
    });
  });
});
