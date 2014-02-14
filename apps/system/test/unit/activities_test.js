'use strict';
/* global MocksHelper, MockApplications, MockL10n, Activities */

requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/action_menu.js');
requireApp('system/shared/js/manifest_helper.js');
requireApp('system/js/activities.js');
mocha.globals(['Activities', 'addEventListener', 'dispatchEvent']);

var mocksForActivities = new MocksHelper([
  'Applications'
]).init();

suite('system/Activities', function() {
  var realL10n;
  var subject;

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
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.sinon.useFakeTimers();
    subject = new Activities();
  });

  teardown(function() {
    this.sinon.clock.restore();
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
        'activitymenuwillopen');
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
});
