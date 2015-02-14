'use strict';

/* global CallGroupMenu */


require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_option_menu.js');

require('/dialer/test/unit/mock_call_info.js');
require('/dialer/test/unit/mock_confirm_dialog.js');

require('/dialer/js/call_group_menu.js');

var mocksHelperForPhoneActionMenu = new MocksHelper([
  'CallInfo',
  'LazyLoader',
  'MozActivity',
  'OptionMenu',
  'ConfirmDialog'
]).init();

suite('Call Group menu', function() {
  mocksHelperForPhoneActionMenu.attachTestHelpers();

  var fakePrimaryInfo = 'Jean-Baptiste Poquelin';
  var fakePhoneNumber = '123';
  var fakeDate = '123456789';
  var fakeType = 'incoming';
  var fakeStatus = 'connected';
  var fakeEvent = 'fakeEvent';

  setup(function() {
    CallGroupMenu.show(fakePrimaryInfo, fakePhoneNumber, fakeDate, fakeType, fakeStatus, fakeEvent);
  });

  suite('Opening', function() {
    test('should display the good options and header', function() {
      assert.equal(OptionMenu.calls.length, 1);
      var called = OptionMenu.calls[0];
      assert.equal(called.items.length, 4);

      assert.equal(called.header, fakePrimaryInfo);

      assert.equal(called.items[0].l10nId, 'callInformation');

      assert.equal(called.items[1].l10nId, 'sendSms');

      assert.equal(called.items[2].l10nId, 'delete');

      assert.equal(called.items[3].l10nId, 'cancel');
      assert.isTrue(called.items[3].incomplete);
    });
  });

  suite('Displaying call information', function() {
    setup(function() {
      this.sinon.spy(CallInfo, 'show');

      // Fake clicking on the first button
      var item = OptionMenu.calls[0].items[0];
      item.method.apply(null, item.params);
    });

    test('calls CallInfo', function() {
      sinon.assert.calledWith(
        CallInfo.show, fakePhoneNumber, fakeDate, fakeType, fakeStatus);
    });
  });

  suite('Sending a SMS', function() {
    setup(function() {
      this.sinon.spy(window, 'MozActivity');

      // Fake clicking on the second button
      var item = OptionMenu.calls[0].items[1];
      item.method.apply(null, item.params);
    });

    test('starts a new SMS activity', function() {
      sinon.assert.calledWith(window.MozActivity, {
        name: 'new',
        data: {
          type: 'websms/sms',
          number: '123'
        }}
      );
    });
  });

  suite('Delete a call entry', function() {
    setup(function() {

      this.sinon.spy(MockConfirmDialog, 'show');
      this.sinon.spy(MockConfirmDialog, 'hide');

      // Fake clicking on the third button `Delete`
      var item = OptionMenu.calls[0].items[2];
      item.method.apply(null, item.params);
    });

    test('Show delete dialog, and dismiss', function() {
      sinon.assert.calledWith(MockConfirmDialog.show);
      ConfirmDialog.executeNo();
      sinon.assert.calledWith(MockConfirmDialog.hide);
    });

    // 'Show delete dialog, and tap `yes`' implemented in call_log_test.js
  });


});
