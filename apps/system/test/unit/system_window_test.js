'use strict';
/* global BaseModule */
/* global MockAudioChannelController */
/* global Service */

requireApp('system/test/unit/mock_audio_channel_controller.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/system_window.js');

suite('system/SystemWindow', function() {
  var subject;
  var realACM;

  setup(function() {
    window.AudioChannelController = MockAudioChannelController;
    navigator.mozAudioChannelManager = {
      allowedAudioChannels: [
        { name: 'normal' },
        { name: 'notification' },
        { name: 'telephony' }
      ]
    };
    subject = BaseModule.instantiate('SystemWindow');
    subject.start();
  });

  teardown(function() {
    delete window.AudioChannelController;
    navigator.mozAudioChannelManager = realACM;
  });

  test('The fake app window ID', function() {
    assert.equal(subject.instanceID, 'systemAppID');
  });

  test('Get audio channels', function() {
    var audioChannels = Service.query('getAudioChannels');
    assert.equal(audioChannels.size, 3);
    var names = audioChannels.keys();
    assert.equal(names.next().value, 'normal');
    assert.equal(names.next().value, 'notification');
    assert.equal(names.next().value, 'telephony');
  });
});
