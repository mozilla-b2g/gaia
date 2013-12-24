/*jshint maxlen:false*/
'use strict';

suite('activity', function() {
  var Activity;

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    req(['activity'], function(_activity) {
      Activity = _activity;
      done();
    });
  });

  setup(function() {
    this.activity = new Activity();
  });

  test('Should call the callback synchronously ' +
       'if there is no pending activity', function() {
    var hasPendingMessage = this.sinon.stub(navigator, 'mozHasPendingMessage');
    var callback = this.sinon.spy();

    // Instruct the stub to return false
    // when called with 'activity' argument.
    hasPendingMessage.withArgs('activity').returns(false);

    this.activity.check(callback);
    assert.ok(callback.called);

    // Remove the stub
    hasPendingMessage.restore();
  });

  test('Should call the callback when the \'activity\' ' +
       'message event fires, when there is a pending message', function(done) {
    var hasPendingMessage = this.sinon.stub(navigator, 'mozHasPendingMessage');
    var setMessageHandler = this.sinon.stub(navigator, 'mozSetMessageHandler');
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
    hasPendingMessage.withArgs('activity').returns(true);
    setMessageHandler.withArgs('activity').callsArgWithAsync(1, activityObject);

    this.activity.check(function() {
      callback();
      done();

      // Remove all stubs
      hasPendingMessage.restore();
      setMessageHandler.restore();
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

    assert.equal(output.mode, 'camera');
  });

  test('Should return \'camera\' mode if just image type allowed', function() {
    var output = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: ['image/*']
        }
      }
    });

    assert.equal(output.mode, 'camera');
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
