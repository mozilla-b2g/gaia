/* global AudioChannelController */
'use strict';

requireApp('system/js/base_ui.js');
requireApp('system/js/audio_channel_controller.js');

suite('system/AudioChannelController', function() {
  var subject;
  var mockApp = {
    instanceID: 'appID' ,
    element: {}
  };
  var mockChannel = {
    _domRequest: {},
    name: 'channelName' ,
    isActive: function() {
      return mockChannel._domRequest;
    },
    setMuted: function() {
      return mockChannel._domRequest;
    },
    setVolume: function() {
      return mockChannel._domRequest;
    },
    _triggerDomRequestOnsuccess: function() {
      mockChannel._domRequest.onsuccess({
        target: { result: true }
      });
    }
  };

  suite('AudioChannelController for System app', function() {
    var audioChannelName;

    setup(function() {
      var systemAppWindow = {
        instanceID: 'systemAppID',
        isSystem: true,
      };
      audioChannelName = 'notification';
      subject = new AudioChannelController(systemAppWindow, {
        name: audioChannelName
      });
    });

    suite('MozChromeEvent handlers', function() {
      setup(function() {
        this.sinon.spy(subject, 'publish');
        this.sinon.spy(subject, 'debug');
      });

      test('The notification audio channel is active', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-state-changed',
            name: 'notification',
            isActive: true
          }
        }));
        assert.ok(subject.isActive());
        assert.ok(subject.publish.withArgs('statechanged').calledOnce);
      });

      test('Other audio channel is active', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-state-changed',
            name: 'normal',
            isActive: true
          }
        }));
        assert.equal(subject.isActive(), false);
        assert.ok(subject.publish.withArgs('statechanged').notCalled);
      });

      test('Play the audio channel', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-mute-onsuccess',
            name: 'notification',
            isMuted: false
          }
        }));
        assert.ok(subject.debug.calledOnce);
      });

      test('Cannot play the audio channel', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-mute-onerror',
            name: 'notification',
            isMuted: false
          }
        }));
        assert.ok(subject.debug.calledOnce);
      });

      test('Pause the audio channel', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-mute-onsuccess',
            name: 'notification',
            isMuted: true
          }
        }));
        assert.ok(subject.debug.calledOnce);
      });

      test('Cannot pause the audio channel', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-mute-onerror',
            name: 'notification',
            isMuted: true
          }
        }));
        assert.ok(subject.debug.calledOnce);
      });

      test('Set volume of the audio channel', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-volume-onsuccess',
            name: 'notification',
            volume: 0.2
          }
        }));
        assert.ok(subject.debug.calledOnce);
      });

      test('Cannot set volume of the audio channel', function() {
        window.dispatchEvent(new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'system-audiochannel-volume-onerror',
            name: 'notification',
            volume: 0.2
          }
        }));
        assert.ok(subject.debug.calledOnce);
      });
    });

    suite('Handle audio channel', function() {
      setup(function() {
        this.sinon.stub(subject, '_sendContentEvent');
      });

      test('Play the audio channel', function() {
        subject._play();
        assert.equal(subject.isPlaying(), true);
        assert.ok(subject._sendContentEvent.calledOnce);
        assert.deepEqual(
          subject._sendContentEvent.args[0][0],
          {
            type: 'system-audiochannel-mute',
            isMuted: false
          }
        );
      });

      test('Pause the audio channel', function() {
        subject._pause();
        assert.equal(subject.isPlaying(), false);
        assert.ok(subject._sendContentEvent.calledOnce);
        assert.deepEqual(
          subject._sendContentEvent.args[0][0],
          {
            type: 'system-audiochannel-mute',
            isMuted: true
          }
        );
      });

      test('Set the volume of audio channel', function() {
        subject._setVolume(1);
        assert.ok(subject._sendContentEvent.calledOnce);
        assert.deepEqual(
          subject._sendContentEvent.args[0][0],
          { type: 'system-audiochannel-volume', volume: 1 }
        );
      });
    });

    test('Send MozContentEvent', function(done) {
      var handler = function(evt) {
        window.removeEventListener('mozContentEvent', handler);
        assert.deepEqual(evt.detail, {
          type: 'system-audiochannel-mute',
          name: 'notification',
          isMuted: false
        });
        done();
      };
      window.addEventListener('mozContentEvent', handler);
      subject._sendContentEvent({
        type: 'system-audiochannel-mute',
        isMuted: false
      });
    });

    test('Generate instance ID', function() {
      var instanceID = 'systemAppID_' + audioChannelName;
      subject._generateID();
      assert.equal(subject.instanceID, instanceID);
    });
  });

  suite('AudioChannelController for apps except System app', function() {
    setup(function() {
      mockApp.element = sinon.extend(mockApp.element, sinon.EventTarget);
      mockChannel = sinon.extend(mockChannel, sinon.EventTarget);
      subject = new AudioChannelController(mockApp, mockChannel);
    });

    suite('Initialize the module', function() {
      test('Audio channel is not active', function() {
        assert.equal(subject.isActive(), false);
      });

      test('Audio channel is not playing', function() {
        assert.equal(subject.isPlaying(), false);
      });

      test('Audio channel is not fading out', function() {
        assert.equal(subject.isFadingOut(), false);
      });

      test('It is not vibrating', function() {
        assert.equal(subject.isVibrating(), false);
      });

      test('It is not vibrating', function() {
        assert.equal(subject.isVibrating(), false);
      });

      test('The policy is empty', function() {
        assert.equal(Object.keys(subject._policy).length, 0);
      });
    });

    suite('Event handlers', function() {
      setup(function() {
        this.sinon.spy(subject, 'publish');
      });

      test('Handle activestatechanged event', function() {
        mockChannel.dispatchEvent(
          new sinon.CustomEvent('activestatechanged', {}, mockChannel)
        );
        mockChannel._triggerDomRequestOnsuccess();
        assert.ok(subject.publish.withArgs('statechanged').calledOnce);
      });

      test('Handle _destroyed event', function() {
        mockApp.element.dispatchEvent(new CustomEvent('_destroyed'));
        assert.ok(subject.publish.withArgs('destroyed').calledOnce);
      });
    });

    suite('Deal with policies', function() {
      setup(function() {
        this.sinon.spy(subject, '_play');
        this.sinon.spy(subject, '_pause');
        this.sinon.spy(subject, '_fadeOut');
        this.sinon.spy(subject, '_fadeIn');
        this.sinon.spy(subject, '_vibrate');
      });

      test('Set policy', function() {
        var policy = { isAllowedToPlay: true };
        var audioChanel = subject.setPolicy(policy);
        assert.deepEqual(subject._policy, policy);
        assert.ok(audioChanel instanceof AudioChannelController);
      });

      test('Get policy', function() {
        var expectedPolicy = { isAllowedToPlay: true };
        var policy = subject.setPolicy(expectedPolicy)
          .proceedPolicy()
          .getPolicy();
        assert.deepEqual(policy, expectedPolicy);
      });

      test('Play the audio channel', function() {
        subject
          .setPolicy({ isAllowedToPlay: true })
          .proceedPolicy();
        assert.ok(subject._play.calledOnce);
        assert.ok(subject._pause.notCalled);
        assert.ok(subject._fadeOut.notCalled);
        assert.ok(subject._fadeIn.notCalled);
        assert.ok(subject._vibrate.notCalled);
      });

      test('Pause the audio channel', function() {
        subject
          .setPolicy({ isAllowedToPlay: false })
          .proceedPolicy();
        assert.ok(subject._pause.calledOnce);
        assert.ok(subject._play.notCalled);
        assert.ok(subject._fadeOut.notCalled);
        assert.ok(subject._fadeIn.notCalled);
        assert.ok(subject._vibrate.notCalled);
      });

      test('Fade in the audio channel', function() {
        subject
          .setPolicy({ isNeededToFadeOut: false })
          .proceedPolicy();
        assert.ok(subject._fadeIn.calledOnce);
        assert.ok(subject._play.notCalled);
        assert.ok(subject._pause.notCalled);
        assert.ok(subject._fadeOut.notCalled);
        assert.ok(subject._vibrate.notCalled);
      });

      test('Fade out the audio channel', function() {
        subject
          .setPolicy({ isNeededToFadeOut: true })
          .proceedPolicy();
        assert.ok(subject._fadeOut.calledOnce);
        assert.ok(subject._play.calledOnce);
        assert.ok(subject._pause.notCalled);
        assert.ok(subject._fadeIn.notCalled);
        assert.ok(subject._vibrate.notCalled);
      });

      test('Vibrate for the audio channel', function() {
        subject
          .setPolicy({ isNeededToVibrate: true })
          .proceedPolicy();
        assert.ok(subject._vibrate.calledOnce);
        assert.ok(subject._play.notCalled);
        assert.ok(subject._pause.notCalled);
        assert.ok(subject._fadeOut.notCalled);
        assert.ok(subject._fadeIn.notCalled);
      });

      test('Do nothing', function() {
        subject.setPolicy().proceedPolicy();
        assert.ok(subject._play.notCalled);
        assert.ok(subject._pause.notCalled);
        assert.ok(subject._fadeOut.notCalled);
        assert.ok(subject._fadeIn.notCalled);
        assert.ok(subject._vibrate.notCalled);
      });
    });

    suite('Handle audio channel', function() {
      test('Play the audio channel', function() {
        subject._play();
        assert.equal(subject.isPlaying(), true);
      });

      test('Fade in the audio channel', function() {
        this.sinon.spy(subject, '_setVolume');
        var FADE_IN_VOLUME = 1;
        subject._fadeIn();
        assert.ok(subject._setVolume.withArgs(FADE_IN_VOLUME).calledOnce);
        assert.equal(subject.isFadingOut(), false);
      });

      test('Fade out the audio channel', function() {
        this.sinon.spy(subject, '_play');
        this.sinon.spy(subject, '_setVolume');
        var FADE_OUT_VOLUME = 0.2;
        subject._fadeOut();
        assert.ok(subject._play.calledOnce);
        assert.ok(subject._setVolume.withArgs(FADE_OUT_VOLUME).calledOnce);
        assert.equal(subject.isFadingOut(), true);
      });

      test('Pause the audio channel', function() {
        subject._pause();
        assert.equal(subject.isPlaying(), false);
      });

      suite('Vibrate for the audio channel', function() {
        test('Start vibration', function() {
          subject._vibrate();
          assert.equal(subject.isVibrating(), true);
        });

        test('Stop vibration', function() {
          var VIBRATION_DURATION = 1000;
          var clock = this.sinon.useFakeTimers();
          subject._vibrate();
          clock.tick(VIBRATION_DURATION);
          assert.equal(subject.isVibrating(), false);
        });
      });

      test('Set the volume of audio channel', function() {
        this.sinon.spy(mockChannel, 'setVolume');
        subject._setVolume(1);
        assert.ok(mockChannel.setVolume.withArgs(1).calledOnce);
      });
    });

    test('Generate instance ID', function() {
      var instanceID = mockApp.instanceID + '_' + mockChannel.name;
      subject._generateID();
      assert.equal(subject.instanceID, instanceID);
    });
  });
});
