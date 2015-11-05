'use strict';
/* global MocksHelper */
/* global MockNavigatorSettings */
/* global MockApplications */
/* global BaseModule */

requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/homescreen_launcher.js');

var mocksForHomescreenLauncher = new MocksHelper([
  'Applications', 'HomescreenWindow', 'Service'
]).init();

suite('system/HomescreenLauncher', function() {
  var realApplications, settingsCore, realSettings;

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;
  });

  setup(function() {
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    realApplications = window.applications;
    window.applications = MockApplications;
  });

  teardown(function() {
    settingsCore.stop();
    window.applications = realApplications;
    realApplications = null;
  });
  suite('start', function() {
    var homescreen;
    mocksForHomescreenLauncher.attachTestHelpers();

    setup(function() {
      MockApplications.ready = true;
    });
 
    teardown(function() {
      if (typeof window.homescreenLauncher !== 'undefined') {
        window.homescreenLauncher.stop();
        window.homescreenLauncher = undefined;
      }
    });

    test('start homescreen launcher', function() {
      window.homescreenLauncher = BaseModule.instantiate('HomescreenLauncher');
      window.homescreenLauncher.start();
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'first.home'});
      homescreen = window.homescreenLauncher.getHomescreen();
      assert.isTrue(homescreen.isHomescreen);
    });
  });

  suite('other than start', function() {
    var homescreen;
    mocksForHomescreenLauncher.attachTestHelpers();

    setup(function() {
      MockApplications.ready = true;
      window.homescreenLauncher =
        BaseModule.instantiate('HomescreenLauncher');
      window.homescreenLauncher.start();
    });

    teardown(function() {
      if (typeof window.homescreenLauncher !== 'undefined') {
        window.homescreenLauncher.stop();
        window.homescreenLauncher = undefined;
      }
    });

    test('replace the homescreen', function() {
      var changed = false;
      window.addEventListener('homescreen-changed',
        function homescreenChange() {
          window.removeEventListener('homescreen-changed', homescreenChange);
          changed = true;
      });
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'first.home'});
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubKill = this.sinon.stub(homescreen, 'kill');
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'second.home'});
      homescreen = window.homescreenLauncher.getHomescreen();
      assert.equal(homescreen.manifestURL, 'second.home');
      assert.isTrue(changed);
      assert.isTrue(stubKill.called);
      stubKill.restore();
    });

    test('homescreen is the same', function() {
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'first.home'});
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubEnsure = this.sinon.stub(homescreen, 'ensure');
      var changed = false;
      window.addEventListener('homescreen-changed',
        function homescreenChange2() {
          window.removeEventListener('homescreen-changed', homescreenChange2);
          changed = true;
      });
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'first.home'});
      homescreen = window.homescreenLauncher.getHomescreen();
      assert.isTrue(stubEnsure.called);
      assert.isFalse(changed);
      stubEnsure.restore();
    });

    test('homescreen ensure', function() {
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'first.home'});
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubEnsure = this.sinon.stub(homescreen, 'ensure');
      homescreen = window.homescreenLauncher.getHomescreen(true);
      homescreen = window.homescreenLauncher.getHomescreen(true);
      assert.isTrue(stubEnsure.calledTwice);
      stubEnsure.restore();
    });

    test('appopened', function() {   
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'first.home'});
      homescreen = window.homescreenLauncher.getHomescreen();    
      var stubFadeOut = this.sinon.stub(homescreen, 'fadeOut');    
   
      window.homescreenLauncher.handleEvent({    
        type: 'appopened',   
        detail: {    
          origin: 'fake'   
        }    
      });    
      assert.isTrue(stubFadeOut.called);   
    });

    test('keyboard showed', function() {
      MockNavigatorSettings.mTriggerObservers(
        'homescreen.manifestURL', { settingValue: 'first.home'});
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubFadeOut = this.sinon.stub(homescreen, 'fadeOut');
      window.homescreenLauncher.handleEvent({
        type: 'keyboardchange'
      });
      assert.isTrue(stubFadeOut.called);
      stubFadeOut.restore();
    });

    suite('software-button-*; resize the homescreenwindow', function() {
      var isResizeCalled, stubGetHomescreen;

      setup(function() {
        isResizeCalled = false;
        stubGetHomescreen = this.sinon.stub(window.homescreenLauncher,
          'getHomescreen',
          function() {
            return {'resize': function() {
              isResizeCalled = true;
            }};
          });
      });

      test('enabled', function() {
        window.homescreenLauncher.handleEvent({
          type: 'software-button-enabled'
        });
        assert.isTrue(isResizeCalled);
      });

      test('disabled', function() {
        window.homescreenLauncher.handleEvent({
          type: 'software-button-disabled'
        });
        assert.isTrue(isResizeCalled);
      });
    });
  });
});
