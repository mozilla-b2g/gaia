'use strict';

/* global MocksHelper, MockAudioContext, TonePlayer */

require('/shared/js/dialer/tone_player.js');
require('/shared/test/unit/mocks/mock_audio.js');

var mocksForTonePlayer = new MocksHelper([
  'AudioContext'
]).init();

suite('shared/dialer/TonePlayer', function() {
  mocksForTonePlayer.attachTestHelpers();

  teardown(function() {
    TonePlayer.trashAudio();
    TonePlayer._channel = null;
  });

  test('should do nothing before init', function() {
    TonePlayer.ensureAudio();
    assert.equal(MockAudioContext.instances.length, 0);
  });

  suite('init', function() {
    var realHidden, stubHidden;
    setup(function() {
      realHidden = document.hidden;

      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() { return stubHidden; }
      });

      stubHidden = false;
    });

    teardown(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() { return realHidden; }
      });
    });

    test('should instantiate an audio context with the channel', function() {
      TonePlayer.init('telephony');
      TonePlayer.ensureAudio();

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.mozAudioChannelType, 'telephony');
    });

    suite('when the app is hidden', function() {
      setup(function() {
        stubHidden = true;
        TonePlayer.init('telephony');
        TonePlayer.ensureAudio();
      });

      test('should not instantiate an audio context', function() {
        assert.equal(MockAudioContext.instances.length, 0);
      });

      test('should keep track of the channel for later ensures', function() {
        stubHidden = false;
        TonePlayer.ensureAudio();

        assert.equal(MockAudioContext.instances.length, 1);
        var ctx = MockAudioContext.instances[0];
        assert.equal(ctx.mozAudioChannelType, 'telephony');
      });
    });
  });

  suite('setChannel', function() {
    setup(function() {
      TonePlayer.init('normal');
      TonePlayer.ensureAudio();
    });

    test('should instantiate a new audio context with the channel',
    function() {
      TonePlayer.setChannel('telephony');

      assert.equal(MockAudioContext.instances.length, 2);
      var ctx = MockAudioContext.instances[1];
      assert.equal(ctx.mozAudioChannelType, 'telephony');
    });

    test('should do nothing if we\'re already on the correct channel',
    function() {
      TonePlayer.setChannel('normal');

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.mozAudioChannelType, 'normal');
    });

    suite('if the audio got trashed since init', function() {
      setup(function() {
        TonePlayer.trashAudio();
      });

      test('should instantiate a new audio context with the channel',
      function() {
        TonePlayer.setChannel('normal');

        assert.equal(MockAudioContext.instances.length, 2);
        var ctx = MockAudioContext.instances[1];
        assert.equal(ctx.mozAudioChannelType, 'normal');
      });
    });
  });

  suite('playSequence', function() {
    setup(function() {
      TonePlayer.init('normal');

      this.sinon.stub(TonePlayer, 'dummySound');
    });

    test('should instantiate a new audio context if needed', function() {
      assert.equal(MockAudioContext.instances.length, 0);

      TonePlayer.playSequence({'1': ['697', 1209]});

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.mozAudioChannelType, 'normal');
    });
  });

  suite('trashAudio', function() {
    setup(function() {
      TonePlayer.init('telephony');
      TonePlayer.ensureAudio();
    });

    test('telephony channel released', function() {
      TonePlayer.trashAudio();

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.mozAudioChannelType, 'normal');
    });

    test('should remember the channel for the next ensureAudio()', function() {
      TonePlayer.trashAudio();
      TonePlayer.ensureAudio();
      var ctx = MockAudioContext.instances[1];
      assert.equal(ctx.mozAudioChannelType, 'telephony');
    });
  });
});
