'use strict';

/* global SoundFeedbackPlayer, MockAudioContext, MockAudioBufferSourceNode */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/test/unit/mock_audio_context.js');

require('/js/keyboard/sound_feedback_player.js');

suite('SoundFeedbackPlayer', function() {
  var audioContextStub;
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

    audioContextStub = new MockAudioContext();
    this.sinon.stub(window, 'AudioContext').returns(audioContextStub);
    this.sinon.stub(audioContextStub, 'decodeAudioData',
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
