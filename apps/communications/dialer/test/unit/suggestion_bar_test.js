/* globals MockCallHandler, MockContacts, MockFbContacts, MocksHelper,
           MockLazyL10n, MockNavigatorMozIccManager, SuggestionBar */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_call_handler.js');
// FIXME : This should be a mock
require('/shared/js/simple_phone_matcher.js');
require('/shared/test/unit/mocks/mock_fb_data_reader.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');

require('/dialer/js/suggestion_bar.js');

var mocksHelperForSuggestionBar = new MocksHelper([
  'Contacts',
  'LazyL10n',
  'LazyLoader',
  'KeypadManager',
  'CallHandler'
]).init();

suite('suggestion Bar', function() {
  var realFbContacts;
  var realMozIccManager;

  mocksHelperForSuggestionBar.attachTestHelpers();

  suiteSetup(function() {
    window.fb = window.fb || {};
    realFbContacts = window.fb.contacts;
    window.fb.contacts = MockFbContacts;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    MockNavigatorMozIccManager.mTeardown();
  });

  var domSuggestionBar;
  var domSuggestionCount;
  var domOverlay;

  var subject;

  var mockResult1 = [{
      id: '000000',
      name: ['John'],
      tel: [
        { type: 'mobile',
          value: '111111111' },
        { type: 'my-custom-type',
          value: '1234567890' }]
    }];

  var mockResult2 = [{
      id: '000000',
      name: ['John'],
      tel: [
        { type: 'mobile',
          value: '111111111' }]
    },{
      id: '000000',
      name: ['Mary'],
      tel: [
        { type: 'mobile',
          value: '111122222' }]
    }];

  var mockResult3 = [{
      id: '000000',
      name: ['John'],
      tel: [
        { type: 'mobile',
          value: '12345678' },
        { type: 'home',
          value: '12343210' }]
    },{
      id: '000000',
      name: ['George'],
      tel: [
        { type: 'mobile',
          value: '12340000' }]

    }];

  var mockResultFb = [{
    id: '000000',
    name: ['William'],
    tel: [
      { type: 'mobile',
        value: '12349999' }
    ]
  },
  {
    id: '000001',
    name: ['Jack'],
    tel: [
      { type: 'mobile',
        value: '12341111' }
    ]
  }];


  setup(function() {
    subject = SuggestionBar;

    MockNavigatorMozIccManager.addIcc(0, {});

    loadBodyHTML('/dialer/elements/suggestion-item.html');

    domSuggestionBar = document.createElement('section');
    domSuggestionBar.id = 'suggestion-bar';
    domSuggestionBar.innerHTML =
      '<div id="suggestion-count" class="more"></div>' +
      '<div is="suggestion-item" ' +
        'class="js-suggestion-item suggestion-item"></div>';
    document.body.appendChild(domSuggestionBar);
    document.querySelector('.js-suggestion-item').innerHTML =
      document.body.querySelector('template').innerHTML;
    domOverlay = document.createElement('form');
    domOverlay.id = 'suggestion-overlay';
    domOverlay.innerHTML =
      '<button role="button" is="suggestion-item" ' +
        ' id="suggestion-item-template" ' +
        ' class="js-suggestion-item suggestion-item" hidden></button>' +
      '<header></header>' +
      '<menu id="suggestion-list">' +
        '<button id="suggestion-overlay-cancel" ' +
          'data-l10n-id="cancel">Cancel</button>' +
      '</menu>';
    domOverlay.querySelector('.js-suggestion-item').innerHTML =
      document.body.querySelector('template').innerHTML;
    document.body.appendChild(domOverlay);
    domSuggestionCount = domSuggestionBar.querySelector('#suggestion-count');

    subject.overlay = domOverlay;
    subject.bar = domSuggestionBar;
    subject.countTag = document.getElementById('suggestion-count');
    subject.list = document.getElementById('suggestion-list');
    subject.overlayCancel =
        document.getElementById('suggestion-overlay-cancel');
    subject.init();
    this.sinon.stub(MockLazyL10n, 'get', function(callback) {
      callback(function(prop) {
        switch(prop) {
          case'my-custom-type':
            return undefined;
          default:
            return prop;
        }
      });
    });
  });

  teardown(function() {
    document.body.removeChild(domSuggestionBar);
    document.body.removeChild(domOverlay);

    MockNavigatorMozIccManager.mTeardown();
  });

  suiteTeardown(function() {
    window.fb.contacts = realFbContacts;

    navigator.mozIccManager = realMozIccManager;
  });


  suite('Suggestion Bar', function() {
    test('#update suggestions by contact data - 1 data', function() {
      var mockNumber = '1234567890';
      var enteredNumber = '1234';
      var tel = domSuggestionBar.querySelector('.js-tel');
      var telType = domSuggestionBar.querySelector('.js-tel-type');

      MockContacts.mResult = mockResult1;
      subject.update(enteredNumber);

      assert.equal(tel.textContent, mockNumber,
                  'should got number 1234567890 from mozContact');
      assert.isTrue(MockLazyL10n.get.called,
                    'should lazy load the localization library');
      assert.equal(telType.textContent, 'my-custom-type',
                   'should default to the type string when there is no ' +
                   'localization');
      assert.isFalse(domSuggestionCount.classList.contains('more'),
                  '#suggestion-count shouldn\'t contain "more" style');
      assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
    });

    test('#update suggestions by contact data - 2 datas', function() {
      var mockNumber = '111111111';
      var enteredNumber = '1111';
      var tel = domSuggestionBar.querySelector('.js-tel');
      var telType = domSuggestionBar.querySelector('.js-tel-type');

      MockContacts.mResult = mockResult2;
      subject.update(enteredNumber);

      assert.equal(tel.textContent, mockNumber,
                  'should got number 111111111 from mozContact');
      assert.isTrue(MockLazyL10n.get.called,
                    'should lazy load the localization library');
      assert.equal(telType.textContent, 'mobile',
                   'should localize the phone type');
      assert.isTrue(domSuggestionCount.classList.contains('more'),
                  '#suggestion-count should contain "more" style');
      assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
    });

    test('#update suggestions by contact data - 0 local data - 1 FB data',
      function() {
        var mockNumber = '12349999';
        var enteredNumber = '1234';
        var tel = domSuggestionBar.querySelector('.js-tel');
        var telType = domSuggestionBar.querySelector('.js-tel-type');

        MockContacts.mResult = [];
        MockFbContacts.mResult = mockResultFb.slice(0, 1);
        subject.update(enteredNumber);

        assert.equal(tel.textContent, mockNumber,
                    'should got number 12349999 from Facebook');
        assert.isTrue(MockLazyL10n.get.called,
                    'should lazy load the localization library');
        assert.equal(telType.textContent, 'mobile',
                   'should localize the phone type');
        assert.isFalse(domSuggestionCount.classList.contains('more'),
                    '#suggestion-count should not contain "more" style');
        assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');

        assert.equal(SuggestionBar._contactList.length, 1,
                     '_contactList.length should be 1');
    });

    test('#update suggestions by contact data - 1 local data - 1 FB data',
      function() {
        var mockNumber = '1234567890';
        var enteredNumber = '1234';
        var tel = domSuggestionBar.querySelector('.js-tel');
        var telType = domSuggestionBar.querySelector('.js-tel-type');

        MockContacts.mResult = mockResult1;
        MockFbContacts.mResult = mockResultFb.slice(0, 1);
        subject.update(enteredNumber);

        assert.equal(tel.textContent, mockNumber,
                    'should got number 1234567890 from mozContact');
        assert.isTrue(MockLazyL10n.get.called,
                      'should lazy load the localization library');
        assert.equal(telType.textContent, 'my-custom-type',
                   'should default to the type string when there is no ' +
                   'localization');
        assert.isTrue(domSuggestionCount.classList.contains('more'),
                    '#suggestion-count should contain "more" style');
        assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
    });

    test('#update suggestions by contact data - 0 local data - 2 FB data',
      function() {
        var mockNumber = '12349999';
        var enteredNumber = '1234';
        var tel = domSuggestionBar.querySelector('.js-tel');
        var telType = domSuggestionBar.querySelector('.js-tel-type');

        MockContacts.mResult = [];
        MockFbContacts.mResult = mockResultFb;
        subject.update(enteredNumber);

        assert.equal(tel.textContent, mockNumber,
                    'should got number 12349999 from Facebook');
        assert.isTrue(MockLazyL10n.get.called,
                    'should lazy load the localization library');
        assert.equal(telType.textContent, 'mobile',
                   'should localize the phone type');
        assert.isTrue(domSuggestionCount.classList.contains('more'),
                    '#suggestion-count should contain "more" style');
        assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
    });

    suite('#clear suggestions', function() {
      setup(function() {
        var enteredNumber = '1234';
        MockContacts.mResult = mockResult1;
        subject.update(enteredNumber);

        subject.clear();
      });

      test('should clear contents', function() {
        var tel = domSuggestionBar.querySelector('.js-tel');
        assert.equal(tel.textContent, '');
      });

      test('should hide suggestionBar', function() {
        assert.isTrue(domSuggestionBar.hidden);
      });
    });

    suite('#update suggestions - exact match', function() {
      var setupExactMatch = function() {
        var enteredNumber = '1234567890';

        MockContacts.mResult = mockResult1;
        MockFbContacts.mResult = [];
        subject.update(enteredNumber);
      };

      test('one SIM', function() {
        var mockNumber = '1234567890';
        var tel = domSuggestionBar.querySelector('.js-tel');

        setupExactMatch();

        assert.isFalse(domSuggestionBar.hidden,
                       'should not hide suggestionBar');
        assert.equal(tel.textContent, mockNumber);
      });

      test('two SIMs', function() {
        MockNavigatorMozIccManager.addIcc(1, {});
        setupExactMatch();

        assert.isTrue(domSuggestionBar.hidden, 'should hide suggestionBar');
      });
    });

  });

  suite('Suggestion List', function() {
    suite('show overlay', function() {
      var suggestions;
      setup(function() {
        MockContacts.mResult = mockResult2;
        subject.update('1111');

        subject.showOverlay();
        suggestions = Array.prototype.filter.call(subject.list.children,
          function(element) {
            return element.classList.contains('js-suggestion-item');
          });
      });

      test('overlay is displayed', function() {
        assert.isFalse(subject.overlay.hidden, 'should show suggestion list');
      });

      test('should have a cancel button as the last button', function() {
        var buttons = subject.list.children;
        var cancel = buttons[buttons.length - 1];
        assert.equal(cancel.id, 'suggestion-overlay-cancel');
      });

      test('should have 2 suggestions', function() {
        assert.equal(suggestions.length, 2);
      });

      test('each match is displayed in the proper order', function() {
        assert.equal(suggestions[0].querySelector('.js-name').textContent,
                     'John');
        assert.equal(suggestions[1].querySelector('.js-name').textContent,
                     'Mary');
      });

      test('each match has no id attribute', function() {
        suggestions.forEach(function(suggestion) {
          assert.equal(suggestion.id, '');
        });
      });

      test('each match has a si--action-menu class', function() {
        suggestions.forEach(function(suggestion) {
          assert.isTrue(suggestion.classList.contains('si--action-menu'));
        });
      });

      test('each match highlights the matching part', function() {
        suggestions.forEach(function(suggestion) {
          assert.equal(suggestion.querySelector('.si__mark').textContent,
                       '1111');
        });
      });

      suite('#hide overlay', function() {
        setup(function() {
          subject.hideOverlay();
        });

        test('should hide the overlay', function() {
          assert.isTrue(subject.overlay.hidden);
        });

        test('should remove all suggestions', function() {
          suggestions = Array.prototype.filter.call(subject.list.children,
            function(element) {
              return element.classList.contains('js-suggestion-item');
            });
          assert.equal(suggestions.length, 0);
        });
      });

    });

    test('#show overlay of all numbers of contact', function() {
      MockContacts.mResult = mockResult3;
      subject.update('1234');

      subject.showOverlay();

      assert.equal(
          subject.overlay.querySelector('#suggestion-list').childElementCount,
          4, 'should have 3 items + cancel button into overlay list');
      assert.isFalse(subject.overlay.hidden, 'should show suggestion list');
    });

    suite('#tap on suggestions list', function() {
      setup(function() {
        this.sinon.spy(MockCallHandler, 'call');
        this.sinon.spy(subject, 'hideOverlay');

        MockContacts.mResult = mockResult1;
        subject.update('1234');
      });

      test('with one SIM', function() {
        document.body.querySelector('.js-suggestion-item').click();
        sinon.assert.calledWith(MockCallHandler.call, '1234567890', 0);
      });

      test('with two SIMs', function() {
        MockNavigatorMozIccManager.addIcc(1, {});
        document.body.querySelector('.js-suggestion-item').click();

        sinon.assert.notCalled(MockCallHandler.call);
        sinon.assert.calledOnce(subject.hideOverlay);
      });
    });

  });
});
