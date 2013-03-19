requireApp('communications/dialer/js/keypad.js');

suite('dialer/keypad', function() {

  var subject;
  var number = '555-555-555-555';

  suiteSetup(function() {
    subject = KeypadManager;
  });

  suite('Keypad Manager', function() {

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
  });
});
