/* globals LazyLoader, MockCallHandler, MockContacts, MockFbContacts,
           MockL10n, MockNavigatorMozIccManager, MockUtils, MocksHelper,
           SuggestionBar, SimSettingsHelper */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/dialer/test/unit/mock_call_handler.js');
// FIXME : This should be a mock
require('/shared/js/simple_phone_matcher.js');
require('/shared/test/unit/mocks/mock_fb_data_reader.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/sanitizer.js');

require('/dialer/js/suggestion_bar.js');

var mocksHelperForSuggestionBar = new MocksHelper([
  'Contacts',
  'LazyLoader',
  'KeypadManager',
  'CallHandler',
  'SimSettingsHelper',
  'Utils'
]).init();

suite('suggestion Bar', function() {
  var realFbContacts;
  var realMozIccManager;
  var realMozL10n;

  mocksHelperForSuggestionBar.attachTestHelpers();

  suiteSetup(function() {
    window.fb = window.fb || {};
    realFbContacts = window.fb.contacts;
    window.fb.contacts = MockFbContacts;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

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

    loadBodyHTML('/shared/elements/contacts/contact_in_overlay.html');
    var suggestionItemTemplate = document.body.querySelector('template');

    loadBodyHTML('/shared/elements/contacts/contact_list_overlay.html');
    var suggestionOverlayTemplate = document.body.querySelector('template');

    domSuggestionBar = document.createElement('section');
    domSuggestionBar.id = 'suggestion-bar';
    domSuggestionBar.classList.add('hide');
    domSuggestionBar.innerHTML =
      `<div id="suggestion-count" class="more"></div>
       <div is="contact-in-overlay"
         class="js-suggestion-item contact-item"></div>`;
    document.body.appendChild(domSuggestionBar);
    var suggestionItem = document.querySelector('.js-suggestion-item');
    suggestionItem.innerHTML = '';
    suggestionItem.appendChild(suggestionItemTemplate.content.cloneNode(true));

    var domSuggestionItem = document.createElement('button');
    domSuggestionItem.id = 'contact-in-overlay-template';
    domSuggestionItem.setAttribute('role', 'button');
    domSuggestionItem.setAttribute('is', 'contact-in-overlay');
    domSuggestionItem.classList.add('js-suggestion-item', 'contact-item',
      'bb-button');
    domSuggestionItem.hidden = true;
    document.body.appendChild(domSuggestionItem);
    domSuggestionItem.innerHTML = '';
    domSuggestionItem.appendChild(
      suggestionItemTemplate.content.cloneNode(true));

    domOverlay = document.createElement('form');
    domOverlay.id = 'contact-list-overlay';
    domOverlay.setAttribute('is', 'contact-list-overlay');
    domOverlay.setAttribute('role', 'dialog');
    domOverlay.dataset.type = 'action';
    domOverlay.classList.add('overlay');
    domOverlay.setAttribute('aria-hidden', 'true');
    domOverlay.innerHTML = '';
    domOverlay.appendChild(suggestionOverlayTemplate.content.cloneNode(true));
    document.body.appendChild(domOverlay);

    domSuggestionCount = domSuggestionBar.querySelector('#suggestion-count');

    subject.overlay = domOverlay;
    subject.bar = domSuggestionBar;
    subject.countTag = document.getElementById('suggestion-count');
    subject.list = document.getElementById('contact-list');
    subject.overlayCancel =
        document.getElementById('contact-list-overlay-cancel');
    subject.init();

    this.sinon.spy(MockL10n, 'setAttributes');

    MockContacts.mTearDown();
    MockFbContacts.mTeardown();
  });

  teardown(function() {
    document.body.removeChild(domSuggestionBar);
    document.body.removeChild(domOverlay);

    MockNavigatorMozIccManager.mTeardown();
  });

  suiteTeardown(function() {
    window.fb.contacts = realFbContacts;
    navigator.mozL10n = realMozL10n;

    navigator.mozIccManager = realMozIccManager;
  });

  var cloneMockContactResults = function(count) {
    MockContacts.mResult = new Array(count);
    for (var i = 0; i < MockContacts.mResult.length; i++) {
      MockContacts.mResult[i] = mockResult1[0];
    }
  };

  suite('Suggestion Bar', function() {
    var tel;
    var telType;

    setup(function() {
      tel = domSuggestionBar.querySelector('.js-tel');
      telType = domSuggestionBar.querySelector('.js-tel-type');
    });

    test('#update suggestions by contact data - 1 data', function() {
      var mockNumber = '1234567890';
      var enteredNumber = '1234';

      sinon.spy(telType, 'removeAttribute');

      MockContacts.mResult = mockResult1;
      subject.update(enteredNumber);

      assert.equal(tel.textContent, mockNumber,
                  'should got number 1234567890 from mozContact');
      sinon.assert.notCalled(MockL10n.setAttributes);
      sinon.assert.calledWith(telType.removeAttribute, 'data-l10n-id');
      assert.equal(telType.textContent, 'my-custom-type',
                   'should default to the type string when there is no ' +
                   'localization');
      assert.isFalse(domSuggestionCount.classList.contains('more'),
                  '#suggestion-count shouldn\'t contain "more" style');
      assert.isFalse(domSuggestionBar.classList.contains('hide'));
    });

    test('#update suggestions by contact data - 2 datas', function() {
      var mockNumber = '111111111';
      var enteredNumber = '1111';

      this.sinon.stub(MockUtils, 'isPhoneType').returns(true);
      MockContacts.mResult = mockResult2;
      subject.update(enteredNumber);

      assert.equal(tel.textContent, mockNumber,
                  'should got number 111111111 from mozContact');
      sinon.assert.calledWith(MockL10n.setAttributes, telType, 'mobile');
      assert.isTrue(domSuggestionCount.classList.contains('more'),
                  '#suggestion-count should contain "more" style');
      assert.isFalse(domSuggestionBar.classList.contains('hide'));
    });

    test('#update suggestions by contact data - 0 local data - 1 FB data',
      function() {
        var mockNumber = '12349999';
        var enteredNumber = '1234';

        this.sinon.stub(MockUtils, 'isPhoneType').returns(true);
        MockContacts.mResult = [];
        MockFbContacts.mResult = mockResultFb.slice(0, 1);
        subject.update(enteredNumber);

        assert.equal(tel.textContent, mockNumber,
                    'should got number 12349999 from Facebook');
        sinon.assert.calledWith(MockL10n.setAttributes, telType, 'mobile');
        assert.isFalse(domSuggestionCount.classList.contains('more'),
                    '#suggestion-count should not contain "more" style');
        assert.isFalse(domSuggestionBar.classList.contains('hide'));

        assert.equal(SuggestionBar._contactList.length, 1,
                     '_contactList.length should be 1');
    });

    test('#update suggestions by contact data - 1 local data - 1 FB data',
      function() {
        var mockNumber = '1234567890';
        var enteredNumber = '1234';

        sinon.spy(telType, 'removeAttribute');

        MockContacts.mResult = mockResult1;
        MockFbContacts.mResult = mockResultFb.slice(0, 1);
        subject.update(enteredNumber);

        assert.equal(tel.textContent, mockNumber,
                    'should got number 1234567890 from mozContact');
        sinon.assert.notCalled(MockL10n.setAttributes);
        sinon.assert.calledWith(telType.removeAttribute, 'data-l10n-id');
        assert.equal(telType.textContent, 'my-custom-type',
                   'should default to the type string when there is no ' +
                   'localization');
        assert.isTrue(domSuggestionCount.classList.contains('more'),
                    '#suggestion-count should contain "more" style');
        assert.isFalse(domSuggestionBar.classList.contains('hide'));
    });

    test('#update suggestions by contact data - 0 local data - 2 FB data',
      function() {
        var mockNumber = '12349999';
        var enteredNumber = '1234';

        this.sinon.stub(MockUtils, 'isPhoneType').returns(true);
        MockContacts.mResult = [];
        MockFbContacts.mResult = mockResultFb;
        subject.update(enteredNumber);

        assert.equal(tel.textContent, mockNumber,
                    'should got number 12349999 from Facebook');
        sinon.assert.calledWith(MockL10n.setAttributes, telType, 'mobile');
        assert.isTrue(domSuggestionCount.classList.contains('more'),
                    '#suggestion-count should contain "more" style');
        assert.isFalse(domSuggestionBar.classList.contains('hide'));
    });

    test('#update suggestions by contact data - 50 local data - 0 FB data',
      function() {
        var enteredNumber = '1234';
        cloneMockContactResults(50);
        subject.update(enteredNumber);

        assert.isFalse(domSuggestionBar.classList.contains('hide'));
    });

    test('#update suggestions by contact data - 51 local data - 0 FB data',
      function() {
        var enteredNumber = '1234';
        cloneMockContactResults(51);
        subject.update(enteredNumber);

        assert.isTrue(domSuggestionBar.classList.contains('hide'));
    });

    test('#update suggestions by contact data - 50 local data - 1 FB data',
      function() {
        var enteredNumber = '1234';
        cloneMockContactResults(50);
        MockFbContacts.mResult = mockResultFb.slice(0, 1);
        subject.update(enteredNumber);

        assert.isTrue(domSuggestionBar.classList.contains('hide'));
    });

    suite('#clear suggestions', function() {
      setup(function() {
        var enteredNumber = '1234';
        MockContacts.mResult = mockResult1;
        subject.update(enteredNumber);

        subject.clear();
      });

      test('should clear contents', function() {
        assert.equal(tel.textContent, '');
      });

      test('should hide suggestionBar', function() {
        assert.isTrue(domSuggestionBar.classList.contains('hide'));
      });

      test('should not try to localize anything', function() {
        sinon.assert.notCalled(MockL10n.setAttributes);
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

        setupExactMatch();

        assert.isFalse(domSuggestionBar.classList.contains('hide'));
        assert.equal(tel.textContent, mockNumber);
      });

      test('two SIMs', function() {
        MockNavigatorMozIccManager.addIcc(1, {});
        setupExactMatch();

        assert.isTrue(domSuggestionBar.classList.contains('hide'));
      });
    });

  });

  suite('Suggestion List', function() {
    suite('show overlay', function() {
      var suggestions;

      var getSuggestions = function() {
        suggestions = Array.prototype.filter.call(subject.list.children,
          function(element) {
            return element.classList.contains('js-suggestion-item');
          });
      };

      setup(function() {
        MockContacts.mResult = mockResult2;
        subject.update('1111');

        this.sinon.spy(LazyLoader, 'load');
        this.sinon.stub(MockUtils, 'isPhoneType').returns(true);
        MockL10n.setAttributes.reset();

        subject.showOverlay();
        getSuggestions();
      });

      test('should load the overlay', function() {
        sinon.assert.calledWith(LazyLoader.load, domOverlay);
      });

      test('overlay is displayed', function() {
        assert.equal(subject.overlay.getAttribute('aria-hidden'), 'false');
        assert.isTrue(subject.overlay.classList.contains('display'));
      });

      test('should have a cancel button as the last button', function() {
        var buttons = subject.list.children;
        var cancel = buttons[buttons.length - 1];
        assert.equal(cancel.id, 'contact-list-overlay-cancel');
      });

      test('should have 2 suggestions', function() {
        assert.equal(suggestions.length, 2);
      });

      test('should call mozL10n.setAttributes with correct arguments',
      function() {
        // _fillContacts() calls two more times
        sinon.assert.calledThrice(MockL10n.setAttributes);
        assert.equal(MockL10n.setAttributes.getCall(1).args[1], 'mobile');
        assert.equal(MockL10n.setAttributes.getCall(2).args[1], 'mobile');
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

      test('each match has a ci--action-menu class', function() {
        suggestions.forEach(function(suggestion) {
          assert.isTrue(suggestion.classList.contains('ci--action-menu'));
        });
      });

      test('each match highlights the matching part', function() {
        suggestions.forEach(function(suggestion) {
          assert.equal(suggestion.querySelector('.ci__mark').textContent,
                       '1111');
        });
      });

      suite('high load', function() {
        test('should show 50 suggestions', function() {
          cloneMockContactResults(50);
          subject.update('1234');
          subject.showOverlay();
          getSuggestions();

          assert.equal(suggestions.length, 50);
        });

        test('should show 50 suggestions with 1 FB contact', function() {
          cloneMockContactResults(49);
          MockFbContacts.mResult = mockResultFb.slice(0, 1);
          subject.update('1234');
          subject.showOverlay();
          getSuggestions();

          assert.equal(suggestions.length, 50);
        });
      });
    });

    suite('hide overlay', function() {
      setup(function() {
        subject.hideOverlay();
      });

      test('should hide the overlay', function() {
        assert.equal(subject.overlay.getAttribute('aria-hidden'), 'true');
        assert.isFalse(subject.overlay.classList.contains('display'));
      });
    });

    test('#show overlay of all numbers of contact', function() {
      MockContacts.mResult = mockResult3;
      subject.update('1234');

      subject.showOverlay();

      assert.equal(
          subject.overlay.querySelector('#contact-list').childElementCount,
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

      [0, 1].forEach(function(ci) {
        test('with one SIM in slot ' + ci, function() {
          SimSettingsHelper._defaultCards.outgoingCall = ci;
          document.body.querySelector('.js-suggestion-item').click();
          sinon.assert.calledWith(MockCallHandler.call, '1234567890', ci);
        });
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
