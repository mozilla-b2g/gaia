/* globals AudioCompetingHelper, MocksHelper, MockAudioContext */

'use strict';

require('/shared/test/unit/mocks/mock_audio.js');

require('/js/audio_competing_helper.js');

var mocksHelperForAudioCompetingHelper = new MocksHelper([
  'Audio',
  'AudioContext',
]).init();


suite('callscreen / audio competing helper', function() {
  mocksHelperForAudioCompetingHelper.attachTestHelpers();

  var AudioCompetingApp = {
    onMozInterrupEventHandler: function acp_onMozInterrupEventHandler () {
    }
  };

  suiteSetup(function() {
    AudioCompetingHelper.init('AudioCompetingApp');
  });

  setup(function() {
    this.sinon.spy(MockAudioContext.prototype, 'addEventListener');
  });

  teardown(function() {
    AudioCompetingHelper.leaveCompetition();
  });

  suite('> event listener handling', function() {
    test('listeners are added and called if the helper starts competing',
      function() {
        this.sinon.spy(AudioCompetingApp, 'onMozInterrupEventHandler');
        AudioCompetingHelper.addListener(
          'mozinterruptbegin', AudioCompetingApp.onMozInterrupEventHandler
        );

        AudioCompetingHelper.compete();

        sinon.assert.calledWith(MockAudioContext.prototype.addEventListener,
                                'mozinterruptbegin');
        MockAudioContext.prototype.addEventListener.yield();
        sinon.assert.called(AudioCompetingApp.onMozInterrupEventHandler);
    });

    test('listeners are not called if they were removed', function() {
      this.sinon.spy(AudioCompetingApp, 'onMozInterrupEventHandler');
      AudioCompetingHelper.addListener(
        'mozinterruptbegin', AudioCompetingApp.onMozInterrupEventHandler
      );

      AudioCompetingHelper.clearListeners();

      AudioCompetingHelper.compete();

      MockAudioContext.prototype.addEventListener.yield();

      sinon.assert.notCalled(AudioCompetingApp.onMozInterrupEventHandler);
    });

    test('AudioContext/resources are released when the helper stops competing',
      function() {
        AudioCompetingHelper.leaveCompetition();
        assert.isNull(AudioCompetingHelper.audioContext);
    });
  });
});
