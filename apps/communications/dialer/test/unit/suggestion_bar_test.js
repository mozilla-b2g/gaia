'use strict';

requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_keypad.js');

requireApp('communications/dialer/js/suggestion_bar.js');
requireApp('communications/shared/js/simple_phone_matcher.js');
require('/shared/test/unit/mocks/mock_fb_data_reader.js');

var mocksHelperForSuggestionBar = new MocksHelper([
  'Contacts',
  'LazyL10n',
  'LazyLoader',
  'KeypadManager'
]).init();

var realFbContacts;

if (!this.fb) {
  this.fb = null;
}

suite('suggestion Bar', function() {
  mocksHelperForSuggestionBar.attachTestHelpers();

  suiteSetup(function() {
    window.fb = window.fb || {};
    realFbContacts = window.fb.contacts;
    window.fb.contacts = MockFbContacts;
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
        { type: 'home',
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


  var triggerEvent = function(element, eventName) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  };

  setup(function() {
    subject = SuggestionBar;

    domSuggestionBar = document.createElement('section');
    domSuggestionBar.id = 'suggestion-bar';
    domSuggestionBar.innerHTML =
      '<div id="suggestion-count"></div>' +
      '<div class="suggestion-item">' +
      '  <div class="name"></div>' +
      '  <div class="tel-type"></div>' +
      '  <div class="tel"><span class="matched"></span></div>' +
      '</div>';
    document.body.appendChild(domSuggestionBar);
    domOverlay = document.createElement('form');
    domOverlay.id = 'suggestion-overlay';
    domOverlay.innerHTML =
      '<header></header>' +
      '<menu>' +
        '<ul id="suggestion-list" role="listbox">' +
        '</ul>' +
        '<button id="suggestion-overlay-cancel">Cancel</button>' +
        '<li class="suggestion-item" id="suggestion-item-template" hidden>' +
          '<div class="name"></div>' +
          '<div class="tel-type"></div>' +
          '<div class="tel"><span class="matched"></span></div>' +
        '</li>' +
      '</menu>';
    document.body.appendChild(domOverlay);
    domSuggestionCount = domSuggestionBar.querySelector('#suggestion-count');

    subject.overlay = domOverlay;
    subject.bar = domSuggestionBar;
    subject.countTag = document.getElementById('suggestion-count');
    subject.list = document.getElementById('suggestion-list');
    subject.overlayCancel =
        document.getElementById('suggestion-overlay-cancel');
    subject.init();
  });

  test('#update suggestions by contact data - 1 data', function() {
    var mockNumber = '1234567890';
    var enteredNumber = '1234';
    var tel = domSuggestionBar.querySelector('.tel');

    MockContacts.mResult = mockResult1;
    subject.update(enteredNumber);

    assert.equal(tel.textContent, mockNumber,
                'should got number 1234567890 from mozContact');
    assert.isFalse(domSuggestionCount.classList.contains('more'),
                '#suggestion-count shouldn\'t contain "more" style');
    assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
  });

  test('#update suggestions by contact data - 2 datas', function() {
    var mockNumber = '111111111';
    var enteredNumber = '1111';
    var tel = domSuggestionBar.querySelector('.tel');

    MockContacts.mResult = mockResult2;
    subject.update(enteredNumber);

    assert.equal(tel.textContent, mockNumber,
                'should got number 111111111 from mozContact');
    assert.isTrue(domSuggestionCount.classList.contains('more'),
                '#suggestion-count should contain "more" style');
    assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
  });

  test('#update suggestions by contact data - 0 local data - 1 FB data',
    function() {
      var mockNumber = '12349999';
      var enteredNumber = '1234';
      var tel = domSuggestionBar.querySelector('.tel');

      MockContacts.mResult = [];
      MockFbContacts.mResult = mockResultFb.slice(0, 1);
      subject.update(enteredNumber);

      assert.equal(tel.textContent, mockNumber,
                  'should got number 12349999 from Facebook');
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
      var tel = domSuggestionBar.querySelector('.tel');

      MockContacts.mResult = mockResult1;
      MockFbContacts.mResult = mockResultFb.slice(0, 1);
      subject.update(enteredNumber);

      assert.equal(tel.textContent, mockNumber,
                  'should got number 1234567890 from mozContact');
      assert.isTrue(domSuggestionCount.classList.contains('more'),
                  '#suggestion-count should contain "more" style');
      assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
  });

  test('#update suggestions by contact data - 0 local data - 2 FB data',
    function() {
      var mockNumber = '12349999';
      var enteredNumber = '1234';
      var tel = domSuggestionBar.querySelector('.tel');

      MockContacts.mResult = [];
      MockFbContacts.mResult = mockResultFb;
      subject.update(enteredNumber);

      assert.equal(tel.textContent, mockNumber,
                  'should got number 12349999 from Facebook');
      assert.isTrue(domSuggestionCount.classList.contains('more'),
                  '#suggestion-count should contain "more" style');
      assert.isFalse(domSuggestionBar.hidden, 'should show suggestionBar');
  });

  test('#clear suggestions', function() {
    var tel = domSuggestionBar.querySelector('.tel');

    subject.clear();

    assert.equal(tel.textContent, '', 'should clear contents');
    assert.isTrue(domSuggestionBar.hidden, 'should hide suggestionBar');
  });

  test('#show overlay', function() {
    SuggestionBar._contactList = mockResult2;
    SuggestionBar._phoneNumber = '1111';
    SuggestionBar._allMatched = SuggestionBar._getAllMatched(mockResult2);
    subject.showOverlay();

    assert.equal(
        subject.overlay.querySelector('#suggestion-list').childElementCount, 2,
        'should add 2 items into overlay list');
    assert.isTrue(subject.overlay.classList.contains('display'),
        'should show suggestion list');
  });

  test('#show overlay of all numbers of contact', function() {
    SuggestionBar._contactList = mockResult3;
    SuggestionBar._phoneNumber = '1234';
    SuggestionBar._allMatched = SuggestionBar._getAllMatched(mockResult3);
    subject.showOverlay();

    assert.equal(
        subject.overlay.querySelector('#suggestion-list').childElementCount, 3,
        'should add 3 items into overlay list');
    assert.isTrue(subject.overlay.classList.contains('display'),
        'should show suggestion list');

  });

  test('#hide overlay', function() {
    subject.hideOverlay();
    assert.equal(
        subject.overlay.querySelector('#suggestion-list').childElementCount, 0,
        'should remove all items from suggestion list');
    assert.isFalse(subject.overlay.classList.contains('display'),
        'should hide suggestion list');
  });

  test('#tap on suggestion list', function(done) {
    var item = document.createElement('li');
    item.className = 'suggestion-item';
    item.innerHTML =
          '<span class="tel">3434<span class="matched">343</span>434</span>';
    subject.list.appendChild(item);

    window.KeypadManager.mOnMakeCall = function(number) {
      assert.equal(number, '3434343434',
        'Should make call through KeypadManager for number 3434343434');
      done();
    };
    triggerEvent(item, 'click');
  });

  teardown(function() {
    document.body.removeChild(domSuggestionBar);
    document.body.removeChild(domOverlay);
  });

  suiteTeardown(function() {
    window.fb.contacts = realFbContacts;
  });
});
