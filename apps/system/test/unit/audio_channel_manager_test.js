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
    assert.equal(subject._playingApps.length, 0);
    assert.equal(subject._pausedApps.length, 0);
  });
});
