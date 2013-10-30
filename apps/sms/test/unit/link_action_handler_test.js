/*global MocksHelper, MockL10n, LinkActionHandler, ActivityPicker, ThreadUI,
         Contacts */

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

    test('dial-link: (known) delegates to promptContact ', function() {
      this.sinon.stub(ThreadUI, 'promptContact');
      this.sinon.stub(Contacts, 'findByPhoneNumber')
        .callsArgWith(1, [{
          name: ['Huey'],
          tel: {
            value: '999'
          }
        }]);

      LinkActionHandler.onClick(events.phone);

      assert.deepEqual(ThreadUI.promptContact.args[0][0], {
        number: '999',
        inMessage: true
      });

      assert.ok(events.phone.preventDefault.called);
      assert.ok(events.phone.stopPropagation.called);
    });

    test('dial-link: (unknown) delegates to promptContact ', function() {
      this.sinon.stub(ThreadUI, 'promptContact');
      this.sinon.stub(Contacts, 'findByPhoneNumber')
        .callsArgWith(1, []);

      LinkActionHandler.onClick(events.phone);

      assert.deepEqual(ThreadUI.promptContact.args[0][0], {
        number: '999',
        inMessage: true
      });

      assert.ok(events.phone.preventDefault.called);
      assert.ok(events.phone.stopPropagation.called);
    });

    test('email-link: delegates to prompt ', function() {
      this.sinon.stub(ThreadUI, 'prompt');

      LinkActionHandler.onClick(events.email);

      assert.ok(ThreadUI.prompt.called);
      assert.deepEqual(ThreadUI.prompt.args[0][0], {
        email: 'a@b.com',
        inMessage: true
      });
    });

    test('url-link: go directly to the action ', function() {
      this.sinon.stub(ActivityPicker, 'url');

      LinkActionHandler.onClick(events.url);

      assert.isTrue(ActivityPicker.url.called);
      assert.ok(events.url.preventDefault.called);
      assert.ok(events.url.stopPropagation.called);
    });
  });
});
