/* global SettingsListener*/
'use strict';

suite('Sound > SliderHandler', function() {
  var sliderHandler;
  var realL10n, realMozSettings;
  var dom = document.createElement('li');

  var modules = [
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_navigator_moz_settings',
    'shared_mocks/mock_settings_listener',
    'panels/sound/slider_handler'
  ];
  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/settings_cache': 'unit/mock_settings_cache'
    }
  };

  setup(function(done) {
    testRequire(modules, maps, function(
      MockL10n, MockNavigatorSettings, MockSettingsListener, module) {
        window.SettingsListener = MockSettingsListener;
        // mock l10n
        realL10n = window.navigator.mozL10n;
        window.navigator.mozL10n = MockL10n;
        // mock mozSettings
        realMozSettings = navigator.mozSettings;
        window.navigator.mozSettings = MockNavigatorSettings;
        sliderHandler = module();
        done();
    });
  });

  teardown(function() {
    window.navigator.mozL10n = realL10n;
    window.navigator.mozSettings = realMozSettings;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(SettingsListener, 'observe');
      this.sinon.stub(dom, 'addEventListener');
    });

    test('we would get correct channelType', function() {
      sliderHandler.init(dom, 'content');
      assert.equal(sliderHandler._channelType, 'content');
    });

    test('we would get correct toneURL', function() {
      sliderHandler.init(dom, 'content');
      assert.equal(sliderHandler._toneURL,
        '/shared/resources/media/notifications/notifier_firefox.opus');

      sliderHandler.init(dom, 'alarm');
      assert.equal(sliderHandler._toneURL,
        '/shared/resources/media/alarms/ac_awake.opus');

      sliderHandler.init(dom, 'notification');
      assert.equal(sliderHandler._toneURL,
        '/shared/resources/media/ringtones/ringer_firefox.opus');
    });

    test('we would get correct toneKey', function() {
      sliderHandler.init(dom, 'content');
      assert.equal(sliderHandler._toneKey, 'media.ringtone');

      sliderHandler.init(dom, 'alarm');
      assert.equal(sliderHandler._toneKey, 'alarm.ringtone');

      sliderHandler.init(dom, 'notification');
      assert.equal(sliderHandler._toneKey, 'dialer.ringtone');
    });

    test('we would observe channelKey', function() {
      sliderHandler.init(dom, 'content');
      assert.ok(SettingsListener.observe.calledWith(
        sliderHandler._channelKey, '', sliderHandler._boundSetSliderValue));
    });

    test('we would call addEventListener on element', function() {
      sliderHandler.init(dom, 'content');
      assert.ok(dom.addEventListener.calledWith('touchstart'));
      assert.ok(dom.addEventListener.calledWith('input'));
      assert.ok(dom.addEventListener.calledWith('touchend'));
    });

    test('we would get correct previous value', function() {
      sliderHandler.init(dom, 'content');
      sliderHandler._setSliderValue(4);
      assert.equal(sliderHandler._previous, 4);

      sliderHandler._setSliderValue(8);
      assert.equal(sliderHandler._previous, 4);
    });
  });

  suite('_stopTone', function() {
    setup(function() {
      this.sinon.stub(sliderHandler._player, 'pause');
      this.sinon.stub(sliderHandler._player, 'removeAttribute');
      this.sinon.stub(sliderHandler._player, 'load');
      sliderHandler._stopTone();
    });

    test('we would call player operations', function() {
      assert.ok(sliderHandler._player.pause.called);
      assert.ok(sliderHandler._player.removeAttribute.calledWith('src'));
      assert.ok(sliderHandler._player.load.called);
    });
  });

  suite('_playTone', function() {
    var fakeBlob;

    setup(function() {
      fakeBlob = new Blob([], {type: 'audio/ogg'});
      this.sinon.stub(URL, 'createObjectURL');
      sliderHandler._player = {
        load: sinon.stub(),
        play: sinon.stub(),
        mozAudioChannelType: 'fakeChannelType'
      };
    });

    suite('_playTone with channelType: content', function() {
      setup(function() {
        sliderHandler._channelType = 'content';
      });

      test('we would call player operations', function() {
        sliderHandler._playTone(fakeBlob);
        assert.ok(URL.createObjectURL.calledWith(fakeBlob));
        assert.ok(sliderHandler._player.load.called);
        assert.ok(sliderHandler._player.play.called);
        assert.equal(sliderHandler._player.loop, true);
      });

      test('we would not change play mozAudioChannelType', function() {
        var originalChannelType = sliderHandler._player.mozAudioChannelType;
        sliderHandler._playTone(fakeBlob);
        assert.equal(sliderHandler._player.mozAudioChannelType,
          originalChannelType);
      });
    });

    suite('_playTone with channelType: alarm', function() {
      setup(function() {
        sliderHandler._channelType = 'alarm';
        sliderHandler._playTone(fakeBlob);
      });

      test('we would change play mozAudioChannelType when ' +
        'channelType is not content', function() {
          assert.equal(sliderHandler._player.mozAudioChannelType,
            sliderHandler._channelType);
      });
    });
  });

  suite('_touchStartHandler', function() {
    setup(function() {
      this.sinon.stub(SettingsListener, 'unobserve');
      this.sinon.stub(sliderHandler, '_stopTone');
      this.sinon.stub(sliderHandler, '_getToneBlob');
      sliderHandler._touchStartHandler();
    });

    test('we would make sure properties are set', function() {
      assert.isTrue(sliderHandler._isTouching);
      assert.isTrue(sliderHandler._isFirstInput);
    });

    test('we would call _stopTone', function() {
      assert.ok(sliderHandler._stopTone.called);
    });

    test('we would unobserve channelKey', function() {
      assert.ok(SettingsListener.unobserve.calledWith(
        sliderHandler._channelKey, sliderHandler._boundSetSliderValue));
    });

    test('we would call _getToneBlob', function() {
      assert.ok(sliderHandler._getToneBlob.called);
    });
  });

  suite('_inputHandler', function() {
    setup(function() {
      this.clock = sinon.useFakeTimers();
      this.sinon.spy(window, 'clearTimeout');
      this.sinon.spy(window, 'setInterval');
      this.sinon.spy(window, 'setTimeout');
      this.sinon.stub(sliderHandler, '_setVolume');
      this.sinon.stub(sliderHandler, '_stopTone');
      this.sinon.stub(SettingsListener, 'observe');
    });

    teardown(function() {
      this.clock.restore();
    });

    test('we would make sure _isFirstInput is unset', function() {
      sliderHandler._isFirstInput = true;
      sliderHandler._inputHandler();
      assert.isFalse(sliderHandler._isFirstInput);
    });

    test('we would skip this function if is not FirstInput', function() {
      sliderHandler._isFirstInput = false;
      sliderHandler._inputHandler();
      assert.isFalse(window.setInterval.called);
    });

    test('we would call _setVolume', function() {
      sliderHandler._isFirstInput = true;
      sliderHandler._inputHandler();
      assert.ok(sliderHandler._setVolume.called);
    });

    test('we would call setInterval', function() {
      sliderHandler._isFirstInput = true;
      sliderHandler._inputHandler();
      assert.ok(window.setInterval.calledOnce);
    });

    test('we would call setTimeout', function() {
      sliderHandler._isFirstInput = true;
      sliderHandler._inputHandler();
      assert.ok(window.setTimeout.calledOnce);
    });

    test('we would still call setTimeout if is not FirstInput', function() {
      sliderHandler._isFirstInput = false;
      sliderHandler._inputHandler();
      assert.ok(window.setTimeout.calledOnce);
    });

    test('we would observe channelKey', function() {
      sliderHandler._inputHandler();
      this.clock.tick(1000);
      assert.ok(SettingsListener.observe.calledWith(
        sliderHandler._channelKey, '', sliderHandler._boundSetSliderValue));
    });

    test('we would call _stopTone', function() {
      sliderHandler._inputHandler();
      this.clock.tick(1000);
      assert.ok(sliderHandler._stopTone.called);
    });
  });

  suite('_touchEndHandler', function() {
    setup(function() {
      this.sinon.spy(window, 'clearInterval');
      this.sinon.stub(sliderHandler, '_setVolume');

      sliderHandler._intervalID = 123;
      sliderHandler._isTouching = true;
      sliderHandler._touchEndHandler();
    });

    teardown(function() {
      window.clearInterval.restore();
    });

    test('we would make sure _isTouching is unset', function() {
      assert.isFalse(sliderHandler._isTouching);
    });

    test('we would call _setVolume', function() {
      assert.ok(sliderHandler._setVolume.called);
    });

    test('we would call clearInterval', function() {
      assert.ok(clearInterval.calledWith(sliderHandler._intervalID));
    });
  });
});
