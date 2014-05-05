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

  suite('init', function() {
    test('should instantiate an audio context with the channel', function() {
      TonePlayer.init('telephony');

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.channel, 'telephony');
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
      assert.equal(ctx.channel, 'telephony');
    });

    test('should do nothing if we\'re already on the correct channel',
    function() {
      TonePlayer.setChannel('normal');

      assert.equal(MockAudioContext.instances.length, 1);
      var ctx = MockAudioContext.instances[0];
      assert.equal(ctx.channel, 'normal');
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
        assert.equal(ctx.channel, 'normal');
      });
    });
  });
});
