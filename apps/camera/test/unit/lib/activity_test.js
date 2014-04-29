
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


});
