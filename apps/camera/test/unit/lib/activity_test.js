
suite('activity', function() {
  'use strict';

  var require = window.req;
  var Activity;

  suiteSetup(function(done) {
    require(['lib/activity'], function(_activity) {
      Activity = _activity;
      done();
    });
  });

  setup(function() {

    this.clock = sinon.useFakeTimers();

    // Ensure unit tests still work
    // when these APIs don't exist.
    navigator.mozHasPendingMessage =
      navigator.mozHasPendingMessage || function() {};
    navigator.mozSetMessageHandler =
      navigator.mozSetMessageHandler || function() {};

    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(navigator, 'mozHasPendingMessage');
    this.sandbox.stub(navigator, 'mozSetMessageHandler');

    this.activity = new Activity();
  });

  teardown(function() {
    this.sandbox.restore();
    this.clock.restore();
  });

  test('Should call the callback (async) if there ' +
    'is no pending activity', function() {
    var callback = this.sinon.spy();

    // Instruct the stub to return false
    // when called with 'activity' argument.
    navigator.mozHasPendingMessage.withArgs('activity').returns(false);

    this.activity.check(callback);
    assert.ok(!callback.called);
    this.clock.tick(1);
    assert.ok(callback.called);
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

    // Instruct the stub to report a pending message,
    // then fire the 'activity' event async, calling
    // the callback function it was given.
    navigator.mozHasPendingMessage
      .withArgs('activity')
      .returns(true);

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
