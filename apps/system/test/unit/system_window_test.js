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

  setup(function() {
    window.AudioChannelController = MockAudioChannelController;
    subject = BaseModule.instantiate('SystemWindow');
    subject.start();
  });

  teardown(function() {
    delete window.AudioChannelController;
  });  

  suite('Initialize the module', function() {
    test('The fake app window ID', function() {
      assert.equal(subject.instanceID, 'systemAppID');
    });

    test('Has no audio channel yet', function() {
      assert.equal(subject.audioChannels.size, 0);
    });
  });

  suite('MozChromeEvent handler', function(){
    test('Send MozContentEvent to get audio channels', function() {
      this.sinon.spy(subject, '_sendContentEvent');
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: { type: 'system-first-paint' }
      }));
      assert.ok(subject._sendContentEvent.calledOnce);
      assert.deepEqual(
        subject._sendContentEvent.args[0][0],
        { type: 'system-audiochannel-list' }
      );
    });

    test('Receive MozChromeEvent to get audio channels', function() {
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'system-audiochannel-list',
          audioChannels: ['normal', 'notification', 'telephony']
        }
      }));
      assert.ok(subject.audioChannels.has('normal'));
      assert.ok(subject.audioChannels.has('notification'));
      assert.ok(subject.audioChannels.has('telephony'));
    });
  });

  suite('Audio channels', function() {
    test('Get no audio channels', function() {
      var audioChannels = Service.query('getAudioChannels');
      assert.equal(audioChannels.size, 0);
    });

    test('Get audio channels', function() {
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'system-audiochannel-list',
          audioChannels: ['normal', 'notification', 'telephony']
        }
      }));
      var audioChannels = Service.query('getAudioChannels');
      assert.equal(audioChannels.size, 3);
      var names = audioChannels.keys();
      assert.equal(names.next().value, 'normal');
      assert.equal(names.next().value, 'notification');
      assert.equal(names.next().value, 'telephony');
    });
  });
});
