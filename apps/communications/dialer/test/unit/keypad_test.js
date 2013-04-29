requireApp('communications/dialer/js/keypad.js');
requireApp('communications/dialer/js/dialer.js');
requireApp('communications/dialer/test/unit/mock_call_handler.js');

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

suite('dialer/keypad', function() {
  var subject;
  var realCallHandler;

  suiteSetup(function() {
    subject = KeypadManager;
    realCallHandler = CallHandler;
    window.CallHandler = MockCallHandler;
  });

  suiteTeardown(function() {
    window.CallHandler = realCallHandler;
  });

  suite('Keypad Manager', function() {
    test('sanitizePhoneNumber', function(done) {
      var testCases = {
          '111-111-1111': '111-111-1111',
          ' 222-222-2222 ': '222-222-2222',
          ' 333  -  333  -  3333 ': '333-333-3333',
          '4444  4444  4444': '444444444444',
          '555\n555\n5555': '5555555555',
          '666\t666\t6666': '6666666666'
      };

      var counter = 0;

      function verifyNumber(index) {
        return function() {
          var sanitized = subject.sanitizePhoneNumber(index);
          assert.equal(sanitized, testCases[index]);
        }
      }

      for (var i in testCases) {
        counter++;
        test('#sanitizePhoneNumber - test case ' + counter, verifyNumber(i));
      }

      done();
    });

    test('Get IMEI via send MMI', function() {
      var mmi = '*#06#';
      var fakeEvent = {
        target: {
          dataset: {
            value: null
          }
        },
        stopPropagation: function() {},
        type: null
      };

      subject.phoneNumberView = {
        value: 'randomvalue'
      };

      for (var i = 0, end = mmi.length; i < end; i++) {
        fakeEvent.target.dataset.value = mmi.charAt(i);
        subject._phoneNumber += mmi.charAt(i);
        subject.keyHandler(fakeEvent);
      }

      assert.equal(CallHandler._lastCall, mmi);
    });
  });
});
