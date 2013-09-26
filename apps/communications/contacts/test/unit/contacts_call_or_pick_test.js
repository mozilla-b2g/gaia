'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_activity_handler.js');
requireApp('communications/contacts/test/unit/mock_mozActivity.js');
requireApp('communications/contacts/test/unit/mock_telephony_helper.js');
requireApp('communications/dialer/js/mmi.js');
requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/js/contacts.js');

var mocksHelperForCallOrPick = new MocksHelper([
  'ActivityHandler',
  'LazyLoader',
  'MozActivity',
  'TelephonyHelper'
]).init();

suite('Test callOrPick', function() {

  suiteSetup(function() {
    mocksHelperForCallOrPick.suiteSetup();
    MockMozActivity.mSetup();
  });

  suiteTeardown(function() {
    MockMozActivity.mTeardown();
  });

  suite('callOrPick', function() {
    test('ActivityHandler currently handling', function(done) {
      ActivityHandler.currentlyHandling = true;
      Contacts.callOrPick('123');
      assert.equal(typeof ActivityHandler.postPickSuccessParam, 'object');
      assert.equal(ActivityHandler.postPickSuccessParam.number, '123');
      done();
    });

    test('ActivityHandler not currently handling, isMMI', function(done) {
      ActivityHandler.currentlyHandling = false;
      ActivityHandler.postPickSuccessParam = null;
      Contacts.callOrPick('*123#');
      assert.equal(ActivityHandler.postPickSuccessParam, null);
      var activity = MockMozActivity.calls[0];
      assert.equal(activity.name, 'dial');
      assert.equal(activity.data.type, 'webtelephony/number');
      assert.equal(activity.data.number, '*123#');
      done();
    });

    test('ActivityHandler not currently handling, no isMMI', function(done) {
      ActivityHandler.currentlyHandling = false;
      ActivityHandler.postPickSuccessParam = null;
      Contacts.callOrPick('123');
      assert.equal(ActivityHandler.postPickSuccessParam, null);
      assert.equal(TelephonyHelper.number, '123');
      done();
    });

  });
});
