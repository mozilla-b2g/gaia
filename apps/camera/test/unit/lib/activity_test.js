
suite('activity', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require(['lib/activity'], function(Activity) {
      self.Activity = Activity;
      done();
    });
  });

  setup(function() {
    this.clock = sinon.useFakeTimers();

    // Fake window
    this.win = {
      location: {
        hash: ''
      }
    };

    // Ensure unit tests still work
    // when these APIs don't exist.
    navigator.mozHasPendingMessage =
      navigator.mozHasPendingMessage || function() {};
    navigator.mozSetMessageHandler =
      navigator.mozSetMessageHandler || function() {};

    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(navigator, 'mozSetMessageHandler');

    this.activity = new this.Activity({ win: this.win });
  });

  teardown(function() {
    this.sandbox.restore();
    this.clock.restore();
  });

  suite('Activity#check()', function() {
    test('Should call the callback (sync) if there ' +
      'is no pending activity', function() {
      var callback = this.sinon.spy();
      this.activity.check(callback);
      assert.isTrue(callback.called);
    });

    test('Should call the callback when the \'activity\' ' +
      'message event fires, when there is a pending message', function(done) {
      var callback = this.sinon.spy();
      var activityObject = {
        source: {
          name: 'pick',
          data: {
            type: ['image/*']
          }
        }
      };

      // Mimic the hash fragment of a 'pick' activity
      this.win.location.hash = '#pick';

      navigator.mozSetMessageHandler
        .withArgs('activity')
        .callsArgWithAsync(1, activityObject);

      this.activity.check(function() {
        callback();
        done();
      });

      // Should not have been called sync
      assert.isFalse(callback.called);
    });
  });

  suite('Activity#getModesForPickActivity()', function() {
    test('Should get \'picture\' and \'video\' modes ' +
      'for SMS \'pick\' activity', function() {
      var activity = {
        "source": {
          "data": {
            "type": ["image/*", "audio/*", "video/*"],
            "maxFileSizeBytes": 307200
          },
          "name": "pick"
        }
      };

      var modes = this.activity.getModesForPickActivity(activity);
      assert.isTrue(modes.indexOf('picture') !== -1);
      assert.isTrue(modes.indexOf('video') !== -1);
    });

    test('Should get \'picture\' and \'video\' modes ' +
      'input[type="file"] \'pick\' activity', function() {
      var activity = {
        "source": {
          "data": {
            "type": [],
            "nocrop": true
          },
          "name": "pick"
        }
      };

      var modes = this.activity.getModesForPickActivity(activity);
      assert.isTrue(modes.indexOf('picture') !== -1);
      assert.isTrue(modes.indexOf('video') !== -1);
    });

    test('Should get \'picture\' mode for ' +
      'input[type="file"] \'pick\' activity', function() {
      var activity = {
        "source": {
          "data": {
            "type": ["image/gif", "image/jpeg", "image/pjpeg",
                     "image/png", "image/svg+xml", "image/tiff",
                     "image/vnd.microsoft.icon"],
            "nocrop": true
          },
          "name": "pick"
        }
      };

      var modes = this.activity.getModesForPickActivity(activity);
      assert.isTrue(modes.indexOf('picture') !== -1);
      assert.isTrue(modes.indexOf('video') === -1);
    });

    test('Should be able to cope with String as well as Array', function() {
      var activity = {
        source: {
          data: { type: 'image/jpeg' },
          name: 'pick'
        }
      };

      var modes = this.activity.getModesForPickActivity(activity);
      assert.isTrue(modes.indexOf('picture') > -1);
    });
  });

  suite('Activity#getModesForRecordActivity()', function() {
    test('Should get [\'picture\', \'video\'] modes for ' +
      'Lockscreen/Gallery \'record\' activity', function() {
      var activity = {
        "source": {
          "data": {
            "type": "photos"
          },
          "name": "record"
        }
      };

      var modes = this.activity.getModesForRecordActivity(activity);
      assert.isTrue(modes.indexOf('picture') === 0);
      assert.isTrue(modes.indexOf('video') === 1);
    });

    test('Should get [\'video\', \'picture\'] modes for ' +
      'Video \'record\' activity', function() {
      var activity = {
        "source": {
          "data": {
            "type": "videos"
          },
          "name": "record"
        }
      };

      var modes = this.activity.getModesForRecordActivity(activity);
      assert.isTrue(modes.indexOf('video') === 0);
      assert.isTrue(modes.indexOf('picture') === 1);
    });
  });
});
