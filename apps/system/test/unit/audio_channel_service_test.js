/* global BaseModule */
/* global MockAudioChannelController */
'use strict';

requireApp('system/test/unit/mock_audio_channel_controller.js');
requireApp('system/js/base_module.js');
requireApp('system/js/audio_channel_service.js');

suite('system/AudioChannelService', function() {
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('AudioChannelService');
    subject.audioChannelPolicy = {
      applyPolicy: function() {}
    };
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

    test('Pause normal audio channel when it is in background', function() {
      this.sinon.spy(subject, '_handleAudioChannel');
      subject._topMostWindow = app;
      window.dispatchEvent(event);
      assert.deepEqual(
        subject._topMostWindow.audioChannels.get('normal')._policy,
        { isAllowedToPlay: false }
      );
    });

    test('Resume all active audio channels in the app', function() {
      this.sinon.spy(subject, '_resumeAudioChannels');
      window.dispatchEvent(event);
      assert.ok(subject._resumeAudioChannels.withArgs(app).calledOnce);
    });
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
      this.sinon.spy(subject, '_isAudioChannelInBackground');
      this.sinon.spy(subject, '_handleAudioChannel');
      subject._manageAudioChannels(audioChannel);
      assert.ok(isActiveStub.calledOnce);
      assert.ok(subject.audioChannelPolicy.applyPolicy.calledOnce);
      assert.ok(subject._isAudioChannelInBackground
        .withArgs(audioChannel).calledOnce);
      assert.ok(subject._handleAudioChannel
        .withArgs(audioChannel).calledOnce);  
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
