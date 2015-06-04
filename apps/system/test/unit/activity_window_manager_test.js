'use strict';
/* global MocksHelper, ActivityWindowManager, ActivityWindow,
   AppWindow, MockService */

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/test/unit/mock_popup_window.js');

var mocksForActivityWindowManager = new MocksHelper([
  'AppWindow', 'ActivityWindow', 'PopupWindow', 'Service'
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
  var popup1, popup2;
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

  var fakePopupConfig1 = {
    url: 'app://www.fake/popup.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakePopupConfig2 = {
    url: 'app://www.fake2/popup.html',
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
      popup1 = new ActivityWindow(fakePopupConfig1);
      popup2 = new ActivityWindow(fakePopupConfig2);
    });

    teardown(function() {
      subject.stop();
      subject = null;
      MockService.mockQueryWith('getTopMostWindow', null);
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

    test('maintain activity pool: push inline activity into chaining',
      function() {
        subject.activityPool = new Map([
          [activity1.instanceID, true],
          [activity2.instanceID, true],
          [app1.instanceID, true]
        ]);

        activity3.bottomWindow = activity2;

        subject.handleEvent({
          type: 'activityopened',
          detail: activity3
        });

        assert.isTrue(subject.activityPool.has(activity3.instanceID));
      });

    test('maintain activity pool: push inner sheet into chaining', function() {
      subject.activityPool = new Map([
        [activity1.instanceID, true],
        [activity2.instanceID, true],
        [app1.instanceID, true]
      ]);

      app2.previousWindow = app1;

      subject.handleEvent({
        type: 'appopened',
        detail: app2
      });

      assert.isTrue(subject.activityPool.has(app2.instanceID));
    });

    test('maintain activity pool: push popup into chaining', function() {
      subject.activityPool = new Map([
        [activity1.instanceID, true],
        [activity2.instanceID, true],
        [app1.instanceID, true]
      ]);

      popup1.bottomWindow = app1;

      subject.handleEvent({
        type: 'popupopened',
        detail: popup1
      });

      assert.isTrue(subject.activityPool.has(popup1.instanceID));
    });

    test('maintain activity pool: push window activity into chaining',
      function() {
        subject.activityPool = new Map([
          [activity1.instanceID, true],
          [activity2.instanceID, true],
          [app1.instanceID, true]
        ]);

        app2.callerWindow = app1;

        subject.handleEvent({
          type: 'appopened',
          detail: app2
        });

        assert.isTrue(subject.activityPool.has(app2.instanceID));
      });

    test('maintain activity pool: requesting out of chaining', function() {
      subject.activityPool = new Map([
        [activity1.instanceID, true],
        [activity2.instanceID, true],
        [app1.instanceID, true]
      ]);

      MockService.mockQueryWith('getTopMostWindow', app2);

      subject.handleEvent({
        type: 'activityrequesting'
      });

      assert.isTrue(subject.activityPool.size == 1);
      assert.isTrue(subject.activityPool.has(app2.instanceID));
    });

    test('maintain activity pool: requesting in chaining', function() {
      subject.activityPool = new Map([
        [activity1.instanceID, true],
        [activity2.instanceID, true],
        [app2.instanceID, true],
        [app1.instanceID, true]
      ]);

      MockService.mockQueryWith('getTopMostWindow', app2);

      subject.handleEvent({
        type: 'activityrequesting'
      });

      assert.isTrue(subject.activityPool.size == 4);
      assert.isTrue(subject.activityPool.has(app1.instanceID));
      assert.isTrue(subject.activityPool.has(app2.instanceID));
      assert.isTrue(subject.activityPool.has(activity1.instanceID));
      assert.isTrue(subject.activityPool.has(activity2.instanceID));
    });

    test('maintain activity pool: terminated', function() {
      subject.activityPool = new Map([
        [activity1.instanceID, true],
        [activity2.instanceID, true],
        [activity3.instanceID, true]
      ]);

      subject.handleEvent({
        type: 'activityterminated',
        detail: activity1
      });

      assert.isTrue(subject.activityPool.size == 2);
      assert.isFalse(subject.activityPool.has(activity1.instanceID));
    });
  });
});
