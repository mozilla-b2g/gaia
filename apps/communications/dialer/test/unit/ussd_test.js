requireApp('communications/dialer/js/ussd.js');

requireApp('communications/dialer/test/unit/mock_ussd_ui.js');
requireApp('communications/dialer/test/unit/mock_mozMobileConnection.js');

suite('dialer/ussd', function () {

  var realMozMobileConnection;
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function ml_get(key) {
        return key;
      }
    }
    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockMozMobileConnection;
    UssdManager.init();
    UssdManager._popup = MockUssdUI;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozMobileConnection = realMozMobileConnection;
    UssdManager._popup = null;
  });

  suite('ussd message sending', function () {

    suiteSetup(function() {
      UssdManager.send('This is a message.');
    });

    test('ussd message sent', function() {
      assert.isTrue(navigator.mozMobileConnection._ussd_message_sent);
    });

    test('ussd response by server', function (){
      assert.equal(UssdManager._popup._messageReceived, 'This is a message.- Received');
    });

    suiteTeardown(function() {
      navigator.mozMobileConnection.teardown();
      UssdManager._popup.teardown();
    });

  });

  suite('ussd message reply via UI', function () {

    suiteSetup(function() {
      UssdManager._popup.reply('This is a second message.');
    });

    test('ussd reply message sent', function() {
      assert.isTrue(navigator.mozMobileConnection._ussd_message_sent);
    });

    test('ussd response to reply message by server', function (){
      assert.equal(UssdManager._popup._messageReceived, 'This is a second message.- Received');
    });

    suiteTeardown(function () {
      navigator.mozMobileConnection.teardown();
      UssdManager._popup.teardown();
    });

  });

  suite('ussd cancelling via UI', function () {

    suiteSetup(function() {  
      UssdManager._popup.closeWindow();
    });

    test('ussd cancelled', function() {
      assert.isTrue(navigator.mozMobileConnection._ussd_cancelled);
    });

    test('ussd UI closed', function (){
      assert.isNull(UssdManager._popup);
    });

    suiteTeardown(function () {
      navigator.mozMobileConnection.teardown();
    });

  });

});