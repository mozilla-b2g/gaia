'use strict';

/* global DialerAgent, MocksHelper, MockNavigatorMozTelephony,
          MockNavigatorSettings, MockSettingsURL, MockAudio, MockApplications,
          MockService */

require('/js/dialer_agent.js');
require('/test/unit/mock_app_window.js');
require('/test/unit/mock_applications.js');
require('/test/unit/mock_attention_window.js');
requireApp('system/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksForDialerAgent = new MocksHelper([
  'Audio',
  'SettingsURL',
  'LazyLoader',
  'Service'
]).init();

suite('system/DialerAgent', function() {
  mocksForDialerAgent.attachTestHelpers();
  var realTelephony, realVibrate, realApplications, realMozSettings;

  var subject;
  var setVisibleSpy;

  function callschanged() {
    MockNavigatorMozTelephony.mTriggerEvent(new CustomEvent('callschanged'));
  }

  suiteSetup(function() {
    realApplications = window.applications;
    window.applications = MockApplications;
    realTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;
    realVibrate = navigator.vibrate;
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.applications = realApplications;
    MockNavigatorMozTelephony.mSuiteTeardown();
    navigator.mozTelephony = realTelephony;
    navigator.vibrate = realVibrate;
    navigator.mozSettings = realMozSettings;
  });

  setup(function(done) {
    MockNavigatorSettings.mSetup();
    MockNavigatorSettings.mSyncRepliesOnly = true;
    MockNavigatorSettings.mSet({
      'audio.volume.notification': 7,
      'dialer.ringtone': null,
      'vibration.enabled': true
    });

    if (!('setVisible' in HTMLIFrameElement.prototype)) {
      HTMLIFrameElement.prototype.setVisible = function stub() {};
    }
    setVisibleSpy = this.sinon.spy(HTMLIFrameElement.prototype, 'setVisible');

    this.sinon.useFakeTimers();
    subject = new DialerAgent();
    subject.start().then(done, done);
    MockNavigatorSettings.mReplyToRequests();
  });

  teardown(function() {
    subject.stop();
    MockService.mTeardown();
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorSettings.mTeardown();
  });

  function MockCall(state) {
    this.state = state;
    this.addEventListener = function() {};
    this.removeEventListener = function() {};
    this.hangUp = function() {};
  }

  test('Should load tone player if just upgraded', function(done) {
    window.toneUpgrader = {
      perform: this.sinon.spy()
    };
    subject.stop();
    MockService.mockQueryWith('justUpgraded', true);
    subject.start().then(function() {
      assert.isTrue(window.toneUpgrader.perform.calledWith('ringtone'));
      delete window.toneUpgrader;
      subject.stop();
    }).then(done, done);
    MockNavigatorSettings.mReplyToRequests();
  });

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
      assert.isNull(mockAudio.src);

      var blob = new Blob([], {type: 'audio/ogg'});
      var src = '----uniq----';
      this.sinon.stub(MockSettingsURL.prototype, 'set').withArgs(blob).returns(
        src
      );
      MockNavigatorSettings.mTriggerObservers(
        'dialer.ringtone', { settingValue: blob }
      );

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
        MockNavigatorSettings.mTriggerObservers(
          'vibration.enabled', { settingValue: true }
        );
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

      test('it should stop when the user presses the power button', function() {
        window.dispatchEvent(new CustomEvent('sleep'));
        vibrateSpy.reset();
        this.sinon.clock.tick(600);
        sinon.assert.notCalled(vibrateSpy);
      });
    });

    suite('if the vibration is disabled', function() {
      setup(function() {
        MockNavigatorSettings.mTriggerObservers(
          'vibration.enabled', { settingValue: false }
        );
        callschanged();
      });

      test('it should not vibrate', function() {
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('if the ringtone has a volume', function() {
      setup(function() {
        MockNavigatorSettings.mTriggerObservers(
          'audio.volume.notification', { settingValue: 7 }
        );
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
        MockNavigatorSettings.mTriggerObservers(
          'audio.volume.notification', { settingValue: 0 }
        );
        callschanged();
      });

      test('it should play the silent ringtone', function() {
        sinon.assert.calledOnce(mockAudio.play);
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
      mockCall.state = 'connected';

      secondCall = new MockCall('incoming');
      this.sinon.spy(secondCall, 'addEventListener');
      MockNavigatorMozTelephony.calls = [mockCall, secondCall];

      vibrateSpy = this.sinon.spy();
      navigator.vibrate = vibrateSpy;

      mockAudio = MockAudio.instances[0];
      this.sinon.spy(mockAudio, 'play');

      this.sinon.spy(MockService, 'request');

      callschanged();
    });

    test('it should show the callscreen', function() {
      sinon.assert.calledOnce(MockService.request);
      sinon.assert.calledWith(
        MockService.request, 'AttentionWindowManager:showCallscreenWindow'
      );
    });

    suite('if the vibration is enabled', function() {
      setup(function() {
        MockNavigatorSettings.mTriggerObservers(
          'vibration.enabled', { settingValue: true }
        );
        callschanged();
      });

      test('it should start vibrating', function() {
        sinon.assert.calledWith(vibrateSpy, [200]);
      });

      test('it should vibrate every 600ms', function() {
        this.sinon.clock.tick(600);
        sinon.assert.calledTwice(vibrateSpy);
        this.sinon.clock.tick(600);
        sinon.assert.calledThrice(vibrateSpy);
      });

      test('it should stop when the call state changes', function() {
        secondCall.addEventListener.yield();
        vibrateSpy.reset();
        this.sinon.clock.tick(600);
        sinon.assert.notCalled(vibrateSpy);
      });

      test('it should stop when the user presses volume down', function() {
        window.dispatchEvent(new CustomEvent('volumedown'));
        vibrateSpy.reset();
        this.sinon.clock.tick(600);
        sinon.assert.notCalled(vibrateSpy);
      });

      test('it should stop when the user presses the power button', function() {
        window.dispatchEvent(new CustomEvent('sleep'));
        vibrateSpy.reset();
        this.sinon.clock.tick(600);
        sinon.assert.notCalled(vibrateSpy);
      });
    });

    suite('even if the ringtone has a volume', function() {
      setup(function() {
        MockNavigatorSettings.mTriggerObservers(
          'audio.volume.notification', { settingValue: 7 }
        );
        callschanged();
      });

      test('it should play the silent ringtone', function() {
        assert.equal(mockAudio.volume, 0.0);
        sinon.assert.called(mockAudio.play);
      });
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
        MockNavigatorSettings.mTriggerObservers(
          'vibration.enabled', { settingValue: true }
        );
        callschanged();
      });

      test('it should not vibrate', function() {
        assert.isTrue(vibrateSpy.notCalled);
      });
    });

    suite('even if the ringtone has a volume', function() {
      setup(function() {
        MockNavigatorSettings.mTriggerObservers(
          'audio.volume.notification', { settingValue: 7 }
        );
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
    subject.stop();
    MockAudio.mTeardown();
    MockNavigatorSettings.mTeardown();

    navigator.mozTelephony = undefined;

    subject = new DialerAgent();
    subject.start();

    assert.equal(MockAudio.instances.length, 0);
    assert.deepEqual(
      MockNavigatorSettings.mObservers, MockNavigatorSettings.mRemovedObservers
    );

    navigator.mozTelephony = MockNavigatorMozTelephony;
  });

  suite('wake events', function() {
    setup(function() {
      this.sinon.spy(MockService, 'request');
    });

    test('during a call should turn on the screen', function() {
      MockNavigatorMozTelephony.calls = [new MockCall()];
      window.dispatchEvent(new CustomEvent('wake'));
      sinon.assert.calledOnce(MockService.request);
      sinon.assert.calledWith(MockService.request, 'turnScreenOn');
    });

    test('when not on a call should be ignored', function() {
      window.dispatchEvent(new CustomEvent('wake'));
      sinon.assert.notCalled(MockService.request);
    });
  });

  suite('sleep events', function() {
    test('when alerting stop playing the ringtone', function() {
      var mockAudio = MockAudio.instances[0];

      this.sinon.spy(mockAudio, 'pause');
      MockNavigatorMozTelephony.calls = [new MockCall('incoming')];
      MockNavigatorMozTelephony.mTriggerCallsChanged();
      window.dispatchEvent(new CustomEvent('sleep'));
      sinon.assert.calledOnce(mockAudio.pause);
    });

    test('when not alerting hang up all connected calls', function() {
      var mockCalls = [ new MockCall() , new MockCall() ];

      mockCalls.forEach((mockCall) => this.sinon.spy(mockCall, 'hangUp'));
      MockNavigatorMozTelephony.calls = mockCalls;
      window.dispatchEvent(new CustomEvent('sleep'));
      mockCalls.forEach((mockCall) => sinon.assert.calledOnce(mockCall.hangUp));
    });

    test('when not alerting hang up the conference call', function() {
      var mockCalls = [ new MockCall() , new MockCall() ];

      MockNavigatorMozTelephony.conferenceGroup.calls = mockCalls;
      this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'hangUp');
      MockNavigatorMozTelephony.calls = mockCalls;
      window.dispatchEvent(new CustomEvent('sleep'));
      sinon.assert.calledOnce(MockNavigatorMozTelephony.conferenceGroup.hangUp);
    });
  });

  suite('onCall', function() {
    test('returns true when on a call', function() {
      MockNavigatorMozTelephony.calls = [ new MockCall() ];

      assert.isTrue(subject.onCall());
    });

    test('returns true when on a conference call', function() {
      MockNavigatorMozTelephony.conferenceGroup.calls = [
        new MockCall() , new MockCall()
      ];

      assert.isTrue(subject.onCall());
    });

    test('returns false when not on a call', function() {
      assert.isFalse(subject.onCall());
    });

    test('registers as a service when the dialer service is alive',
    function(done) {
      subject.stop();

      this.sinon.spy(MockService, 'registerState');
      this.sinon.spy(MockService, 'unregisterState');

      subject = new DialerAgent();
      subject.start().then(function() {
        sinon.assert.calledOnce(MockService.registerState);
        sinon.assert.calledWith(MockService.registerState, 'onCall', subject);
        subject.stop();
        sinon.assert.calledOnce(MockService.unregisterState);
        sinon.assert.calledWith(MockService.unregisterState, 'onCall', subject);
      }).then(done, done);
      MockNavigatorSettings.mReplyToRequests();
    });
  });
});
