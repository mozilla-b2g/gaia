'use strict';
/* global MocksHelper, MockApplications, MockL10n, ActionMenu, Activities */

requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/action_menu.js');
requireApp('system/shared/js/manifest_helper.js');
requireApp('system/js/activities.js');
var mocksForActivities = new MocksHelper([
  'Applications'
]).init();

suite('system/Activities', function() {
  var realL10n;
  var subject;
  var stubById;
  var fakeElement;
  var realApplications;

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
    window.applications = MockApplications;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    window.applications = realApplications;
    realApplications = null;
  });

  setup(function() {
    this.sinon.useFakeTimers();

    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));

    subject = new Activities();
  });

  teardown(function() {
    this.sinon.clock.restore();
    stubById.restore();
  });

  suite('constructor', function() {
    test('adds event listeners', function() {
      var addEventStub = this.sinon.stub(window, 'addEventListener');
      subject = new Activities();
      assert.ok(addEventStub.withArgs('mozChromeEvent').calledOnce);
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
      var stub = this.sinon.stub(ActionMenu.prototype, 'hide');
      subject.actionMenu = new ActionMenu();
      subject.handleEvent({type: 'appopened'});
      assert.ok(stub.calledOnce);
    });
  });

  suite('chooseActivity', function() {
    test('chooses with 1 item', function() {
      var stub = this.sinon.stub(subject, 'choose');
      subject.chooseActivity({
        id: 'single',
        choices: ['first']
      });
      assert.ok(stub.calledWith('0'));
    });

    test('opens action menu with multiple items', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      subject.chooseActivity({
        id: 'single',
        choices: ['first', 'second']
      });
      this.sinon.clock.tick();
      assert.equal(dispatchStub.getCall(0).args[0].type,
        'activityrequesting');
      assert.equal(dispatchStub.getCall(1).args[0].type,
        'activitymenuwillopen');
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

  });

  suite('choose', function() {
    test('calls _sendEvent', function() {
      subject._id = 'foo';
      var stub = this.sinon.stub(subject, '_sendEvent');
      var formatted = {
        id: 'foo',
        type: 'activity-choice',
        value: 0
      };
      subject.choose(0);
      assert.ok(stub.calledWith(formatted));
    });
  });

  suite('cancel', function() {
    test('calls _sendEvent', function() {
      subject._id = 'foo';
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

  suite('opens action menu', function() {
    test('only opens once if we get two activity-choice events', function() {
      var actionMenuStub = this.sinon.stub(ActionMenu.prototype, 'start');
      var evt = {
        type: 'mozChromeEvent',
        detail: {
          type: 'activity-choice',
          choices: []
        }
      };
      subject.handleEvent(evt);
      this.sinon.clock.tick();
      subject.handleEvent(evt);
      this.sinon.clock.tick();
      assert.ok(actionMenuStub.calledOnce);
    });
  });
});
