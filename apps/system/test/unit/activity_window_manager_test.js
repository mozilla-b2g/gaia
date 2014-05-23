'use strict';
/* global MocksHelper, ActivityWindowManager, ActivityWindow,
   AppWindow */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_activity_window.js');

var mocksForActivityWindowManager = new MocksHelper([
  'AppWindow', 'ActivityWindow'
]).init();

suite('system/ActivityWindowManager', function() {
  mocksForActivityWindowManager.attachTestHelpers();
  var subject;
  var fakeActivityConfig1 = {
    'url': 'app://fakeact1.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity 1',
    'manifestURL': 'app://fakeact1.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity 1'
    }
  };

  var fakeActivityConfig2 = {
    'url': 'app://fakeact2.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity 2',
    'manifestURL': 'app://fakeact2.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact2.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity 2'
    }
  };

  var fakeActivityConfig3 = {
    'url': 'app://fakeact3.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity 3',
    'manifestURL': 'app://fakeact3.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact3.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity 3'
    }
  };

  var activity1, activity2, activity3;
  var app1, app2;

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeAppConfig2 = {
    url: 'app://www.fake2/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake2/ManifestURL',
    origin: 'app://www.fake2'
  };

  setup(function(done) {
    requireApp('system/js/activity_window_manager.js', done);
  });

  suite('handle events', function() {
    setup(function() {
      subject = new ActivityWindowManager();
      subject.start();

      activity1 = new ActivityWindow(fakeActivityConfig1);
      activity2 = new ActivityWindow(fakeActivityConfig2);
      activity3 = new ActivityWindow(fakeActivityConfig3);
      app1 = new AppWindow(fakeAppConfig1);
      app2 = new AppWindow(fakeAppConfig2);
    });

    teardown(function() {
      subject.stop();
      subject = null;
    });

    test('maintain activity: creating and avoid duplicates', function() {
      subject._activities = [activity1, activity2, activity3];
      var stubKill = this.sinon.stub(activity1, 'kill');
      var stubIsActive = this.sinon.stub(activity1, 'isActive');
      stubIsActive.returns(false);
      subject.handleEvent({
        type: 'activitycreating',
        detail: activity1
      });

      assert.isTrue(stubKill.called);
    });

    test('maintain activity: created', function() {
      subject._activities = [activity1, activity2, activity3];
      var current = subject._activities.length;
      subject.handleEvent({
        type: 'activitycreated',
        detail: {
          instanceID: 99999
        }
      });

      assert.isTrue(subject._activities.length === current + 1);
    });

    test('maintain activity: terminated', function() {
      subject._activities = [activity1, activity2, activity3];

      subject.handleEvent({
        type: 'activityterminated',
        detail: activity1
      });

      assert.isTrue(subject._activities.length == 2);
    });
  });
});
