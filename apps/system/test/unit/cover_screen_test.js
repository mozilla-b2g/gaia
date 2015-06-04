/* global MockNavigatorSettings, MockMozPower, BaseModule */

'use strict';

requireApp('system/test/unit/mock_logo_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/cover_screen.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_power.js');

suite('CoverScreen >', function() {
  var settingsCore, realSettings, subject, realMozPower;
  const DEFAULT_VIDEO_ON = '/resources/power/carrier_power_on.mp4';
  const DEFAULT_VIDEO_OFF = '/resources/power/carrier_power_off.mp4';
  const DEFAULT_IMAGE_ON = '/resources/power/carrier_power_on.png';
  const DEFAULT_IMAGE_OFF = '/resources/power/carrier_power_off.png';
  const SETTING_POWER = 'operatorResources.power';

  suiteSetup(function() {
    realMozPower = navigator.mozPower;
    navigator.mozPower = MockMozPower;
    MockNavigatorSettings.mSyncRepliesOnly = true;
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
  });

  suiteTeardown(function() {
    settingsCore.stop();
    navigator.mozPower = realMozPower;
    window.navigator.mozSettings = realSettings;
  });

  function assertLogoPathValues(expectedValues) {
    var poweron = subject._poweron;
    var poweroff = subject._poweroff;
    assert.ok(poweron);
    assert.equal(poweron.video, expectedValues.poweron.video);
    assert.equal(poweron.image, expectedValues.poweron.image);
    assert.ok(poweroff);
    assert.equal(poweroff.video, expectedValues.poweroff.video);
    assert.equal(poweroff.image, expectedValues.poweroff.image);
  }

  function changeSettings(key, value) {
    MockNavigatorSettings.mTriggerObservers(key,
      { settingValue: value });
  }

  var testCases = [
  {
    'preValSet':
    {
      'poweron.video': 'operatorVariantT1/poweron/video.mp4',
      'poweron.image': 'operatorVariantT1/poweron/image.png',
      'poweroff.video': 'operatorVariantT1/poweroff/video.mp4',
      'poweroff.image': 'operatorVariantT1/poweroff/image.png'
    },
    'expecValSet':
    {
      poweron: {
        'video': 'operatorVariantT1/poweron/video.mp4',
        'image': 'operatorVariantT1/poweron/image.png'
      },
      poweroff: {
        'video': 'operatorVariantT1/poweroff/video.mp4',
        'image': 'operatorVariantT1/poweroff/image.png'
      }
    },
    'title': 'Setting power On/Off exists and has all posible values >'
  },
  {
    'preValSet':
    {
      'poweron.image': 'operatorVariantT2/poweron/image.png',
      'poweroff.video': 'operatorVariantT2/poweroff/video.mp4'
    },
    'expecValSet':
    {
      poweron: {
        'video': DEFAULT_VIDEO_ON,
        'image': 'operatorVariantT2/poweron/image.png'
      },
      poweroff: {
        'video': 'operatorVariantT2/poweroff/video.mp4',
        'image': DEFAULT_IMAGE_OFF
      }
    },
    'title': 'Setting power On/Off exists and has some of the posible values >'
  },
  {
    'preValSet': {},
    'expecValSet':
    {
      poweron: {
        'video': DEFAULT_VIDEO_ON,
        'image': DEFAULT_IMAGE_ON
      },
      poweroff: {
        'video': DEFAULT_VIDEO_OFF,
        'image': DEFAULT_IMAGE_OFF
      }
    },
    'title': 'Setting power On/Off does not exists >'
  }
  ];

  setup(function() {
    this.sinon.stub(document, 'getElementById', function(id) {
      var fakeElement = document.createElement('div');
      if (id === 'poweroff-splash') {
        return null;
      } else {
        return fakeElement.cloneNode(true);
      }
    });
    subject = BaseModule.instantiate('CoverScreen');
  });

  teardown(function() {
    subject.stop();
  });

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      subject.start();
      changeSettings(SETTING_POWER, testCase.preValSet);
      assertLogoPathValues(testCase.expecValSet);
    });
  });

  test('restart requested', function() {
    var stub = this.sinon.stub(navigator.mozPower, 'reboot');
    subject.poweroff(true);
    var element = document.createElement('div');
    var transitionStub = this.sinon.stub(element, 'addEventListener');
    subject.poweroffLogoLoader.onload(element);
    transitionStub.getCall(0).args[1]();
    assert.ok(stub.calledOnce);
  });

  test('triggers will-shutdown event on shutdown', function() {
    this.sinon.stub(subject, 'publish');
    subject.poweroff(false);
    assert.isTrue(subject.publish.calledWith('will-shutdown'));
  });

  test('poweroff requested', function() {
    var stub = this.sinon.stub(navigator.mozPower, 'powerOff');
    subject.poweroff(false);

    var element = document.createElement('div');
    var transitionStub = this.sinon.stub(element, 'addEventListener');
    subject.poweroffLogoLoader.onload(element);
    transitionStub.getCall(0).args[1]();
    assert.ok(stub.calledOnce);
  });

  suite('Hierarchy functions', function() {
    test('Should request addHierarchy when started', function() {
      this.sinon.stub(subject.service, 'request');
      subject.start();
      assert.isTrue(
        subject.service.request.calledWith('registerHierarchy'));
    });

    test('isActive', function() {
      subject.start();
      subject.poweron();
      subject._setReady();
      assert.isTrue(subject.isActive());
      subject.animatePoweronLogo();
      assert.isFalse(subject.isActive());
    });

    test('activated', function() {
      this.sinon.stub(subject, 'publish');
      subject.start();
      subject.poweron();
      subject._setReady();
      assert.isTrue(subject.publish.calledWith('-activated'));
    });

    test('deactivated', function() {
      subject.start();
      subject.poweron();
      subject._setReady();
      this.sinon.stub(subject, 'publish');
      subject.animatePoweronLogo();
      assert.isTrue(subject.publish.calledWith('-deactivated'));
    });
  });
});
