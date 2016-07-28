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
      }
    };

    this.profiles.default = this.profiles['720p'];

    this.result = this.formatRecorderProfiles(this.profiles, {
      exclude: ['high', 'low', 'default']
    });
  });

  test('Should have formatted title string', function() {
    var items = this.result;

    assert.equal(items[0].title, '1080p 1920x1080 16:9');
    assert.equal(items[1].title, '720p 1280x720 16:9');
    assert.equal(items[2].title, '480p 720x480 3:2');
    assert.equal(items[3].title, 'cif 352x288 11:9');
  });

  test('Should be sorted by pixel count', function() {
    var items = this.result;
    var first = items[0];
    var last = items[items.length - 1];

    assert.equal(first.key, '1080p');
    assert.equal(last.key, 'cif');
  });

  test('Should exclude given keys', function() {
    var exclude = ['default', 'low', 'high', 'other'];
    var items = this.formatRecorderProfiles(this.profiles, { exclude: exclude });
    var found = items.some(function(item) { return exclude.indexOf(item.key) > -1; });

    assert.isFalse(found);
    assert.equal(items.length, 4);
  });

  test('Should store the raw profile', function() {
    assert.equal(this.result[0].raw, this.profiles['1080p']);
  });

  test('Should store the `key`', function() {
    assert.equal(this.result[0].key, '1080p');
  });
});
