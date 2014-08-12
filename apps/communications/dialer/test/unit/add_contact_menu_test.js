'use strict';

/* globals MocksHelper, AddContactMenu, OptionMenu */

require('/dialer/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_option_menu.js');

requireApp('communications/dialer/js/add_contact_menu.js');

var mocksHelperForPhoneActionMenu = new MocksHelper([
  'LazyLoader',
  'MozActivity',
  'OptionMenu'
]).init();

suite('Add Contact menu', function() {
  mocksHelperForPhoneActionMenu.attachTestHelpers();

  var fakePhoneNumber = '123';
  setup(function() {
    AddContactMenu.show(fakePhoneNumber);
  });

  suite('Opening', function() {
    test('should display the good options and header', function() {
      assert.equal(OptionMenu.calls.length, 1);
      var called = OptionMenu.calls[0];
      assert.equal(called.items.length, 3);

      assert.equal(called.header, fakePhoneNumber);

      assert.equal(called.items[0].l10nId, 'createNewContact');

      assert.equal(called.items[1].l10nId, 'addToExistingContact');

      assert.equal(called.items[2].l10nId, 'cancel');
      assert.isTrue(called.items[2].incomplete);
    });
  });

  suite('Create new contact', function() {
    setup(function() {
      this.sinon.spy(window, 'MozActivity');
      var item = OptionMenu.calls[0].items[0];
      item.method.apply(null, item.params);
    });

    test('starts a new SMS activity', function() {
      sinon.assert.calledWith(window.MozActivity, {
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': fakePhoneNumber
          }
        }}
      );
    });
  });
  suite('Add to existing contact', function() {
    setup(function() {
      this.sinon.spy(window, 'MozActivity');
      var item = OptionMenu.calls[0].items[1];
      item.method.apply(null, item.params);
    });

    test('starts a new SMS activity', function() {
      sinon.assert.calledWith(window.MozActivity, {
        name: 'update',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': fakePhoneNumber
          }
        }}
      );
    });
  });
});
