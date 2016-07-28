'use strict';

/* global MocksHelper, MockAudioContext, MockNavigatorMozTelephony, TonePlayer
 */

require('/shared/js/dialer/tone_player.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');

var mocksForTonePlayer = new MocksHelper([
  'AudioContext'
]).init();

suite('shared/dialer/TonePlayer', function() {
  var realMozTelephony;
  var isDocumentHidden = false;

  mocksForTonePlayer.attachTestHelpers();

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return isDocumentHidden;
      }
    });
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
  });

  teardown(function() {
    TonePlayer.teardown();
    MockNavigatorMozTelephony.mTeardown();
    isDocumentHidden = false;
  });

  test('should do nothing before init', function() {
    TonePlayer._ensureAudio();
    assert.equal(MockAudioContext.instances.length, 0);
  });

  suite('init', function() {
    setup(function() {
      TonePlayer.init('telephony');
    });

    test('should not instantiate an audio context', function() {
      assert.equal(MockAudioContext.instances.length, 0);
    });

    test('should mark the object as initialized', function() {
      assert.isTrue(TonePlayer._initialized);
    });
  });

  suite('visibilitychange event', function() {
    test('should trash the audio context when hidden', function() {
      TonePlayer.init('content');
      this.sinon.spy(TonePlayer, '_trashAudio');
      isDocumentHidden = true;
      window.dispatchEvent(new CustomEvent('visibilitychange'));

      sinon.assert.calledOnce(TonePlayer._trashAudio);
    });

    suite('during a call', function() {
      setup(function() {
        MockNavigatorMozTelephony.calls = [{}];
      });

      test('should trash the audio context using a non-telephony channel',
      function() {
        TonePlayer.init('content');
        this.sinon.spy(TonePlayer, '_trashAudio');
        isDocumentHidden = true;
        window.dispatchEvent(new CustomEvent('visibilitychange'));

        sinon.assert.calledOnce(TonePlayer._trashAudio);
      });

      test('should not trash the audio context using a telephony channel',
      function() {
        TonePlayer.init('telephony');
        this.sinon.spy(TonePlayer, '_trashAudio');
        isDocumentHidden = true;
        window.dispatchEvent(new CustomEvent('visibilitychange'));

        sinon.assert.notCalled(TonePlayer._trashAudio);
      });
    });

    suite('during a conference call', function() {
      setup(function() {
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls = [{}];
      });

      test('should trash the audio context using a non-telephony channel',
      function() {
        TonePlayer.init('content');
        this.sinon.spy(TonePlayer, '_trashAudio');
        isDocumentHidden = true;
        window.dispatchEvent(new CustomEvent('visibilitychange'));

        sinon.assert.calledOnce(TonePlayer._trashAudio);
      });

      test('should not trash the audio context using a telephony channel',
      function() {
        TonePlayer.init('telephony');
        this.sinon.spy(TonePlayer, '_trashAudio');
        isDocumentHidden = true;
        window.dispatchEvent(new CustomEvent('visibilitychange'));

        sinon.assert.notCalled(TonePlayer._trashAudio);
      });
    });
  });

  suite('oncallschanged event', function() {
    setup(function() {
      isDocumentHidden = true;
      MockNavigatorMozTelephony.calls = [{}];
    });

    suite('using a telephony channel when hidden', function() {
      setup(function() {
        TonePlayer.init('telephony');
      });

      test('should only trash the audio context when a call ends',
      function() {
        this.sinon.spy(TonePlayer, '_trashAudio');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.notCalled(TonePlayer._trashAudio);
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(TonePlayer._trashAudio);
      });

      test('should not trash the audio context during a conference call',
      function() {
        this.sinon.spy(TonePlayer, '_trashAudio');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.notCalled(TonePlayer._trashAudio);
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls = [{}];
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.notCalled(TonePlayer._trashAudio);
      });

      test('should trash the audio context when the conference call ends',
      function() {
        this.sinon.spy(TonePlayer, '_trashAudio');
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls = [{}];
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.notCalled(TonePlayer._trashAudio);
        MockNavigatorMozTelephony.conferenceGroup.calls = [];
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(TonePlayer._trashAudio);
      });
    });

    suite('using another channel when hidden', function() {
      setup(function() {
        TonePlayer.init('content');
      });

      test('should always trash the audio context', function() {
        this.sinon.spy(TonePlayer, '_trashAudio');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(TonePlayer._trashAudio);
        MockNavigatorMozTelephony.conferenceGroup.calls = [{}];
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledTwice(TonePlayer._trashAudio);
      });
    });
  });

  suite('playSequence', function() {
    setup(function() {
      TonePlayer.init('content');
    });

    test('should instantiate a new audio context if needed', function() {
      assert.equal(MockAudioContext.instances.length, 0);

      TonePlayer.playSequence({'1': ['697', 1209]});

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.mozAudioChannelType, 'content');
    });
  });

  suite('start', function() {
    setup(function() {
      TonePlayer.init('content');
    });

    test('should instantiate a new audio context if needed', function() {
      assert.equal(MockAudioContext.instances.length, 0);

      TonePlayer.start(['697', 1209], true);

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.mozAudioChannelType, 'content');
    });
  });

  suite('_trashAudio', function() {
    setup(function() {
      TonePlayer.init('telephony');
      TonePlayer._ensureAudio();
    });

    test('telephony channel released', function() {
      TonePlayer._trashAudio();
      assert.isNull(TonePlayer._audioContext);
    });

    test('should remember the channel for the next _ensureAudio()', function() {
      TonePlayer._trashAudio();
      TonePlayer._ensureAudio();
      var ctx = MockAudioContext.instances[1];
      assert.equal(ctx.mozAudioChannelType, 'telephony');
    });
  });
});
