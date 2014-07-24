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
  });

  test('should do nothing before init', function() {
    TonePlayer.ensureAudio();
    assert.equal(MockAudioContext.instances.length, 0);
  });

  suite('init', function() {
    test('should instantiate an audio context with the channel', function() {
      TonePlayer.init('telephony');

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.mozAudioChannelType, 'telephony');
    });
  });

  suite('setChannel', function() {
    setup(function() {
      TonePlayer.init('normal');
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

  suite('trashAudio', function() {
    setup(function() {
      TonePlayer.init('telephony');
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
