'use strict';

/* globals MocksHelper, CallInfo, CallGroupMenu, OptionMenu */

require('/dialer/test/unit/mock_call_info.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_option_menu.js');

require('/dialer/js/call_group_menu.js');

var mocksHelperForPhoneActionMenu = new MocksHelper([
  'CallInfo',
  'LazyLoader',
  'MozActivity',
  'OptionMenu'
]).init();

suite('Call Group menu', function() {
  mocksHelperForPhoneActionMenu.attachTestHelpers();

  var fakePrimaryInfo = 'Jean-Baptiste Poquelin';
  var fakePhoneNumber = '123';
  var fakeDate = '123456789';
  var fakeType = 'incoming';

  setup(function() {
    CallGroupMenu.show(fakePrimaryInfo, fakePhoneNumber, fakeDate, fakeType);
  });

  suite('Opening', function() {
    test('should display the good options and header', function() {
      assert.equal(OptionMenu.calls.length, 1);
      var called = OptionMenu.calls[0];
      assert.equal(called.items.length, 3);

      assert.equal(called.header.textContent, fakePrimaryInfo);
      assert.equal(called.header.className, 'ellipsis-dir-fix');

      assert.equal(called.items[0].l10nId, 'callInformation');

      assert.equal(called.items[1].l10nId, 'sendSms');

      assert.equal(called.items[2].l10nId, 'cancel');
      assert.isTrue(called.items[2].incomplete);
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
        CallInfo.show, fakePhoneNumber, fakeDate, fakeType);
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
});
