requireApp('communications/dialer/js/keypad.js');

requireApp('communications/dialer/test/unit/mock_recents_db.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_contact_data_manager.js');

if (!this.MockRecentsDBManager) {
  this.RecentsDBManager = null;
}

if (!this.ContactDataManager) {
  this.ContactDataManager = null;
}

if (!this.LazyL10n) {
  this.LazyL10n = null;
}

if (!this.LazyLoader) {
  this.LazyLoader = null;
}

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

    suite('suggestion Bar', function() {
      var realRecentsDBManager;
      var realContactDataManager;
      var realLazyL10n;
      var mockSuggestionBar;
      var realLazyLoader;

      suiteSetup(function() {
        realRecentsDBManager = window.RecentsDBManager;
        window.RecentsDBManager = MockRecentsDBManager;

        realContactDataManager = window.ContactDataManager;
        window.ContactDataManager = MockContactDataManager;

        realLazyLoader = window.LazyLoader;
        window.LazyLoader = MockLazyLoader;

        realLazyL10n = LazyL10n;
        window.LazyL10n = {
          get: function get(cb) {
            cb(function l10n_get(key) {
              return key;
            });
          }
        };

        mockSuggestionBar = document.createElement('div');
        mockSuggestionBar.id = 'suggestion-bar';
        mockSuggestionBar.innerHTML =
          '<div class="avatar"></div>' +
          '<div class="name"></div>' +
          '<div class="tel-type"></div>' +
          '<div class="tel"><span class="matched"></span></div>';
        document.body.appendChild(mockSuggestionBar);
      });

      test('#update suggestions by recent', function() {
        var mockNumber = '0987654321';
        var tel = mockSuggestionBar.querySelector('.tel');
        subject._phoneNumber = '0987';
        MockRecentsDBManager.mData = {number: mockNumber};
        MockContactDataManager.result = {};

        subject.updateSuggestions();
        assert.equal(
          tel.textContent,
          mockNumber,
          'should got recent number 0987654321 from recentsDB'
        );
      });

      test('#update suggestions by contact data', function() {
        var mockNumber = '1234567890';
        var enteredNumber = '345';
        var mockResult = [{
          id: '000000',
          name: ['John'],
          tel: [
            { type: 'mobile',
              value: '111111111' },
            { type: 'home',
              value: mockNumber }]
        }];
        MockContactDataManager.result = mockResult;

        var tel = mockSuggestionBar.querySelector('.tel');
        subject._phoneNumber = enteredNumber;
        subject.updateSuggestions();
        assert.equal(
          tel.textContent,
          mockNumber,
          'should got number 1234567890 from mozContact'
        );
      });

      suiteTeardown(function() {
        window.RecentsDBManager = realRecentsDBManager;
        window.ContactDataManager = realContactDataManager;
        window.LazyLoader = realLazyLoader;
        window.LazyL10n = realLazyL10n;
        document.body.removeChild(mockSuggestionBar);
      });
    });
  });
});
