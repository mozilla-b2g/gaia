/* global BaseModule */
/* global MockAudioChannelController */
'use strict';

requireApp('system/test/unit/mock_audio_channel_controller.js');
requireApp('system/js/base_module.js');
requireApp('system/js/audio_channel_policy.js');

suite('system/AudioChannelPolicy', function() {
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('AudioChannelPolicy');
  });

  test('Initialize the module', function() {
    assert.ok(subject._isVibrateEnabled);
  });

  suite('Policies for handling audio channels', function() {
    /**
     * Check the policies.
     *
     * @param {Array|Object} audioChannels
     * The audio channels for generating policies.
     * @param {Object} expectedPolicy
     * The policy for the audio channels.
     * @param {Boolean} [isSameApp]
     * If true, the audio channels belong to same app.
     * Otherwise each audio channel belong to different app.
     */
    function checkPolicy(audioChannels, expectedPolicy, isSameApp) {
      var appID = 0;
      audioChannels = Array.isArray(audioChannels) ?
        audioChannels : [audioChannels];
      expectedPolicy.activeAudioChannels =
        Array.isArray(expectedPolicy.activeAudioChannels) ?
        expectedPolicy.activeAudioChannels :
        [expectedPolicy.activeAudioChannels];
      audioChannels.map(function(obj) {
        var activeAudioChannels = new Map();
        obj.activeAudioChannels = Array.isArray(obj.activeAudioChannels) ?
          obj.activeAudioChannels : [obj.activeAudioChannels];
        var newAudioChannel =
          new MockAudioChannelController(
            { instanceID: appID }, { name: obj.newAudioChannel }
          );
        // Array to map.
        obj.activeAudioChannels.forEach(function(audioChannel, i) {
          if (!isSameApp) {
            appID++;
          }
          activeAudioChannels.set(i, 
            new MockAudioChannelController(
              { instanceID: appID }, { name: audioChannel }
            )
          );
        });
        return {
          newAudioChannel: newAudioChannel,
          activeAudioChannels: activeAudioChannels
        };
      }).forEach(function(obj) {
        var newAudioChannel = obj.newAudioChannel;
        var activeAudioChannels = obj.activeAudioChannels;
        subject.applyPolicy(newAudioChannel, activeAudioChannels);
        assert.deepEqual(newAudioChannel._policy,
          expectedPolicy.newAudioChannel);
        activeAudioChannels.forEach(function(audioChannel, i) {
          assert.deepEqual(
            audioChannel._policy,
            expectedPolicy.activeAudioChannels[i]
          );
        });
      });
    }
    
    test('Play active and new audio channels', function() {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'normal', activeAudioChannels: 'system' },
          { newAudioChannel: 'normal', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'normal', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'content', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'content', activeAudioChannels: 'system' },
          { newAudioChannel: 'content', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'content', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'system' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'notification' },
          { newAudioChannel: 'alarm',
            activeAudioChannels: 'publicNotification' },
          { newAudioChannel: 'system', activeAudioChannels: 'normal' },
          { newAudioChannel: 'system', activeAudioChannels: 'content' },
          { newAudioChannel: 'system', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'system', activeAudioChannels: 'system' },
          { newAudioChannel: 'system', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'system', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'system', activeAudioChannels: 'notification' },
          { newAudioChannel: 'system',
            activeAudioChannels: 'publicNotification' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'system' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'notification' },
          { newAudioChannel: 'ringer',
            activeAudioChannels: 'publicNotification' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'system' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'notification' },
          { newAudioChannel: 'telephony',
            activeAudioChannels: 'publicNotification' },
          { newAudioChannel: 'notification', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'notification', activeAudioChannels: 'system' },
          { newAudioChannel: 'notification', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'notification',
            activeAudioChannels: 'notification' },
          { newAudioChannel: 'notification',
            activeAudioChannels: 'publicNotification' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'alarm' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'system' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'ringer' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'telephony' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'notification' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'publicNotification' },
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          },
          activeAudioChannels: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          }
        }
      );
    });

    test('Pause active audio channel and ' +
         'play new audio channel', function() {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'normal' },
          { newAudioChannel: 'normal', activeAudioChannels: 'content' },
          { newAudioChannel: 'content', activeAudioChannels: 'normal' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'normal' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'normal' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'normal' },
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          },
          activeAudioChannels: {
            isAllowedToPlay: false,
            isNeededToVibrate: false,
            isNeededToResumeWhenOtherEnds: false,
          }
        }
      );
    });

    test('Pause active audio channel, ' +
         'play new audio channel, ' +
         'and resume the pause audio channel when other ends', function() {
      checkPolicy(
        [
          { newAudioChannel: 'content', activeAudioChannels: 'content' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'content' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'content' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'content' }
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          },
          activeAudioChannels: {
            isAllowedToPlay: false,
            isNeededToVibrate: false,
            isNeededToResumeWhenOtherEnds: true,
          }
        }
      );
    });

    test('Fade out active audio channel', function() {
      checkPolicy(
        [
          { newAudioChannel: 'ringer', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'notification', activeAudioChannels: 'normal' },
          { newAudioChannel: 'notification', activeAudioChannels: 'content' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'normal' },
          { newAudioChannel: 'publicNotification',
            activeAudioChannels: 'content' },  
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          },
          activeAudioChannels: {
            isAllowedToPlay: true,
            isNeededToFadeOut: true,
          }
        }
      );
    });

    test('Fade out new audio channel', function() {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'notification' },
          { newAudioChannel: 'normal',
            activeAudioChannels: 'publicNotification' },
          { newAudioChannel: 'content', activeAudioChannels: 'notification' },
          { newAudioChannel: 'content',
            activeAudioChannels: 'publicNotification' }
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: true,
          },
          activeAudioChannels: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          }
        }
      );
    });

    test('Vibrate for active audio channel', function(){
      checkPolicy(
        { newAudioChannel: 'ringer', activeAudioChannels: 'ringer' },
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          },
          activeAudioChannels: {
            isAllowedToPlay: false,
            isNeededToVibrate: true,
            isNeededToResumeWhenOtherEnds: false
          }
        }
      );
    });

    test('Vibrate for new audio channel', function(){
      checkPolicy(
        [
          { newAudioChannel: 'ringer', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'notification', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'telephony' },
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: false,
            isNeededToVibrate: true
          },
          activeAudioChannels: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          }
        }
      );
    });

    test('Deconflict conflicted policy', function() {
      checkPolicy(
        [
          { newAudioChannel: 'alarm', activeAudioChannels:
            ['system', 'telephony', 'publicNotification'] },
          { newAudioChannel: 'ringer', activeAudioChannels:
            ['system', 'telephony', 'publicNotification'] },
          { newAudioChannel: 'notification', activeAudioChannels:
            ['system', 'telephony', 'publicNotification'] },
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: false,
            isNeededToVibrate: true
          },
          activeAudioChannels: [
            {
              isAllowedToPlay: true,
              isNeededToFadeOut: false,
            },
            {
              isAllowedToPlay: true,
              isNeededToFadeOut: false,
            },
            {
              isAllowedToPlay: true,
              isNeededToFadeOut: false,
            }
          ]
        }
      );
    });

    test('All audio channels belong to same app', function() {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'content' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'content' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'notification', activeAudioChannels: 'telephony' },
        ],
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          },
          // Do nothing for active audio channels.
          activeAudioChannels: {}
        },
        // All audio channels belong to same app.
        true
      );

      checkPolicy(
        {
          newAudioChannel: 'normal',
          activeAudioChannels: [
            'content', 'alarm', 'system', 'ringer', 'telephony',
            'notification', 'publicNotification'
          ]
        },
        {
          newAudioChannel: {
            isAllowedToPlay: true,
            isNeededToFadeOut: false,
          },
          activeAudioChannels: [{}, {}, {}, {}, {}, {}, {}]
        },
        true
      );
    });

    test('Normal audio channel cannot play in background', function() {
      var newAudioChannel = new MockAudioChannelController(
        { instanceID: 'appID' }, { name: 'normal' }
      );
      var activeAudioChannels = new Map();
      subject.applyPolicy(newAudioChannel, activeAudioChannels,
        { isNewAudioChannelInBackground: true });
      assert.deepEqual(
        newAudioChannel._policy,
        {
          isAllowedToPlay: false,
          isNeededToVibrate: false
        }
      );
    });

    test('All audio channel except normal audio channel ' +
         'can play in background', function() {
      ['content', 'alarm', 'system', 'ringer', 'telephony',
       'notification', 'publicNotification'].forEach(function(name) {
        var newAudioChannel = new MockAudioChannelController(
          { instanceID: 'appID' }, { name: name }
        );
        var activeAudioChannels = new Map();
        subject.applyPolicy(newAudioChannel, activeAudioChannels,
          { isNewAudioChannelInBackground: true });
        assert.deepEqual(
          newAudioChannel._policy,
          {
            isAllowedToPlay: true,
            isNeededToFadeOut: false
          }
        );
      });
    });
  });

  suite('Observe vibration.enabled', function() {
    test('Observed', function() {
      var index = subject.constructor.SETTINGS.indexOf('vibration.enabled');
      assert.ok(index !== -1);
    });

    test('Enabled', function() {
      subject['_observe_vibration.enabled'](true);
      assert.equal(subject._isVibrateEnabled, true);
    });

    test('Disabled', function() {
      subject['_observe_vibration.enabled'](false);
      assert.equal(subject._isVibrateEnabled, false);
    });
  });

  test('Fade out new audio channel', function() {
    var isNeeded = [
      { activeChannelName: 'notification', newChannelName: 'normal' },
      { activeChannelName: 'notification', newChannelName: 'content' },
      { activeChannelName: 'publicNotification', newChannelName: 'normal' },
      { activeChannelName: 'publicNotification', newChannelName: 'content' }
    ].map(function(obj) {
      return subject._isNeededToFadeOutForNewAudioChannel(
        obj.activeChannelName, obj.newChannelName
      );
    }).every(elem => elem);
    assert.equal(isNeeded, true);
  });

  test('Fade out active audio channel', function() {
    var isNeeded = [
      { activeChannelName: 'alarm', newChannelName: 'ringer' },
      { activeChannelName: 'alarm', newChannelName: 'telephony' },
      { activeChannelName: 'normal', newChannelName: 'notification' },
      { activeChannelName: 'normal', newChannelName: 'publicNotification' },
      { activeChannelName: 'content', newChannelName: 'notification' },
      { activeChannelName: 'content', newChannelName: 'publicNotification' }
    ].map(function(obj) {
      return subject._isNeededToFadeOutForActiveAudioChannel(
        obj.activeChannelName, obj.newChannelName
      );
    }).every(elem => elem);
    assert.equal(isNeeded, true);
  });

  test('Vibrate for active audio channel', function() {
    var isNeeded = [
      { activeChannelName: 'ringer', newChannelName: 'ringer' }
    ].map(function(obj) {
      return subject._isNeededToVibrateForActiveAudioChannel(
        obj.activeChannelName, obj.newChannelName
      );
    }).every(elem => elem);
    assert.equal(isNeeded, true);
  });

  test('Resume active audio channel when other ends', function() {
    var isNeeded = [
      { activeChannelName: 'content', newChannelName: 'content' },
      { activeChannelName: 'content', newChannelName: 'alarm' },
      { activeChannelName: 'content', newChannelName: 'ringer' },
      { activeChannelName: 'content', newChannelName: 'telephony' }
    ].map(function(obj) {
      return subject._isNeededToResumeWhenOtherEndsForActiveAudioChannel(
        obj.activeChannelName, obj.newChannelName
      );
    }).every(elem => elem);
    assert.equal(isNeeded, true);
  });
});
