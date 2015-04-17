'use strict';
/* global MocksHelper, MockApplications, MockL10n, MockDefaultActivityHelper,
          ActionMenu, Activities, DefaultActivityHelper, MockService
*/

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_default_activity_helper.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/js/manifest_helper.js');
requireApp('system/js/action_menu.js');
requireApp('system/js/activities.js');

var mocksForActivities = new MocksHelper([
  'Applications'
]).init();

suite('system/Activities', function() {
  var realL10n;
  var realDefaultActivityHelper;
  var subject;
  var realApplications;
  var realService;

  var fakeLaunchConfig1 = {
    'isActivity': false,
    'url': 'app://fakeapp1.gaiamobile.org/pick.html',
    'name': 'Fake App 1',
    'manifestURL': 'app://fakeapp1.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeapp1.gaiamobile.org',
    'manifest': {
      'name': 'Fake App 1'
    },
    target: {}
  };

  mocksForActivities.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realApplications = window.applications;
    realDefaultActivityHelper = window.DefaultActivityHelper;
    realService = window.Service;
    window.Service = MockService;
    window.applications = MockApplications;
    window.DefaultActivityHelper = MockDefaultActivityHelper;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    window.applications = realApplications;
    window.Service = realService;
    window.DefaultActivityHelper = realDefaultActivityHelper;
    realApplications = null;
  });

  setup(function() {
    this.sinon.useFakeTimers();
  });

  suite('constructor', function() {
    test('adds event listeners', function() {
      this.sinon.stub(window, 'addEventListener');
      subject = new Activities();
      assert.ok(window.addEventListener.withArgs('mozChromeEvent').calledOnce);
      assert.ok(window.addEventListener.withArgs('appopened').calledOnce);
      assert.ok(window.addEventListener
        .withArgs('applicationinstall').calledOnce);
    });
  });

  suite('handleEvent', function() {
    test('calls chooseActivity', function() {
      var stub = this.sinon.stub(subject, 'chooseActivity');
      var detail = {
        type: 'activity-choice'
      };
      subject.handleEvent({
        type: 'mozChromeEvent',
        detail: detail
      });
      assert.ok(stub.calledWith(detail));
    });

    test('hides actionMenu on appopended if it exists', function() {
      this.sinon.stub(ActionMenu.prototype, 'hide');
      subject.actionMenu = new ActionMenu();
      subject.handleEvent({type: 'appopened'});
      assert.ok(ActionMenu.prototype.hide.calledOnce);
    });
  });

  suite('activity (multi)selection', function() {
    setup(function() {
      this.sinon.stub(DefaultActivityHelper, 'getDefaultAction')
        .returns({ // instead of Promise.resolve() to return in same cycle
          then: function(cb) { cb(null); }
        });
    });

    test('choice when only one item', function() {
      var stub = this.sinon.stub(subject, 'choose', function(obj) {
        console.log('called with ' + obj);
      });
      subject.chooseActivity({
        id: 'single',
        choices: ['first']
      });
      assert.ok(stub.calledWith('0'));
    });

    test('opens action menu with multiple choice', function() {
      this.sinon.stub(ActionMenu.prototype, 'start');
      this.sinon.stub(window, 'dispatchEvent');
      subject.chooseActivity({
        id: 'single',
        choices: ['first', 'second']
      });
      this.sinon.clock.tick();
      assert.equal(window.dispatchEvent.getCall(0).args[0].type,
        'activityrequesting');
      assert.equal(window.dispatchEvent.getCall(1).args[0].type,
        'activitymenuwillopen');
    });

    test('only opens once if we get two activity-choice events', function() {
      subject.actionMenu = null;
      this.sinon.stub(ActionMenu.prototype, 'start');
      var evt = {
        type: 'mozChromeEvent',
        detail: {
          type: 'activity-choice',
          choices: ['first', 'second']
        }
      };
      subject.handleEvent(evt);
      this.sinon.clock.tick();
      subject.handleEvent(evt);
      this.sinon.clock.tick();
      assert.ok(ActionMenu.prototype.start.calledOnce);
    });

    test('does not allow a choice that would subvert forward lock', function() {
      var stub = this.sinon.stub(subject, 'choose');
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      subject.chooseActivity({
        id: 'single',
        name: 'view',
        choices: [{
          manifest: 'app://fl.example.com/manifest.webapp'
        },{
          manifest: 'app://fl.gaiamobile.org/manifest.webapp'
        }]
      });

      // If it is a view activity and one of the choices is the FL app, we
      // must always choose the FL app.
      assert.ok(stub.calledWith('1'));
      // Ensure that we're not dispatching an activitymenuwillopen event
      this.sinon.clock.tick();
      assert.ok(dispatchStub.calledOnce);
      assert.notEqual(dispatchStub.firstCall.args[0].type,
                      'activitymenuwillopen');
    });

    test('does not allow another choice that would subvert forward lock',
      function() {
        var stub = this.sinon.stub(subject, 'choose');
        var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
        subject.chooseActivity({
          id: 'single',
          name: 'view',
          choices: [{
            manifest: 'app://fl.example.com/e//fl.gaiamobile.org/' +
              'manifest.webapp'
          },{
            manifest: 'app://fl.gaiamobile.org/manifest.webapp'
          }]
      });

      // If it is a view activity and one of the choices is the FL app, we
      // must always choose the FL app.
      assert.ok(stub.calledWith('1'));
      // Ensure that we're not dispatching an activitymenuwillopen event
      this.sinon.clock.tick();
      assert.ok(dispatchStub.calledOnce);
      assert.notEqual(dispatchStub.firstCall.args[0].type,
                      'activitymenuwillopen');
    });

    test('allows choice for non-forward lock view activities', function() {
      var stub = this.sinon.stub(window, 'dispatchEvent');
      subject.chooseActivity({
        id: 'single',
        name: 'view',
        choices: [{
          manifest: 'app://gallery.gaiamobile.org/manifest.webapp'
        },{
          manifest: 'app://video.gaiamobile.org/manifest.webapp'
        }]
      });

      // If this is a view activity without the FL app as one of the choices
      // we must allow the user to make a choice.
      this.sinon.clock.tick();
      assert.equal(stub.firstCall.args[0].type, 'activityrequesting');
      assert.equal(stub.secondCall.args[0].type, 'activitymenuwillopen');
    });

    test('allows choice for non-view activities that include FL', function() {
      var stub = this.sinon.stub(window, 'dispatchEvent');
      subject.chooseActivity({
        id: 'single',
        name: 'pick',
        choices: [{
          manifest: 'app://gallery.gaiamobile.org/manifest.webapp'
        },{
          manifest: 'app://fl.gaiamobile.org/manifest.webapp'
        }]
      });

      // If this is a not a view activity then we must allow the user to make
      // a choice even if the FL app is one of the choices.
      this.sinon.clock.tick();
      assert.equal(stub.firstCall.args[0].type, 'activityrequesting');
      assert.equal(stub.secondCall.args[0].type, 'activitymenuwillopen');
    });

    test('checks for default app on the list', function() {
      var activity = {
        id: 'single',
        name: 'view',
        activityType: 'image/*',
        choices: [{
          manifest: 'app://gallery.gaiamobile.org/manifest.webapp'
        },{
          manifest: 'app://camera.gaiamobile.org/manifest.webapp'
        }]
      };

      subject.chooseActivity(activity);
      assert.ok(DefaultActivityHelper.getDefaultAction.calledWith(
        activity.name, activity.activityType));
    });

    test('if not on the list, ignore', function() {
      this.sinon.spy(subject, '_gotDefaultAction');

      var activity = {
        id: 'single',
        name: 'pick',
        activityType: 'image/*',
        choices: [{
          manifest: 'app://gallery.gaiamobile.org/manifest.webapp'
        },{
          manifest: 'app://camera.gaiamobile.org/manifest.webapp'
        }]
      };

      subject.chooseActivity(activity);
      assert.ok(DefaultActivityHelper.getDefaultAction.calledWith(
        activity.name, activity.activityType));
      assert.ok(subject._gotDefaultAction.calledWith(null));
    });

    test('if on the list, check for default launch associated', function() {
      DefaultActivityHelper.getDefaultAction
        .returns({
          then: function(cb) { cb('fakeManifest'); }
        });
      this.sinon.spy(subject, '_gotDefaultAction');

      var activity = {
        id: 'single',
        name: 'pick',
        activityType: 'image/*',
        choices: [{
          manifest: 'app://gallery.gaiamobile.org/manifest.webapp'
        },{
          manifest: 'app://camera.gaiamobile.org/manifest.webapp'
        }]
      };

      subject.chooseActivity(activity);
      assert.ok(DefaultActivityHelper.getDefaultAction.calledWith(
        activity.name, activity.activityType));
      assert.ok(subject._gotDefaultAction.calledWith('fakeManifest'));
    });

    suite('choosing an activity ', function() {
      var sendEvent,
          defaultAct,
          formatted;

      setup(function() {
        subject._detail = {
          id: 'foo',
          name: 'testactivity',
          activityType: 'testtype',
          choices: [{
            manifest: 'manifest'
          }]
        };

        formatted = {
          id: 'foo',
          type: 'activity-choice',
          value: 0,
          setAsDefault: false
        };

        sendEvent = this.sinon.stub(subject, '_sendEvent');
        defaultAct = this.sinon.stub(DefaultActivityHelper, 'setDefaultAction');
      });

      test('without default activity set >', function() {
        var set_default = false;
        formatted.setAsDefault = set_default;
        subject.choose(0, set_default);

        assert.ok(sendEvent.calledWith(formatted),
          'calls _sendEvent WITHOUT default activity set');
        assert.isFalse(defaultAct.called, 'should not call the helper');
      });

      test('with a default activity set >', function() {
        var set_default = true;
        formatted.setAsDefault = set_default;
        subject.choose(0, set_default);

        assert.ok(sendEvent.calledWith(formatted),
          'calls _sendEvent WITH default activity set');
        assert.ok(defaultAct.calledWith('testactivity', 'testtype', 'manifest'),
          'should call the helper with the proper values');
      });
    });

    suite('cancel selection', function() {
      test('calls _sendEvent', function() {
        subject._detail = {
          id: 'foo'
        };
        var stub = this.sinon.stub(subject, '_sendEvent');
        var formatted = {
          id: 'foo',
          type: 'activity-choice',
          value: -1
        };
        subject.cancel();
        assert.ok(stub.calledWith(formatted));
      });
    });
  });

  suite('when a new app is installed', function() {
    var app,
        listedName,
        listedType;

    setup(function() {
      this.sinon.stub(DefaultActivityHelper, 'getDefaultAction');
      this.sinon.stub(DefaultActivityHelper, 'setDefaultAction');

      app = {
        'manifest': {
          'activities': {
            'browse': {
              'filters': {
                'type': 'photos'
               }
            },
            'pick': {
              'filters': {
                'type': ['image/*']
               }
            },
            'open': {
              'filters': {
                'type': ['video/*']
               }
            }
          }
        }
      };

      listedName = 'pick';
      listedType = 'image/*';

      subject = new Activities();
    });

    teardown(function() {
      subject.destroy();
    });

    test('correctly handles apps without activities', function() {
      var appWithoutActivities = {
        'manifest': {}
      };

      assert.doesNotThrow(
        () => subject._onNewAppInstalled(appWithoutActivities)
      );
    });

    test('manages the default launch for the app\'s activities', function() {
      DefaultActivityHelper.getDefaultAction
        .returns({ // instead of Promise.resolve() to return in same cycle
          then: function(cb) {
            cb(null);
          }
        })
        .withArgs(listedName, listedType).returns({
          then: function(cb) {
            cb('app://fakeapp1.gaiamobile.org/manifest.webapp');
          }
        });

      window.dispatchEvent(new CustomEvent('applicationinstall',{
        detail: {
          application: app
        }
      }));

      assert.ok(DefaultActivityHelper.getDefaultAction
        .calledWith('browse', 'photos'),
        'check the list for the first activity');
      assert.ok(DefaultActivityHelper.getDefaultAction
        .calledWith('pick', 'image/*'),
        'check the list for the second activity');
      assert.ok(DefaultActivityHelper.getDefaultAction
        .calledWith('open', 'video/*'),
        'check the list for the third activity');

      assert.ok(DefaultActivityHelper.setDefaultAction
        .calledWith(listedName, listedType, null),
        'removes the default app when the activity has it associated');

      assert.ok(DefaultActivityHelper.setDefaultAction.calledOnce,
        'not called for any other activity');
    });
  });

  suite('_sendEvent', function() {
    test('dispatches a mozContentEvent', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      subject._sendEvent();
      assert.equal(dispatchStub.getCall(0).args[0].type, 'mozContentEvent');
    });
  });

  suite('_listItems', function() {
    test('called with empty array', function() {
      var result = subject._listItems([]);
      assert.equal(result.length, 0);
    });

    test('returns formatted result', function() {
      MockApplications.mRegisterMockApp(fakeLaunchConfig1);

      var result = subject._listItems([
        {
          manifest: fakeLaunchConfig1.manifestURL,
          icon: 'http://mozilla'
        }
      ]);
      assert.equal(result.length, 1);
    });
  });
});
