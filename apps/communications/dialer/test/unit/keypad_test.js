'use strict';

requireApp('communications/dialer/js/keypad.js');

requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_utils.js');
requireApp('communications/dialer/test/unit/mock_call_handler.js');
requireApp('communications/dialer/test/unit/mock_call_log_db_manager.js');
requireApp('communications/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('communications/dialer/test/unit/mock_tone_player.js');

requireApp('communications/dialer/test/unit/mock_dialer_index.html.js');

var mocksHelperForKeypad = new MocksHelper([
  'LazyLoader',
  'Utils',
  'CallHandler',
  'CallLogDBManager',
  'SettingsListener',
  'TonePlayer'
]).init();

suite('dialer/keypad', function() {
  var subject;
  var previousBody;

  mocksHelperForKeypad.attachTestHelpers();

  suiteSetup(function() {
    previousBody = document.body.innerHTML;
    document.body.innerHTML = MockDialerIndexHtml;
    subject = KeypadManager;
  });

  suiteTeardown(function() {
    document.body.innerHTML = previousBody;
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

      for (var i = 0, end = mmi.length; i < end; i++) {
        fakeEvent.target.dataset.value = mmi.charAt(i);
        subject._phoneNumber += mmi.charAt(i);
        subject.keyHandler(fakeEvent);
      }

      assert.equal(CallHandler._lastCall, mmi);
    });

    test('Call button pressed with no calls in Call Log', function() {
      subject._phoneNumber = '';
      subject.makeCall();
      assert.equal(subject._phoneNumber, '');
    });

    test('Call button pressed with an incoming call and no outgoing calls ' +
      'in Call Log', function() {
      var recentCall = {
        number: '666666666',
        type: 'incoming',
        date: Date.now(),
        status: 'connected'
      };
      CallLogDBManager.add(recentCall, function(result) {
        subject._phoneNumber = '';
        subject.makeCall();
        assert.equal(subject._phoneNumber, '');
      });
    });

    test('Call button pressed with outgoing call in Call Log', function() {
      var recentCall = {
        number: '666666666',
        type: 'dialing',
        date: Date.now()
      };
      subject._phoneNumber = '';
      CallLogDBManager.add(recentCall);
      subject.makeCall();
      assert.equal(subject._phoneNumber, recentCall.number);
    });
  });
});
