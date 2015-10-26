'use strict';

/* global SoundFeedbackPlayer, MockAudioContext, MockAudioBufferSourceNode,
          MockOfflineAudioContext */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/test/unit/mock_audio_context.js');

require('/js/keyboard/sound_feedback_player.js');

suite('SoundFeedbackPlayer', function() {
  var audioContextStub;
  var offlineAudioContextStub;
  var stubAudioBufferSourceNode;
  var expectedRequests;
  var audioBuffers;
  var fakeXhr;
  var player;

  setup(function(done) {
    var requests = [];
    expectedRequests = [
      { url: SoundFeedbackPlayer.prototype.CLICK_SOUND_URL,
        response: { stub: 'clickerArrayBuffer' } },
      { url: SoundFeedbackPlayer.prototype.SPECIAL_SOUND_URL,
        response: { stub: 'specialClickerArrayBuffer' } }
    ];
    fakeXhr = sinon.useFakeXMLHttpRequest();
    fakeXhr.onCreate = function(request) {
      requests.push(request);
    };

    audioBuffers = new Map();
    audioBuffers.set(
      expectedRequests[0].response, { stub: 'clickerAudioBuffer' });
    audioBuffers.set(
      expectedRequests[1].response, { stub: 'specialClickerAudioBuffer' });

    audioContextStub = new MockAudioContext('system');
    this.sinon.stub(window, 'AudioContext').returns(audioContextStub);

    offlineAudioContextStub = new MockOfflineAudioContext();
    this.sinon.stub(window, 'OfflineAudioContext')
      .returns(offlineAudioContextStub);
    this.sinon.stub(offlineAudioContextStub, 'decodeAudioData',
      function(arrayBuffer, successCallback, errorCallback) {
        var audioBuffer = audioBuffers.get(arrayBuffer);
        // Simulate async callback
        Promise.resolve(audioBuffer).then(successCallback);
      });

    stubAudioBufferSourceNode =
      this.sinon.stub(new MockAudioBufferSourceNode(audioContextStub));
    this.sinon.stub(audioContextStub, 'createBufferSource')
      .returns(stubAudioBufferSourceNode);

    player = new SoundFeedbackPlayer();
    var p = player.prepare();

    assert.equal(requests.length, 2);
    requests.forEach(function(request, i) {
      var expectedRequest = expectedRequests[i];

      assert.equal(request.url, expectedRequest.url);
      assert.equal(request.responseType, 'arraybuffer');
      request.response = expectedRequest.response;

      request.respond(200, {}, '');
    });

    p.then(function() { done(); }, done);
  });

  suite('activate', function() {
    setup(function() {
      assert.isFalse(window.AudioContext.called);
      player.activate();

      assert.isTrue(window.AudioContext.calledOnce);
    });

    test('mozAudioChannelType is system', function() {
      assert.isTrue(window.AudioContext.calledWith('system'));
      assert.equal(player._audioCtx.mozAudioChannelType, 'system');
    });

    test('activate again', function() {
      player.activate();

      assert.isFalse(window.AudioContext.calledTwice, 'caused a side effect');
    });

    test('deactivate', function() {
      player.deactivate();

      // XXX probing "private" variable since there is no way to tell
      // if the reference has been released without doing so.
      assert.equal(player._audioCtx, null);
    });

    test('play normal clicker', function() {
      player.play(false);

      var audioBuffer = audioBuffers.get(expectedRequests[0].response);
      assert.equal(stubAudioBufferSourceNode.buffer, audioBuffer);
      assert.isTrue(stubAudioBufferSourceNode.connect
        .calledWith(audioContextStub.destination));
      assert.isTrue(stubAudioBufferSourceNode.start.calledWith(0));
    });

    test('play special clicker', function() {
      player.play(true);

      var audioBuffer = audioBuffers.get(expectedRequests[1].response);
      assert.equal(stubAudioBufferSourceNode.buffer, audioBuffer);
      assert.isTrue(stubAudioBufferSourceNode.connect
        .calledWith(audioContextStub.destination));
      assert.isTrue(stubAudioBufferSourceNode.start.calledWith(0));
    });
  });
});
