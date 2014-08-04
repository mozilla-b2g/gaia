/* globals AudioCompetingHelper */

'use strict';

require('/js/audio_competing_helper.js');

suite('callscreen / audio competing helper', function() {
  var AudioCompetingApp = {
    onMozInterrupEventHandler: function acp_onMozInterrupEventHandler () {
    }
  };

  suiteSetup(function() {
    AudioCompetingHelper.init('AudioCompetingApp');
  });

  suite('> event listener handling', function() {
    test('listeners are added and called if the helper starts competing',
      function() {
        this.sinon.spy(AudioCompetingApp, 'onMozInterrupEventHandler');
        AudioCompetingHelper.addListener(
          'mozinterruptbegin', AudioCompetingApp.onMozInterrupEventHandler
        );

        AudioCompetingHelper.compete();

        var evt = new CustomEvent('mozinterruptbegin');
        AudioCompetingHelper.audioContext.dispatchEvent(evt);
        sinon.assert.called(AudioCompetingApp.onMozInterrupEventHandler);
    });

    test('listeners are not called if they were removed', function() {
      this.sinon.spy(AudioCompetingApp, 'onMozInterrupEventHandler');
      AudioCompetingHelper.clearListeners();

      AudioCompetingHelper.compete();

      var evt = new CustomEvent('mozinterruptbegin');
      AudioCompetingHelper.audioContext.dispatchEvent(evt);
      sinon.assert.notCalled(AudioCompetingApp.onMozInterrupEventHandler);
    });

    test('AudioContext/resources are released when the helper stops competing',
      function() {
        AudioCompetingHelper.leaveCompetition();
        assert.isNull(AudioCompetingHelper.audioContext);
    });
  });
});
