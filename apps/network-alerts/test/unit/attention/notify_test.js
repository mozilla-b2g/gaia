/*global
   AudioContext,
   MockAudioContext,
   MockNavigatorSettings,
   MocksHelper,
   Notify
*/

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/js/attention/notify.js');

var mocksHelperNotifications = new MocksHelper([
  'AudioContext'
]).init();

suite('check the ringtone and vibrate function', function() {
  var realMozSettings;
  var getStub, setStub;
  var isDocumentHidden = true;

  mocksHelperNotifications.attachTestHelpers();

  setup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    this.sinon.stub(navigator, 'vibrate');
    this.sinon.spy(window, 'AudioContext');

    this.sinon.stub(
      MockAudioContext.prototype, 'createOscillator',
      () => sinon.stub({
        frequency: { value: 0 },
        type: '',
        connect() {},
        start() {},
        stop() {}
      })
    );

    this.sinon.stub(
      MockAudioContext.prototype, 'createGain',
      () => sinon.stub({
        gain: sinon.stub({ setValueCurveAtTime() {} }),
        connect() {}
      })
    );

    getStub = sinon.stub();
    setStub = sinon.stub();

    this.sinon.stub(MockNavigatorSettings, 'createLock').returns({
      get: getStub,
      set: setStub
    });

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => isDocumentHidden
    });
  });

  teardown(function() {
    navigator.mozSettings = realMozSettings;
    delete document.hidden;
  });

  function sendVisibilityEvent() {
    var visibilityEvent = new CustomEvent(
      'visibilitychange',
      { bubbles: true }
    );

    window.dispatchEvent(visibilityEvent);
  }

  function assertVibrate() {
    sinon.assert.calledWith(
      navigator.vibrate,
      [2000, 500, 1000, 500, 1000, 500, 2000, 500, 1000, 500, 1000, 500]
    );
  }

  function assertAudio() {
    sinon.assert.calledWith(AudioContext, 'notification');
    sinon.assert.calledTwice(AudioContext.prototype.createOscillator);
    sinon.assert.calledOnce(AudioContext.prototype.createGain);

    var audioCtx = AudioContext.firstCall.returnValue;
    var gainNode = AudioContext.prototype.createGain.firstCall.returnValue;
    var o1 = AudioContext.prototype.createOscillator.firstCall.returnValue;
    var o2 = AudioContext.prototype.createOscillator.secondCall.returnValue;

    assert.equal(o1.type, 'sine');
    assert.equal(o2.type, 'sine');

    // either one case or the other
    try {
      assert.equal(o1.frequency.value, 853);
      assert.equal(o2.frequency.value, 960);
    } catch(e) {
      assert.equal(o2.frequency.value, 853);
      assert.equal(o1.frequency.value, 960);
    }

    sinon.assert.called(o1.connect);
    sinon.assert.called(o2.connect);
    sinon.assert.calledWith(o1.connect, gainNode);
    sinon.assert.calledWith(o2.connect, gainNode);
    sinon.assert.calledWith(gainNode.connect, audioCtx.destination);

    sinon.assert.called(o1.start);
    sinon.assert.called(o2.start);
    sinon.assert.called(o1.stop);
    sinon.assert.called(o2.stop);
    sinon.assert.calledWith(o1.stop, 11);
    sinon.assert.calledWith(o2.stop, 11);

    sinon.assert.called(gainNode.gain.setValueCurveAtTime);
    sinon.assert.calledWith(
      gainNode.gain.setValueCurveAtTime,
      sinon.match.instanceOf(Float32Array), 0, 11
    );
  }

  function setSettings(settings) {
    for (var key in settings) {
      getStub.withArgs(key).returns(Promise.resolve({
        [key]: settings[key]
      }));
    }
  }

  suite('mozSettings is unavailable', function() {
    test('We do nothing but we do not stop', function(done) {
      delete navigator.mozSettings;

      Notify.notify().then(() => {
        sinon.assert.notCalled(AudioContext);
        sinon.assert.notCalled(navigator.vibrate);
      }).then(done, done);
    });
  });

  suite('volume is 1 and vibration is enabled', function() {
    test('play ringtone and vibrate', function(done) {
      setSettings({
        'audio.volume.notification': 1,
        'vibration.enabled': true
      });

      Notify.notify().then(() => {
        // let's be sure we vibrate after the visibility event only
        sinon.assert.notCalled(navigator.vibrate);
        // As document is not shown in the test, we launch the
        // event of visibility
        sendVisibilityEvent();
        assertAudio();
        assertVibrate();
      }).then(done, done);
    });
  });

  suite('volume is 1 and vibration is disabled', function() {
    test('play ringtone and do not vibrate', function(done) {
      setSettings({
        'audio.volume.notification': 1,
        'vibration.enabled': false
      });

      Notify.notify().then(() => {
        sinon.assert.notCalled(navigator.vibrate);
        assertAudio();
      }).then(done, done);
    });
  });

  suite('volume is 0 and vibration is enabled', function() {
    test('do not play ringtone and vibrate', function(done) {
      setSettings({
        'audio.volume.notification': 0,
        'vibration.enabled': true
      });

      Notify.notify().then(() => {
        sinon.assert.notCalled(navigator.vibrate);
        // As document is not shown in the test, we launch the
        // event of visibility
        sendVisibilityEvent();

        sinon.assert.notCalled(AudioContext);

        assertVibrate();
      }).then(done, done);
    });

    test('vibrate asap if the app is displayed', function(done) {
      setSettings({
        'audio.volume.notification': 0,
        'vibration.enabled': true
      });
      isDocumentHidden = false;

      Notify.notify().then(() => {
        assertVibrate();
      }).then(done, done);
    });
  });

  suite('volume is 0 and vibration is disabled', function() {
    test('do not play ringtone and do not vibrate', function(done) {
      setSettings({
        'audio.volume.notification': 0,
        'vibration.enabled': false
      });

      Notify.notify().then(() => {
        sinon.assert.notCalled(navigator.vibrate);
        sinon.assert.notCalled(AudioContext);
      }).then(done, done);
    });
  });
});
