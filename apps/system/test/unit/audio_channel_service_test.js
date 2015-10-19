/* global BaseModule, MockAudioChannelController, MockService */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_audio_channel_controller.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/audio_channel_service.js');

suite('system/AudioChannelService', function() {
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('AudioChannelService');
    subject.audioChannelPolicy = {
      applyPolicy: function() {}
    };
    var audioChannels = new Map();
    ['normal', 'notification', 'telephony'].forEach(function(name) {
      var audioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: name }
      );
      audioChannels.set(name, audioChannel);
    });
    subject.service = MockService;
    MockService.mockQueryWith('SystemWindow.getAudioChannels', audioChannels);
    this.sinon.spy(subject, '_sendContentEvent');
    subject.start();
  });

  teardown(function() {
    subject.stop();
    subject.audioChannelPolicy = undefined;
  });

  test('Should initial the module correctly', function() {
    assert.equal(subject._activeAudioChannels.size, 0);
    assert.equal(subject._interruptedAudioChannels.length, 0);
  });

  test('Set all audio channels belonged to System app as muted', function() {
    assert.ok(subject._sendContentEvent.calledThrice);
    ['normal', 'notification', 'telephony'].forEach(function(name , i) {
      assert.deepEqual(
        subject._sendContentEvent.args[i][0],
        {
          type: 'system-audiochannel-mute',
          name: name,
          isMuted: true
        }
      );
    });
  });

  test('Handle audiochannelstatechanged event', function() {
    this.sinon.spy(subject, '_manageAudioChannels');
    var audioChannel = new MockAudioChannelController(
      { instanceID: 'appID' }, { name: 'content' }
    );
    var event = new CustomEvent('audiochannelstatechanged', {
      detail: audioChannel
    });
    window.dispatchEvent(event);
    assert.ok(subject._manageAudioChannels.calledOnce);
  });

  test('Handle audiochanneldestroyed event', function() {
    this.sinon.spy(subject, '_deleteAudioChannelFromInterruptedAudioChannels');
    this.sinon.spy(subject, '_resumeAudioChannels');
    var instanceID = 'theAudioChannelID';
    var audioChannel = { instanceID: instanceID };
    var event = new CustomEvent('audiochanneldestroyed', {
      detail: audioChannel
    });
    // The audio channel is playing.
    subject._activeAudioChannels.set(instanceID, audioChannel);
    window.dispatchEvent(event);
    assert.ok(!subject._activeAudioChannels.has(instanceID));
    assert.ok(subject._deleteAudioChannelFromInterruptedAudioChannels
      .withArgs(audioChannel).calledOnce);
    assert.ok(subject._resumeAudioChannels.calledOnce);
  });

  suite('Handle hierarchytopmostwindowchanged event', function() {
    var app;
    var event;

    setup(function() {
      event = new CustomEvent('hierarchytopmostwindowchanged');
      app  = {
        instanceID: 'appID',
        audioChannels: new Map()
      };
      var audioChannel = new MockAudioChannelController(
        app, { name: 'normal' }
      );
      this.sinon.stub(audioChannel, 'isPlaying', function() {
        return true;
      });
      app.audioChannels.set('normal', audioChannel);
      window.Service = {
        query: function() {
          return app;
        }
      };
    });

    teardown(function() {
      delete window.Service;
    });

    test('Resume all active audio channels in the app', function() {
      this.sinon.spy(subject, '_resumeAudioChannels');
      window.dispatchEvent(event);
      assert.ok(subject._resumeAudioChannels.withArgs(app).calledOnce);
    });
  });

  test('Handle systemwindowaudiochannelsregistered event', function() {
    var event = new CustomEvent('systemwindowaudiochannelsregistered');
    this.sinon.spy(subject, '_muteSystemAudioChannels');
    window.dispatchEvent(event);
    assert.ok(subject._muteSystemAudioChannels.calledOnce);
  });

  suite('Manage audio channels', function() {
    var audioChannel;

    setup(function() {
      audioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: 'content' }
      );
    });

    test('Handle new and active audio channels', function() {
      var isActiveStub = this.sinon.stub(audioChannel, 'isActive', function() {
        return true;
      });
      this.sinon.spy(subject.audioChannelPolicy, 'applyPolicy');
      this.sinon.spy(subject, '_handleAudioChannel');
      this.sinon.stub(subject, '_isAudioChannelInBackground', function() {
        return false;
      });
      subject._manageAudioChannels(audioChannel);
      assert.ok(isActiveStub.calledOnce);
      assert.ok(subject.audioChannelPolicy.applyPolicy.calledOnce);
      assert.ok(subject._isAudioChannelInBackground
        .withArgs(audioChannel).calledOnce);
      assert.ok(subject._handleAudioChannel
        .withArgs(audioChannel).calledOnce);  
    });

    test('Handle inactive audio channel ', function() {
      this.sinon.stub(audioChannel, 'isActive', function() {
        return false;
      });
      this.sinon.spy(subject, 'publish');
      subject._manageAudioChannels(audioChannel);
      var channel = { channel: 'none' };
      assert.ok(subject.publish
        .withArgs('audiochannelchanged', channel).calledOnce);
    });

    suite('Foreground/background audio channel', function() {
      setup(function() {
        this.sinon.stub(audioChannel, 'isActive', function() {
          return true;
        });
        this.sinon.spy(subject, 'publish');
      });

      test('In foreground', function() {
        this.sinon.stub(subject, '_isAudioChannelInBackground', function() {
          return false;
        });
        subject._manageAudioChannels(audioChannel);
        var channel = { channel: 'content' };
        assert.ok(subject.publish
          .withArgs('visibleaudiochannelchanged', channel).calledOnce);
        assert.ok(subject.publish
          .withArgs('audiochannelchanged', channel).calledOnce);
      });

      test('In background', function() {
        this.sinon.stub(subject, '_isAudioChannelInBackground', function() {
          return true;
        });
        subject._manageAudioChannels(audioChannel);
        var channel = { channel: 'content' };
        assert.ok(subject.publish
          .withArgs('visibleaudiochannelchanged', channel).notCalled);
        assert.ok(subject.publish
          .withArgs('audiochannelchanged', channel).calledOnce);
      });
    });

    test('Reset and resume audio channels', function() {
      var isActiveStub = this.sinon.stub(audioChannel, 'isActive', function() {
        return false;
      });
      this.sinon.spy(subject, '_resetAudioChannel');
      this.sinon.spy(subject, '_resumeAudioChannels');
      subject._manageAudioChannels(audioChannel);
      assert.ok(isActiveStub.calledOnce);
      assert.ok(subject._resetAudioChannel.withArgs(audioChannel).calledOnce);
      assert.ok(subject._resumeAudioChannels.calledOnce);
    });
  });

  suite('Reset the audio channel', function() {

    setup(function() {
      this.sinon.spy(subject, '_handleAudioChannel');
    });

    test('Set audio channel as default state as muted', function() {
      var audioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: 'content' }
      );
      subject._resetAudioChannel(audioChannel);
      assert.deepEqual(audioChannel._policy, { isAllowedToPlay: false });
      assert.ok(subject._handleAudioChannel.withArgs(audioChannel).calledOnce);
    });

    test('Fade in audio channel', function() {
      var audioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: 'notification' }
      );
      this.sinon.spy(subject, '_fadeInFadedOutAudioChannels');
      subject._resetAudioChannel(audioChannel);
      assert.ok(subject._fadeInFadedOutAudioChannels.calledOnce);
    });
  });

  suite('Handle audio channel', function() {
    var audioChannel;

    setup(function() {
      audioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: 'content' }
      );
    });

    test('Play the audio channel', function() {
      audioChannel.setPolicy({
        isAllowedToPlay: true
      });
      subject._handleAudioChannel(audioChannel);
      assert.ok(subject._activeAudioChannels.has(audioChannel.instanceID));
    });

    test('Pause the audio channel', function() {
      subject._activeAudioChannels.set(audioChannel.instanceID, audioChannel);
      audioChannel.setPolicy({
        isAllowedToPlay: false
      });
      subject._handleAudioChannel(audioChannel);
      assert.ok(!subject._activeAudioChannels.has(audioChannel.instanceID));
    });

    test('Resume the audio channel when other audio channel ends', function() {
      audioChannel.setPolicy({
        isAllowedToPlay: false,
        isNeededToResumeWhenOtherEnds: true
      });
      subject._handleAudioChannel(audioChannel);
      var interruptedAudioChannels = subject._interruptedAudioChannels;
      assert.equal(interruptedAudioChannels.length, 1);
      assert.deepEqual(interruptedAudioChannels.pop(), audioChannel);
    });
  });

  test('Fade in audio channel', function() {
    var audioChannel = new MockAudioChannelController(
      { instanceID: 'appID' }, { name: 'content' }
    );
    this.sinon.stub(audioChannel, 'isFadingOut', function() {
      return true;
    });
    subject._activeAudioChannels.set(audioChannel.instanceID, audioChannel);
    subject._fadeInFadedOutAudioChannels();
    assert.deepEqual(audioChannel._policy, { isNeededToFadeOut: false });
  });

  suite('Resume audio channels', function() {
    var audioChannel;

    setup(function() {
      audioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: 'content' }
      );
      this.sinon.stub(audioChannel, 'isActive', function() {
        return true;
      });
      this.sinon.stub(audioChannel, 'isPlaying', function() {
        return true;
      });
      subject._interruptedAudioChannels.push(audioChannel);
    });

    test('Resume the audio channels belong to the foreground app', function() {
      var app = {
        audioChannels: [audioChannel]
      };
      this.sinon.spy(subject, '_manageAudioChannels');
      subject._resumeAudioChannels(app);
      assert.ok(subject._manageAudioChannels.withArgs(audioChannel).calledOnce);
      assert.equal(subject._interruptedAudioChannels.length, 0);
    });

    test('Resume the interrupted audio channel', function() {
      subject._resumeAudioChannels();
      assert.equal(subject._interruptedAudioChannels.length, 0);
    });
  });

  suite('Delete audio channel from _interruptedAudioChannels', function() {
    var audioChannel;

    setup(function() {
      audioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: 'content' }
      );
      subject._interruptedAudioChannels.push(audioChannel);
    });

    test('Delete the audio channel', function() {
      subject._deleteAudioChannelFromInterruptedAudioChannels(audioChannel);
      assert.equal(subject._interruptedAudioChannels.length, 0);
    });

    test('Do not delete the audio channel', function() {
      subject._deleteAudioChannelFromInterruptedAudioChannels(
        new MockAudioChannelController(
          { instanceID: 'appID' }, { name: 'normal' }
        ) 
      );
      subject._deleteAudioChannelFromInterruptedAudioChannels(
        new MockAudioChannelController(
          { instanceID: 'app2ID' }, { name: 'normal' }
        ) 
      );
      assert.deepEqual(subject._interruptedAudioChannels.pop(), audioChannel);
    });
  });

  suite('App is in foreground or background', function() {
    var audioChannel;

    test('Keybaord app is in foreground', function() {
      audioChannel = new MockAudioChannelController(
        { instanceID: 'app1ID', isInputMethod: true }, { name: 'normal' }
      );
      this.sinon.stub(audioChannel, 'isActive', function() {
        return true;
      });
      assert.equal(subject._isAudioChannelInBackground(audioChannel), false);
    });

    suite('Other apps except Keyboard app', function() {
      setup(function() {
        audioChannel = new MockAudioChannelController(
          { instanceID: 'app1ID' }, { name: 'content' }
        );
      });

      test('In foreground', function() {
        subject._topMostWindow = { instanceID: 'app1ID' };
        assert.equal(subject._isAudioChannelInBackground(audioChannel), false);
      });

      test('In background', function() {
        subject._topMostWindow = { instanceID: 'app2ID' };
        assert.equal(subject._isAudioChannelInBackground(audioChannel), true);
      });

      test('Top most window is not changed', function() {
        assert.equal(subject._isAudioChannelInBackground(audioChannel), true);
      });
    });
  });
});
