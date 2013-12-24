suite('Sounds', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  /**
   * Locals
   */

  var Sounds;
  var list = [
    {
      name: 'camera',
      setting: 'camera.shutter.enabled',
      url: 'resources/sounds/shutter.ogg'
    },
    {
      name: 'recordingStart',
      url: 'resources/sounds/camcorder_start.opus',
      setting: 'camera.recordingsound.enabled'
    },
    {
      name: 'recordingEnd',
      url: 'resources/sounds/camcorder_end.opus',
      setting: 'camera.recordingsound.enabled'
    }
  ];

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    req(['sounds'], function(sounds) {
      Sounds = sounds;
      done();
    });
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();
    this.sounds = new Sounds();

    // A sound to pass to APIs
    this.mockSound = {
      name: 'camera',
      setting: 'camera.shutter.enabled',
      url: 'resources/sounds/shutter.ogg'
    };

    // Keep reference of
    // things we want to restore
    this.backup = {
      mozSettings: navigator.mozSettings
    };
  });

  teardown(function() {
    navigator.mozSettings = this.backup.mozSettings;
    this.sandbox.restore();
  });

  suite('Sounds()', function() {
    test('Should have an empty items object', function() {
      var items = this.sounds.items;
      assert.ok(this.sounds.hasOwnProperty('items'));
      assert.ok(typeof items === 'object');
      assert.ok(Object.keys(items).length === 0);
    });
  });

  suite('Sounds#add()', function() {
    setup(function() {

      // Stub `isEnabled` and call the callback with `true`
      this.sandbox.stub(this.sounds, 'isEnabled');
      this.sounds.isEnabled.callsArgWith(1, true);

      // Simple stubs
      this.sandbox.stub(this.sounds, 'setEnabled');
      this.sandbox.stub(this.sounds, 'observeSetting');
    });

    test('Should add each of the sounds to the this.items hash', function() {
      this.sounds.add(list[0]);
      this.sounds.add(list[1]);
      this.sounds.add(list[2]);
      assert.ok(this.sounds.items.camera);
      assert.ok(this.sounds.items.recordingStart);
      assert.ok(this.sounds.items.recordingEnd);
    });

    test('Should call `isEnabled`', function() {
      this.sounds.add(list[0]);
      assert.ok(this.sounds.isEnabled.called);
    });

    test('Should call `setEnabled` with the result of `isEnabled`', function() {
      var setEnabled = this.sounds.setEnabled;
      this.sounds.add(list[0]);
      assert.ok(setEnabled.calledWith(this.sounds.items.camera, true));
    });
  });

  suite('Sounds#isEnabled()', function() {
    setup(function() {

      // Mock object that mimicks
      // mozSettings get API. Inside
      // tests set this.mozSettingsGetResult
      // define the result of the mock call.
      navigator.mozSettings = {
        createLock: function() { return this; },
        get: function(key) {
          var mozSettings = this;
          setTimeout(function() {
            var result = {};
            result[key] = 'the-result';
            mozSettings.onsuccess({
              target: {
                result: result
              }
            });
          }, 1);
          return this;
        }
      };
    });

    test('Should not error if navigator.mozSettings is undefined', function() {
      navigator.mozSettings = undefined;
      this.sounds.isEnabled(this.mockSound);
    });

    test('Should return the result from mozSettings API', function(done) {
      this.sounds.isEnabled(this.mockSound, function(result) {
        assert.ok(result === 'the-result');
        done();
      });
    });
  });

  suite('Sounds#observeSetting()', function() {
    setup(function() {
      this.sandbox.stub(this.sounds, 'setEnabled');
      navigator.mozSettings = {
        addObserver: function(key, callback) {
          this.callback = callback;
        }
      };
    });

    test('Should not error if navigator.mozSettings is undefined', function() {
      navigator.mozSettings = undefined;
      this.sounds.observeSetting(this.mockSound);
    });

    test('Should call setEnabled with the value passed' +
         'to the observe callback', function() {
      this.sounds.observeSetting(this.mockSound);

      // Manually call the callback
      // checking that `setEnabled` was
      // called with the expected arguments
      navigator.mozSettings.callback({ settingValue: true });
      assert.ok(this.sounds.setEnabled.calledWith(this.mockSound, true));
    });
  });

  suite('Sounds#createAudio()', function() {
    test('Should return an Audio object with the given src', function() {
      var url = this.mockSound.url;
      var audio = this.sounds.createAudio(url);
      assert.ok(audio instanceof window.HTMLAudioElement);
      assert.ok(~audio.src.indexOf(url));
    });

    test('Should set the mozAudioChannel type', function() {
      var audio = this.sounds.createAudio(this.mockSound.url);
      assert.ok(audio.mozAudioChannelType === 'notification');
    });
  });

  suite('Sounds#playSound()', function() {
    setup(function() {
      this.mockSound.audio = { play: sinon.spy() };
    });

    test('Should *not* play the sound if it\'s not enabled', function() {
      this.sounds.playSound(this.mockSound);
      assert.ok(this.mockSound.audio.play.notCalled);
    });

    test('Should play the sound if it\'s enabled', function() {
      this.mockSound.enabled = true;
      this.sounds.playSound(this.mockSound);
      assert.ok(this.mockSound.audio.play.called);
    });

    test('Should throw exception if sound is undefined', function() {
      try {
        this.sounds.playSound();
      } catch (e) {
        assert.ok('correctly threw exception');
        return;
      }

      assert.ok(false);
    });
  });
});
