'use strict';

/* global DialerRinger, MocksHelper, MockNavigatorMozTelephony,
          MockSettingsListener, MockSettingsURL, MockAudio */

require('/js/dialer_ringer.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');

var mocksForDialerRinger = new MocksHelper([
  'SettingsListener',
  'Audio',
  'SettingsURL'
]).init();

suite('system/DialerRinger', function() {
  mocksForDialerRinger.attachTestHelpers();
  var realTelephony, realVibrate;

  var subject;

  suiteSetup(function() {
    realTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realVibrate = navigator.vibrate;
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realTelephony;
    navigator.vibrate = realVibrate;
  });

  setup(function() {
    this.sinon.useFakeTimers();

    subject = new DialerRinger().start();
  });

  teardown(function() {
    subject.stop();
    MockNavigatorMozTelephony.mTeardown();
  });

  function MockCall(state) {
    this.state = state;
    this.addEventListener = function() {};
    this.removeEventListener = function() {};
  }

  suite('Audio element setup', function() {
    var mockAudio;

    setup(function() {
      mockAudio = MockAudio.instances[0];
    });

    test('it should set the channel', function() {
      assert.equal(mockAudio.mozAudioChannelType, 'ringer');
    });

    test('it should preload metadata', function() {
      assert.equal(mockAudio.preload, 'metadata');
    });

    test('it should loop', function() {
      assert.isTrue(mockAudio.loop);
    });

    test('it should load the ringtone from the settings', function() {
      assert.isUndefined(mockAudio.src);

      var blob = new Blob([], {type: 'audio/ogg'});
      var src = '----uniq----';
      this.sinon.stub(MockSettingsURL.prototype, 'set').withArgs(blob).returns(
        src
      );
      MockSettingsListener.mTriggerCallback('dialer.ringtone', blob);

      assert.equal(mockAudio.src, src);
    });
  });

  suite('When an incoming call comes in', function() {
    var vibrateSpy;
    var mockCall;
    var mockAudio;

    setup(function() {
      vibrateSpy = this.sinon.spy();
      navigator.vibrate = vibrateSpy;

      mockAudio = MockAudio.instances[0];
      mockAudio.src = '---';
      this.sinon.spy(mockAudio, 'play');
      this.sinon.spy(mockAudio, 'pause');

      mockCall = new MockCall('incoming');
      this.sinon.spy(mockCall, 'addEventListener');
      this.sinon.spy(mockCall, 'removeEventListener');
      MockNavigatorMozTelephony.calls = [mockCall];
    });

    suite('if the vibration is enabled', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', true);
        var evt = new CustomEvent('callschanged');
        MockNavigatorMozTelephony.mTriggerEvent(evt);
      });

      test('it should start vibrating', function() {
        assert.isTrue(vibrateSpy.calledWith([200]));
      });

      test('it should vibrate every 600ms', function() {
        this.sinon.clock.tick(600);
        assert.isTrue(vibrateSpy.calledTwice);
        this.sinon.clock.tick(600);
        assert.isTrue(vibrateSpy.calledThrice);
      });

      test('it should stop when the call state changes', function() {
        mockCall.addEventListener.yield();
        vibrateSpy.reset();
        this.sinon.clock.tick(600);
        assert.isTrue(vibrateSpy.notCalled);
      });

      test('it should stop when the user presses volume down', function() {
        window.dispatchEvent(new CustomEvent('volumedown'));
        vibrateSpy.reset();
        this.sinon.clock.tick(600);
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('if the vibration is disabled', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', false);
        var evt = new CustomEvent('callschanged');
        MockNavigatorMozTelephony.mTriggerEvent(evt);
      });

      test('it should not vibrate', function() {
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('if the ringtone has a volume', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 7);
        var evt = new CustomEvent('callschanged');
        MockNavigatorMozTelephony.mTriggerEvent(evt);
      });

      test('it should play the ringtone', function() {
        assert.isTrue(mockAudio.play.calledOnce);
      });

      test('it should pause when the call state changes', function() {
        mockCall.addEventListener.yield();
        assert.isTrue(mockAudio.pause.calledOnce);
      });

      test('it should pause when the user presses the sleep button',
      function() {
        window.dispatchEvent(new CustomEvent('sleep'));
        assert.isTrue(mockAudio.pause.calledOnce);
      });

      suite('but we have no audio source loaded', function() {
        setup(function() {
          mockAudio.readyState = 0;
        });

        test('pressing the sleep button should not do anything', function() {
          window.dispatchEvent(new CustomEvent('sleep'));
          assert.isTrue(mockAudio.pause.notCalled);
        });
      });
    });

    suite('if the ringtone is muted', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 0);
        var evt = new CustomEvent('callschanged');
        MockNavigatorMozTelephony.mTriggerEvent(evt);
      });

      test('it should not play the ringtone', function() {
        assert.isTrue(mockAudio.play.notCalled);
      });
    });

    test('it should listen to the state changes of the call', function() {
      MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
      assert.isTrue(mockCall.addEventListener.calledWith('statechange'));
    });

    test('it should not listen twice if we get multiple callschanged',
    function() {
      MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
      MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
      assert.isTrue(mockCall.addEventListener.calledOnce);
    });

    test('it should remove the statechange listener after the first trigger',
    function() {
      MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
      mockCall.addEventListener.yield();
      assert.isTrue(mockCall.removeEventListener.calledWith('statechange'));
    });
  });

  suite('When a second incoming call comes in', function() {
    var vibrateSpy;
    var secondCall;
    var mockAudio;

    setup(function() {
      var mockCall = new MockCall('incoming');
      this.sinon.spy(mockCall, 'addEventListener');
      MockNavigatorMozTelephony.calls = [mockCall];
      MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
      mockCall.addEventListener.yield();

      secondCall = new MockCall('incoming');
      this.sinon.spy(secondCall, 'addEventListener');
      MockNavigatorMozTelephony.calls = [mockCall, secondCall];

      vibrateSpy = this.sinon.spy();
      navigator.vibrate = vibrateSpy;

      mockAudio = MockAudio.instances[0];
      this.sinon.spy(mockAudio, 'play');

      MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
    });

    suite('even if the vibration is enabled', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', true);
      });

      test('it should not vibrate', function() {
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('even if the ringtone has a volume', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 7);
      });

      test('it should not play', function() {
        assert.isTrue(mockAudio.play.notCalled);
      });
    });

    test('it should not listen to the state changes of the call', function() {
      assert.isTrue(secondCall.addEventListener.notCalled);
    });
  });

  suite('When a outgoing call goes out', function() {
    var vibrateSpy;
    var mockCall;
    var mockAudio;

    setup(function() {
      vibrateSpy = this.sinon.spy();
      navigator.vibrate = vibrateSpy;

      mockAudio = MockAudio.instances[0];
      this.sinon.spy(mockAudio, 'play');

      mockCall = new MockCall('outgoing');
      this.sinon.spy(mockCall, 'addEventListener');
      MockNavigatorMozTelephony.calls = [mockCall];
      MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
    });

    suite('even if the vibration is enabled', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', true);
      });

      test('it should not vibrate', function() {
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('even if the ringtone has a volume', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 7);
      });

      test('it should not play', function() {
        assert.isTrue(mockAudio.play.notCalled);
      });
    });

    test('it should not listen to the state changes of the call', function() {
      assert.isTrue(mockCall.addEventListener.notCalled);
    });
  });

  test('should throw if started twice', function(done) {
    try {
      subject.start();
    } catch (e) {
      assert.ok(e);
      done();
    }
  });

  test('should not do anything if mozTelephony is unavailable', function() {
    MockSettingsListener.mCallbacks = {};
    MockAudio.mTeardown();
    navigator.mozTelephony = undefined;

    subject = new DialerRinger();
    subject.start();

    assert.equal(MockAudio.instances.length, 0);
    assert.deepEqual(MockSettingsListener.mCallbacks, {});

    navigator.mozTelephony = MockNavigatorMozTelephony;
  });
});
