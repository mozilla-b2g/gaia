/* global CustomLogoPath, MockSettingsHelper, SettingsHelper,
          InitLogoHandler, Service, LogoLoader */

'use strict';

requireApp('system/test/unit/mock_logo_loader.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/js/service.js');
requireApp('system/js/init_logo_handler.js');

suite('init_logo_handler_test.js >', function() {
  var realSettingsHelper;
  const TINY_TIMEOUT = 20;

  const DEFAULT_VIDEO_ON = '/resources/power/carrier_power_on.mp4';
  const DEFAULT_VIDEO_OFF = '/resources/power/carrier_power_off.mp4';
  const DEFAULT_IMAGE_ON = '/resources/power/carrier_power_on.png';
  const DEFAULT_IMAGE_OFF = '/resources/power/carrier_power_off.png';
  const SETTING_POWER = 'operatorResources.power';

  suiteSetup(function() {
    realSettingsHelper = window.SettingsHelper;
    window.SettingsHelper = MockSettingsHelper;
  });

  suiteTeardown(function() {
    window.SettingsHelper = realSettingsHelper;
    realSettingsHelper = null;
  });

  setup(function() {
    window.SettingsHelper.mSetup();
    this.sinon.stub(document, 'getElementById')
          .returns(document.createElement('div'));
  });

  function assertCustomLogoPathValues(expectedValues) {
    var poweron = CustomLogoPath.poweron;
    var poweroff = CustomLogoPath.poweroff;
    assert.ok(poweron);
    assert.equal(poweron.video, expectedValues.poweron.video);
    assert.equal(poweron.image, expectedValues.poweron.image);
    assert.ok(poweroff);
    assert.equal(poweroff.video, expectedValues.poweroff.video);
    assert.equal(poweroff.image, expectedValues.poweroff.image);
  }

  function changeSettings(key, value) {
    SettingsHelper(key, {}).set(value);
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

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      this.sinon.useFakeTimers();
      changeSettings(SETTING_POWER, testCase.preValSet);
      CustomLogoPath.init();
      this.sinon.clock.tick(TINY_TIMEOUT);
      assertCustomLogoPathValues(testCase.expecValSet);
    });
  });

  suite('Hierarchy functions', function() {
    teardown(function() {
      InitLogoHandler.animated = false;
      InitLogoHandler.ready = false;
      InitLogoHandler.readyCallBack = null;
      InitLogoHandler.logoLoader = null;
    });

    test('Should request addHierarchy in init', function() {
      this.sinon.stub(Service, 'request');
      InitLogoHandler.init(new LogoLoader(CustomLogoPath.poweron));
      assert.isTrue(Service.request.calledWith('registerHierarchy'));
    });

    test('isActive', function() {
      InitLogoHandler.init(new LogoLoader(CustomLogoPath.poweron));
      InitLogoHandler._setReady();
      assert.isTrue(InitLogoHandler.isActive());
      InitLogoHandler.animate();
      assert.isFalse(InitLogoHandler.isActive());
    });

    test('activated', function() {
      this.sinon.stub(InitLogoHandler, 'publish');
      InitLogoHandler.init(new LogoLoader(CustomLogoPath.poweron));
      InitLogoHandler._setReady();
      assert.isTrue(InitLogoHandler.publish.calledWith('-activated'));
    });

    test('deactivated', function() {
      InitLogoHandler.init(new LogoLoader(CustomLogoPath.poweron));
      InitLogoHandler._setReady();
      this.sinon.stub(InitLogoHandler, 'publish');
      InitLogoHandler.animate();
      assert.isTrue(InitLogoHandler.publish.calledWith('-deactivated'));
    });
  });

  suite('Events handling', function() {
    setup(function() {
      InitLogoHandler.init(new LogoLoader(CustomLogoPath.poweron));
    });

    test('should block home event when active', function() {
      var evt = new CustomEvent('home');
      this.sinon.stub(InitLogoHandler, 'isActive').returns(true);
      var result = InitLogoHandler.respondToHierarchyEvent(evt);
      assert.isFalse(result);
    });

    test('should not block home event when not active', function() {
      var evt = new CustomEvent('home');
      this.sinon.stub(InitLogoHandler, 'isActive').returns(false);
      var result = InitLogoHandler.respondToHierarchyEvent(evt);
      assert.isTrue(result);
    });

    test('should block holdhome event when active', function() {
      var evt = new CustomEvent('holdhome');
      this.sinon.stub(InitLogoHandler, 'isActive').returns(true);
      var result = InitLogoHandler.respondToHierarchyEvent(evt);
      assert.isFalse(result);
    });

    test('should not block holdhome event when not active', function() {
      var evt = new CustomEvent('holdhome');
      this.sinon.stub(InitLogoHandler, 'isActive').returns(false);
      var result = InitLogoHandler.respondToHierarchyEvent(evt);
      assert.isTrue(result);
    });
  });
});
