
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

  test('Should call the callback (async) if there ' +
    'is no pending activity', function(done) {
    var callback = this.sinon.spy();

    // Instruct the stub to return false
    // when called with 'activity' argument.
    navigator.mozHasPendingMessage.withArgs('activity').returns(false);

    this.activity.check(function() {
      callback();
      done();
    });

    assert.ok(!callback.called);
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

  test('Should return correct modes from parsed mime types', function() {
    var parsed;

    // 'video' and 'picture'
    parsed = this.activity.parse({
      source: {
        name: 'pick',
        data: { type: ['image/*', 'video/*'] }
      }
    });

    assert.ok(~parsed.modes.indexOf('picture'));
    assert.ok(~parsed.modes.indexOf('video'));

    // 'video'
    parsed = this.activity.parse({
      source: {
        name: 'pick',
        data: { type: ['video/*'] }
      }
    });

    assert.ok(!~parsed.modes.indexOf('picture'));
    assert.ok(~parsed.modes.indexOf('video'));

    // 'picture'
    parsed = this.activity.parse({
      source: {
        name: 'pick',
        data: { type: ['image/*'] }
      }
    });

    assert.ok(~parsed.modes.indexOf('picture'));
    assert.ok(!~parsed.modes.indexOf('video'));
  });

  test('Should allow both image and video if no types given', function() {
    var parsed = this.activity.parse({
      source: {
        name: 'pick',
        data: {}
      }
    });

    assert.ok(~parsed.modes.indexOf('picture'));
    assert.ok(~parsed.modes.indexOf('video'));
  });

  test('Should accept a given type string of videos (unsure why)', function() {
    var parsed = this.activity.parse({
      source: {
        name: 'pick',
        data: {
          type: 'videos'
        }
      }
    });

    assert.ok(!~parsed.modes.indexOf('picture'));
    assert.ok(~parsed.modes.indexOf('video'));
  });
});
