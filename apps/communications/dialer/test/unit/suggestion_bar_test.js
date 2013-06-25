requireApp('communications/dialer/js/suggestion_bar.js');
requireApp('communications/shared/js/simple_phone_matcher.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_keypad.js');

if (!this.Contacts) {
  this.Contacts = null;
}

if (!this.LazyL10n) {
  this.LazyL10n = null;
}

if (!this.LazyLoader) {
  this.LazyLoader = null;
}

if (!this.KeypadManager) {
  this.KeypadManager = null;
}

suite('suggestion Bar', function() {
  var realContacts;
  var realLazyL10n;
  var realLazyLoader;
  var realKeypadManager;
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

  var triggerEvent = function(element, eventName) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  };

  setup(function() {
    subject = SuggestionBar;

    realContacts = window.Contacts;
    window.Contacts = MockContacts;

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

    realKeypadManager = window.KeypadManager;
    window.KeypadManager = MockKeypadManager;

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
    window.Contacts = realContacts;
    window.LazyLoader = realLazyLoader;
    window.LazyL10n = realLazyL10n;
    window.KeypadManager = realKeypadManager;
    document.body.removeChild(domSuggestionBar);
    document.body.removeChild(domOverlay);
  });
});
