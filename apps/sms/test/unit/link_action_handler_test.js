'use strict';

requireApp('sms/js/link_action_handler.js');
requireApp('sms/js/utils.js');

requireApp('sms/test/unit/mock_action_menu.js');
requireApp('sms/test/unit/mock_activity_picker.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_moz_activity.js');
requireApp('sms/test/unit/mock_thread_ui.js');
requireApp('sms/test/unit/mock_utils.js');

var mocksHelperLAH = new MocksHelper([
  'ActivityPicker',
  'Contacts',
  'MozActivity',
  'OptionMenu',
  'ThreadUI',
  'Utils'
]).init();

suite('LinkActionHandler', function() {
  var realMozL10n, events;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    mocksHelperLAH.suiteSetup();

    events = {
      phone: {
        target: {
          dataset: {
            action: 'dial-link',
            dial: '999'
          }
        }
      },
      email: {
        target: {
          dataset: {
            action: 'email-link',
            email: 'a@b.com'
          }
        }
      },
      url: {
        target: {
          dataset: {
            action: 'url-link',
            url: 'http://mozilla.com'
          }
        }
      }
    };
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    mocksHelperLAH.suiteTeardown();
  });

  setup(function() {

    Object.keys(events).forEach(function(type) {
      events[type].preventDefault = this.sinon.spy();
      events[type].stopPropagation = this.sinon.spy();
    }, this);

    mocksHelperLAH.setup();
  });

  teardown(function() {
    mocksHelperLAH.teardown();
  });

  suite('onClick', function() {

    setup(function() {
      mocksHelperLAH.setup();
    });

    teardown(function() {
      LinkActionHandler.reset();
      mocksHelperLAH.teardown();
    });

    test('url-link ', function() {
      LinkActionHandler.onClick(events.url);

      assert.ok(ActivityPicker.url.called);
      assert.equal(ActivityPicker.url.calledWith[0], 'http://mozilla.com');
    });

    test('email-link ', function() {
      LinkActionHandler.onClick(events.email);

      assert.ok(ActivityPicker.email.called);
      assert.equal(ActivityPicker.email.calledWith[0], 'a@b.com');
    });

    test('dial-link ', function() {
      LinkActionHandler.onClick(events.phone);

      assert.ok(ActivityPicker.dial.called);
      assert.equal(ActivityPicker.dial.calledWith[0], '999');
    });
  });

  suite('onContextMenu', function() {

    setup(function() {
      mocksHelperLAH.setup();
    });

    teardown(function() {
      mocksHelperLAH.teardown();
    });

    test('dial-link: (known) delegates to activateContact ', function() {
      this.sinon.stub(ThreadUI, 'activateContact');
      this.sinon.stub(Contacts, 'findByPhoneNumber')
        .callsArgWith(1, [{
          name: ['Huey'],
          tel: {
            value: '999'
          }
        }]);

      LinkActionHandler.onContextMenu(events.phone);

      assert.deepEqual(ThreadUI.activateContact.args[0][0], {
        name: 'Huey',
        number: '999',
        isContact: true,
        inMessage: true
      });

      assert.ok(events.phone.preventDefault.called);
      assert.ok(events.phone.stopPropagation.called);
    });

    test('dial-link: (unknown) delegates to activateContact ', function() {
      this.sinon.stub(ThreadUI, 'activateContact');
      this.sinon.stub(Contacts, 'findByPhoneNumber')
        .callsArgWith(1, []);

      LinkActionHandler.onContextMenu(events.phone);

      assert.deepEqual(ThreadUI.activateContact.args[0][0], {
        name: undefined,
        number: '999',
        isContact: false,
        inMessage: true
      });

      assert.ok(events.phone.preventDefault.called);
      assert.ok(events.phone.stopPropagation.called);
    });

    test('email-link: delegates to activateContact ', function() {
      this.sinon.stub(ThreadUI, 'activateContact');

      LinkActionHandler.onContextMenu(events.email);

      assert.ok(ThreadUI.activateContact.called);
      assert.deepEqual(ThreadUI.activateContact.args[0][0], {
        email: 'a@b.com',
        inMessage: true
      });
    });

    test('url-link: delegates to onClick ', function() {
      this.sinon.stub(LinkActionHandler, 'onClick');

      LinkActionHandler.onContextMenu(events.url);

      assert.deepEqual(LinkActionHandler.onClick.args[0][0].target, {
        dataset: {
          action: 'url-link',
          url: 'http://mozilla.com'
        }
      });

      // Ensures that the _ACTUAL_ event object (whatever that may be)
      // is the object that is sent to LinkActionHandler.onClick
      assert.equal(LinkActionHandler.onClick.args[0][0], events.url);

      assert.ok(events.url.preventDefault.called);
      assert.ok(events.url.stopPropagation.called);
    });
  });
});
