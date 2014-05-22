'use strict';

/* global DialerAgent, MocksHelper, MockNavigatorMozTelephony,
          MockSettingsListener, MockSettingsURL, MockAudio,
          MockAttentionScreen, System */

require('/js/dialer_agent.js');
require('/test/unit/mock_attention_screen.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');

var mocksForDialerAgent = new MocksHelper([
  'AttentionScreen',
  'Audio',
  'SettingsListener',
  'SettingsURL'
]).init();

mocha.globals(['System']);

suite('system/DialerAgent', function() {
  mocksForDialerAgent.attachTestHelpers();
  var realTelephony, realVibrate, realSystem;

  var subject;
  var setVisibleSpy;

  function callschanged() {
    MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
  }

  function assertAttentionScreen(src, spy) {
    sinon.assert.calledWithMatch(spy, {
      target: {
        src: src
      },
      detail: {
        features: 'attention',
        name: 'call_screen',
        frameElement: {
          src: src
        }
      }
    });
  }

  suiteSetup(function() {
    realTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realVibrate = navigator.vibrate;

    realSystem = window.System;
    window.System = {locked: false};
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realTelephony;
    navigator.vibrate = realVibrate;
    window.System = realSystem;
  });

  var CSORIGIN = window.location.origin.replace('system', 'callscreen') + '/';

  setup(function() {
    if (!('setVisible' in HTMLIFrameElement.prototype)) {
      HTMLIFrameElement.prototype.setVisible = function stub() {};
    }
    setVisibleSpy = this.sinon.spy(HTMLIFrameElement.prototype, 'setVisible');

    this.sinon.useFakeTimers();
    subject = new DialerAgent().start();
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

  suite('Call screen setup', function() {
    var csFrame;

    setup(function() {
      csFrame = MockAttentionScreen.attentionScreen.querySelector('iframe');
    });

    test('it should be named call_screen', function() {
      assert.equal(csFrame.getAttribute('name'), 'call_screen');
    });

    test('it should be a mozbrowser iframe', function() {
      assert.equal(csFrame.getAttribute('mozbrowser'), 'true');
    });

    test('it should be in process', function() {
      assert.equal(csFrame.getAttribute('remote'), 'false');
    });

    test('it should be a mozapp', function() {
      var manifestURL = CSORIGIN + 'manifest.webapp';
      assert.equal(csFrame.getAttribute('mozapp'), manifestURL);
    });

    test('it should have the correct frameOrigin', function() {
      assert.equal(csFrame.dataset.frameOrigin, CSORIGIN);
    });

    test('it should be hidden at first', function() {
      assert.equal(csFrame.dataset.hidden, 'true');
      sinon.assert.calledOnce(setVisibleSpy);
      sinon.assert.calledWith(setVisibleSpy, false);
    });

    test('it should be preloaded', function() {
      var src = CSORIGIN + 'index.html';
      assert.equal(csFrame.src, src);
      assert.equal(csFrame.dataset.preloaded, 'true');
    });
  });

  suite('When an incoming call comes in', function() {
    var vibrateSpy;
    var mockCall;
    var mockAudio;
    var callScreen;

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

      callScreen = MockAttentionScreen.attentionScreen.querySelector('iframe');
    });

    suite('> Call screen opening', function() {
      suite('> When the lockscreen is unlocked', function() {
        test('it should open the call screen and force a hashchange',
        function() {
          var attentionSpy = this.sinon.spy(MockAttentionScreen, 'open');
          callschanged();

          var src = CSORIGIN + 'index.html#&timestamp=0';
          assertAttentionScreen(src, attentionSpy);
        });
      });

      suite('> When the lockscreen is locked', function() {
        setup(function() {
          System.locked = true;
        });

        teardown(function() {
          System.locked = false;
        });

        test('it should open the call screen on #locked', function() {
          var attentionSpy = this.sinon.spy(MockAttentionScreen, 'open');
          callschanged();

          var src = CSORIGIN + 'index.html#locked&timestamp=0';
          assertAttentionScreen(src, attentionSpy);
        });
      });

      test('it should set the callscreen visibility to true', function() {
        callschanged();
        sinon.assert.calledTwice(setVisibleSpy);
        assert.isTrue(setVisibleSpy.lastCall.args[0]);
      });
    });

    suite('if the vibration is enabled', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', true);
        callschanged();
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
        callschanged();
      });

      test('it should not vibrate', function() {
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('if the ringtone has a volume', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 7);
        callschanged();
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
        callschanged();
      });

      test('it should not play the ringtone', function() {
        assert.isTrue(mockAudio.play.notCalled);
      });
    });

    test('it should listen to the state changes of the call', function() {
      callschanged();
      assert.isTrue(mockCall.addEventListener.calledWith('statechange'));
    });

    test('it should not listen twice if we get multiple callschanged',
    function() {
      callschanged();
      callschanged();
      assert.isTrue(mockCall.addEventListener.calledOnce);
    });

    test('it should remove the statechange listener after the first trigger',
    function() {
      callschanged();
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
      callschanged();
      mockCall.addEventListener.yield();

      secondCall = new MockCall('incoming');
      this.sinon.spy(secondCall, 'addEventListener');
      MockNavigatorMozTelephony.calls = [mockCall, secondCall];

      vibrateSpy = this.sinon.spy();
      navigator.vibrate = vibrateSpy;

      mockAudio = MockAudio.instances[0];
      this.sinon.spy(mockAudio, 'play');

      callschanged();
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

      mockCall = new MockCall('dialing');
      this.sinon.spy(mockCall, 'addEventListener');
      MockNavigatorMozTelephony.calls = [mockCall];
    });

    suite('even if the vibration is enabled', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', true);
        callschanged();
      });

      test('it should not vibrate', function() {
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('even if the ringtone has a volume', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 7);
        callschanged();
      });

      test('it should not play', function() {
        assert.isTrue(mockAudio.play.notCalled);
      });
    });

    test('it should not listen to the state changes of the call', function() {
      callschanged();
      assert.isTrue(mockCall.addEventListener.notCalled);
    });

    suite('> Call screen opening', function() {
      suite('> When the lockscreen is unlocked', function() {
        test('it should open the call screen', function() {
          var attentionSpy = this.sinon.spy(MockAttentionScreen, 'open');
          callschanged();

          var src = CSORIGIN + 'index.html#&timestamp=0';
          assertAttentionScreen(src, attentionSpy);
        });
      });

      suite('> When the lockscreen is locked', function() {
        setup(function() {
          System.locked = true;
        });

        teardown(function() {
          System.locked = false;
        });

        test('it should open the call screen on #locked and force a hashchange',
        function() {
          var attentionSpy = this.sinon.spy(MockAttentionScreen, 'open');
          callschanged();

          var src = CSORIGIN + 'index.html#locked&timestamp=0';
          assertAttentionScreen(src, attentionSpy);
        });
      });
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

    subject = new DialerAgent();
    subject.start();

    assert.equal(MockAudio.instances.length, 0);
    assert.deepEqual(MockSettingsListener.mCallbacks, {});

    navigator.mozTelephony = MockNavigatorMozTelephony;
  });
});
