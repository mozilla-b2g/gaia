/*global MocksHelper, MockL10n, LinkActionHandler, ActivityPicker,
         ConversationView,
         Contacts
*/

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_option_menu.js');

require('/views/conversation/js/link_action_handler.js');
require('/views/shared/js/utils.js');

require('/views/shared/test/unit/mock_activity_picker.js');
require('/views/shared/test/unit/mock_contacts.js');
require('/views/shared/test/unit/mock_moz_activity.js');
require('/views/shared/test/unit/mock_conversation.js');
require('/views/shared/test/unit/mock_utils.js');

var mocksHelperLAH = new MocksHelper([
  'ActivityPicker',
  'Contacts',
  'MozActivity',
  'OptionMenu',
  'ConversationView',
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
      mocksHelperLAH.teardown();
    });

    test('dial-link: (known) delegates to promptContact ', function() {
      this.sinon.stub(ConversationView, 'promptContact');
      this.sinon.stub(Contacts, 'findByPhoneNumber')
        .callsArgWith(1, [{
          name: ['Huey'],
          tel: {
            value: '999'
          }
        }]);

      LinkActionHandler.onClick(events.phone);

      assert.deepEqual(ConversationView.promptContact.args[0][0], {
        number: '999',
        inMessage: true
      });

      assert.ok(events.phone.preventDefault.called);
      assert.ok(events.phone.stopPropagation.called);
    });

    test('dial-link: (unknown) delegates to promptContact ', function() {
      this.sinon.stub(ConversationView, 'promptContact');
      this.sinon.stub(Contacts, 'findByPhoneNumber')
        .callsArgWith(1, []);

      LinkActionHandler.onClick(events.phone);

      assert.deepEqual(ConversationView.promptContact.args[0][0], {
        number: '999',
        inMessage: true
      });

      assert.ok(events.phone.preventDefault.called);
      assert.ok(events.phone.stopPropagation.called);
    });

    test('email-link: delegates to prompt ', function() {
      this.sinon.stub(ConversationView, 'prompt');

      LinkActionHandler.onClick(events.email);

      assert.ok(ConversationView.prompt.called);
      assert.deepEqual(ConversationView.prompt.args[0][0], {
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
