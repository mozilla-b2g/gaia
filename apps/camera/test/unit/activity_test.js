'use strict';

suite('activity', function() {
  var Activity;

  suiteSetup(function(done) {
    req(['activity'], function(_activity) {
      Activity = _activity;
      done();
    });
  });

  setup(function() {

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
  });

  test('Should call the callback synchronously if there ' +
    'is no pending activity', function() {
    var callback = this.sinon.spy();

    // Instruct the stub to return false
    // when called with 'activity' argument.
    navigator.mozHasPendingMessage.withArgs('activity').returns(false);

    this.activity.check(callback);
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

  test('Should return correct allowed type when ' +
       'just images are accepted', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: ['image/*']
        }
      }
    });

    assert.isTrue(output.types.image);
    assert.isUndefined(output.types.video);
  });

  test('Should return correct allowed types when ' +
       'image and video are accepted', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: ['image/*', 'video/*']
        }
      }
    });

    assert.isTrue(output.types.image);
    assert.isTrue(output.types.video);
  });

  test('Should allow both image and video if no types given', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {}
      }
    });

    assert.isTrue(output.types.image);
    assert.isTrue(output.types.video);
  });

  test('Should accept a given type string of videos(unsure why)', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: 'videos'
        }
      }
    });

    assert.isUndefined(output.types.image);
    assert.isTrue(output.types.video);
  });

  test('Should return \'camera\' mode if both types allowed', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: ['image/*', 'video/*']
        }
      }
    });

    assert.equal(output.mode, 'photo');
  });

  test('Should return \'photo\' mode if just image type allowed', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: ['image/*']
        }
      }
    });

    assert.equal(output.mode, 'photo');
  });

  test('Should return \'video\' mode if just video type allowed', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: ['video/*']
        }
      }
    });

    assert.equal(output.mode, 'video');
  });
});
