requireApp('communications/dialer/js/ussd.js');

requireApp('communications/dialer/test/unit/mock_ussd_ui.js');
requireApp('communications/dialer/test/unit/mock_mozMobileConnection.js');

suite('dialer/ussd', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function ml_get(key) {
        return key;
      }
    };
    UssdManager._conn = MockMozMobileConnection;
    UssdManager.init();
    UssdManager._popup = MockUssdUI;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    UssdManager._popup = null;
  });

  teardown(function() {
    UssdManager._conn.teardown();
    if (UssdManager._popup)
      UssdManager._popup.teardown();
  });

  suite('ussd message sending', function() {

    setup(function() {
      UssdManager.send('This is a message.');
    });

    test('ussd message sent', function() {
      assert.isTrue(UssdManager._conn._ussd_message_sent);
    });

    test('ussd response by server', function() {
      assert.equal(UssdManager._popup._messageReceived,
        'This is a message.- Received');
    });

  });

  suite('ussd message reply via UI', function() {

    setup(function() {
      UssdManager._popup.reply('This is a second message.');
    });

    test('ussd reply message sent', function() {
      assert.isTrue(UssdManager._conn._ussd_message_sent);
    });

    test('ussd response to reply message by server', function() {
      assert.equal(UssdManager._popup._messageReceived,
        'This is a second message.- Received');
    });

  });

  suite('ussd cancelling via UI', function() {

    setup(function() {
      // UssdManager._popup reset to MockUssdUI since
      // this suite's setup sets it to null via closeWindow().
      // Otherwise, the second test setup would fail.
      UssdManager._popup = MockUssdUI;
      UssdManager._popup.closeWindow();
    });

    test('ussd cancelled', function() {
      assert.isTrue(UssdManager._conn._ussd_cancelled);
    });

    test('ussd UI closed', function() {
      assert.isNull(UssdManager._popup);
    });

  });

});
