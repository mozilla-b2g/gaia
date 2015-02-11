/* global BaseModule */
'use strict';

requireApp('system/js/base_module.js');
requireApp('system/js/audio_channel_manager.js');

suite('system/AudioChannelManager', function() {
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('AudioChannelManager');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('Should initial the module correctly', function() {
    assert.equal(subject._currentChannels.length, 0);
    assert.equal(subject._pausedChannels.length, 0);
    assert.equal(subject._smallerVolumeChannels.length, 0);
  });
});
