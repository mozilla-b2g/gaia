suite('lib/format-recorder-profiles', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['lib/format-recorder-profiles'], function(formatRecorderProfiles) {
      self.formatRecorderProfiles = formatRecorderProfiles;
      done();
    });
  });

  setup(function() {
    this.profiles = {
      'low': {
        format: '3gp',
        video: {
          codec: 'mpeg4sp',
          bitrate: 128000,
          framerate: 15,
          width: 320,
          height: 240
        },
        audio: {
          codec: 'amrnb',
          bitrate: 12200,
          samplerate: 8000,
          channels: 1
        }
      },
      'high': {
        format: 'mp4',
        video: {
          codec: 'h264',
          bitrate: 12000000,
          framerate: 30,
          width: 1920,
          height: 1080
        },
        audio: {
          codec: 'aac',
          bitrate: 96000,
          samplerate: 48000,
          channels: 1
        }
      },
      'cif': {
        format: 'mp4',
        video: {
          codec: 'h264',
          bitrate: 1200000,
          framerate: 30,
          width: 352,
          height: 288
        },
        audio: {
          codec: 'aac',
          bitrate: 96000,
          samplerate: 48000,
          channels: 1
        },
        key: 'cif'
      },
      '480p': {
        format: 'mp4',
        video: {
          codec: 'h264',
          bitrate: 5000000,
          framerate: 30,
          width: 720,
          height: 480
        },
        audio: {
          codec: 'aac',
          bitrate: 96000,
          samplerate: 48000,
          channels: 1
        }
      },
      '720p': {
        format: 'mp4',
        video: {
          codec: 'h264',
          bitrate: 8000000,
          framerate: 30,
          width: 1280,
          height: 720
        },
        audio: {
          codec: 'aac',
          bitrate: 96000,
          samplerate: 48000,
          channels: 1
        }
      },
      '1080p': {
        format: 'mp4',
        video: {
          codec: 'h264',
          bitrate: 12000000,
          framerate: 30,
          width: 1920,
          height: 1080
        },
        audio: {
          codec: 'aac',
          bitrate: 96000,
          samplerate: 48000,
          channels: 1
        }
      },
      'default': {
        format: 'mp4',
        video: {
          codec: 'h264',
          bitrate: 8000000,
          framerate: 30,
          width: 1280,
          height: 720
        },
        audio: {
          codec: 'aac',
          bitrate: 96000,
          samplerate: 48000,
          channels: 1
        }
      }
    };

    this.options = this.formatRecorderProfiles(this.profiles);
  });

  test('Should have formatted title string', function() {
    assert.equal(this.options[0].title, 'default 1280x720');
    assert.equal(this.options[1].title, 'high 1920x1080');
    assert.equal(this.options[2].title, '1080p 1920x1080');
    assert.equal(this.options[3].title, '720p 1280x720');
  });

  test('Should start with the default profile if present', function() {
    assert.equal(this.options[0].key, 'default');
  });

  test('Should be sorted by pixel count', function() {
    var first = this.options[1];
    var last = this.options[this.options.length - 1];

    assert.equal(last.key, 'low');
    assert.equal(first.key, 'high');
  });

  test('Should exclude given keys', function() {
    var exclude = ['default', 'low', 'high', 'other'];
    var options = this.formatRecorderProfiles(this.profiles, { exclude: exclude });
    var found = options.some(function(item) { return exclude.indexOf(item.key) > -1; });

    assert.isFalse(found);
    assert.equal(options.length, 4);
  });

  test('Should store the raw profile', function() {
    assert.equal(this.options[1].raw, this.profiles.high);
  });

  test('Should store the `key`', function() {
    assert.equal(this.options[1].key, 'high');
  });
});
