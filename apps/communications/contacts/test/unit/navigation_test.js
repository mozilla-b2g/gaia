require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_contacts_index.html.js');
requireApp('communications/contacts/js/navigation.js');

suite('contacts/navigation', function() {

  var current, next, navigation, viewContactList, viewContactForm,
    viewSettings, viewContactDetails, viewScreenshot, viewSelectTag,
    viewSearch, callbackCounter, callback, animationEndEvent,
    navigationAssert, initialStateAssert, currentTransition;


  suiteSetup(function() {
    document.body.innerHTML = MockContactsIndexHtml;
    navigation = new navigationStack('view-contacts-list');
    viewContactList = document.getElementById('view-contacts-list');
    viewContactForm = document.getElementById('view-contact-form');
    viewSettings = document.getElementById('view-settings');
    viewContactDetails = document.getElementById('view-contact-details');
    viewScreenshot = document.getElementById('view-screenshot');
    viewSelectTag = document.getElementById('view-select-tag');
    viewSearch = document.getElementById('search-view');
    animationEndEvent = new CustomEvent('animationend');
    navigationAssert = function(view, transition, direction, viewType,
      result, test) {
      var navigationClass =
        navigation.transitions[transition][direction][viewType];
      if (navigationClass) {
        assert.equal(view.classList.contains(
          navigationClass), result, test
        );
      }
    };
    initialStateAssert = function(current, next, transition) {
      navigationAssert(current, transition, 'forwards', 'next',
        false, 'current view forwards classes once animation ends');

      navigationAssert(current, transition, 'backwards', 'current',
        false, 'current view backwards classes once animation ends');

      navigationAssert(next, transition, 'forwards', 'current',
        false, 'next view forwards classes once animation ends');

      navigationAssert(next, transition, 'backwards', 'next',
        false, 'next view backwards classes once animation ends');
    };
    callbackCounter = 0;
    callback = function(done) {
      switch (currentTransition) {
        case 'none':
          done();
          break;
        case 'right-left':
          current = viewSelectTag;
          next = viewContactList;
          initialStateAssert(current, next, currentTransition);
          done();
          break;
        case 'popup':
          current = viewContactList;
          next = viewContactForm;
          initialStateAssert(current, next, currentTransition);
          done();
          break;
        case 'go-deeper':
          current = viewContactDetails;
          next = viewScreenshot;
          initialStateAssert(current, next, currentTransition);
          done();
          break;
        case 'go-deeper-search':
          current = viewContactDetails;
          next = viewScreenshot;
          initialStateAssert(current, next, currentTransition);
          done();
          break;
        case 'home':
          callbackCounter++;
          switch (callbackCounter) {
            case 1:
              // First back callback execution.
              current = viewSelectTag;
              next = viewContactForm;
              initialStateAssert(current, next, 'right-left');
              current = viewContactForm;
              next = viewContactDetails;
              current.dispatchEvent(animationEndEvent);
              next.dispatchEvent(animationEndEvent);
              break;
            case 2:
              // Second back callback execution.
              current = viewContactForm;
              next = viewContactDetails;
              initialStateAssert(current, next, 'popup');
              current = viewContactDetails;
              next = viewContactList;
              current.dispatchEvent(animationEndEvent);
              next.dispatchEvent(animationEndEvent);
              break;
            case 3:
              // Third back callback execution.
              current = viewContactDetails;
              next = viewContactList;
              initialStateAssert(current, next, 'go-deeper');
              callbackCounter = 0;
              done();
              break;
          }
          break;
      }
    };
  });

  test('no forwards animation', function() {
    currentTransition = 'none';
    current = viewContactList;
    next = viewSearch;
    navigation.go('search-view', currentTransition);
    assert.isTrue(next.style.zIndex > current.style.zIndex);
  });

  test('no backwards animation', function(done) {
    currentTransition = 'none';
    current = viewContactList;
    next = viewSearch;
    navigation.go('search-view', currentTransition);
    navigation.back(callback.bind(null, done));
  });

  test('right-left forwards animation', function() {
    currentTransition = 'right-left';
    current = viewContactList;
    next = viewSelectTag;
    navigation.go('view-select-tag', currentTransition);

    navigationAssert(current, currentTransition, 'forwards', 'current',
      true, 'current view forwards classes');

    navigationAssert(next, currentTransition, 'forwards', 'next',
      true, 'next view forwards classes');
  });

  test('right-left backwards animation', function(done) {
    currentTransition = 'right-left';
    current = viewSelectTag;
    next = viewContactList;
    navigation.go('view-select-tag', currentTransition);
    navigation.back(callback.bind(null, done));

    navigationAssert(current, currentTransition, 'backwards', 'current',
      true, 'current view backwards classes');

    navigationAssert(next, currentTransition, 'backwards', 'next',
      true, 'next view backwards classes');

    current.dispatchEvent(animationEndEvent);
    next.dispatchEvent(animationEndEvent);
  });

  test('popup forwards animation', function() {
    currentTransition = 'popup';
    current = viewContactList;
    next = viewContactForm;
    navigation.go('view-contact-form', currentTransition);

    navigationAssert(current, currentTransition, 'forwards', 'current',
      true, 'current view forwards classes');

    navigationAssert(next, currentTransition, 'forwards', 'next',
      true, 'next view forwards classes');
  });

  test('popup backwards animation', function(done) {
    currentTransition = 'popup';
    current = viewContactForm;
    next = viewContactList;
    navigation.go('view-contact-form', currentTransition);
    navigation.back(callback.bind(null, done));

    navigationAssert(current, currentTransition, 'backwards', 'current',
      true, 'current view backwards classes');

    navigationAssert(next, currentTransition, 'backwards', 'next',
      true, 'next view backwards classes');

    current.dispatchEvent(animationEndEvent);
    next.dispatchEvent(animationEndEvent);
  });

  test('go-deeper forwards animation', function() {
    currentTransition = 'go-deeper';
    current = viewScreenshot;
    next = viewContactDetails;
    navigation.go('view-contact-details', currentTransition);

    navigationAssert(current, currentTransition, 'forwards', 'current',
      true, 'current view forwards classes');

    navigationAssert(next, currentTransition, 'forwards', 'next',
      true, 'next view forwards classes');
  });

  test('go-deeper backwards animation', function(done) {
    currentTransition = 'go-deeper';
    current = viewContactDetails;
    next = viewScreenshot;
    navigation.go('view-contact-details', currentTransition);
    navigation.back(callback.bind(null, done));

    navigationAssert(current, currentTransition, 'backwards', 'current',
      true, 'current view backwards classes');

    navigationAssert(next, currentTransition, 'backwards', 'next',
      true, 'next view backwards classes');

    current.dispatchEvent(animationEndEvent);
    next.dispatchEvent(animationEndEvent);
  });

  test('go-deeper-search forwards animation', function() {
    currentTransition = 'go-deeper-search';
    current = viewScreenshot;
    next = viewContactDetails;
    navigation.go('view-contact-details', currentTransition);

    navigationAssert(current, currentTransition, 'forwards', 'current',
      true, 'current view forwards classes');

    navigationAssert(next, currentTransition, 'forwards', 'next',
      true, 'next view forwards classes');
  });

  test('go-deeper-search backwards animation', function(done) {
    currentTransition = 'go-deeper-search';
    current = viewContactDetails;
    next = viewScreenshot;
    navigation.go('view-contact-details', currentTransition);
    navigation.back(callback.bind(null, done));

    navigationAssert(current, currentTransition, 'backwards', 'current',
      true, 'current view backwards classes');

    navigationAssert(next, currentTransition, 'backwards', 'next',
      true, 'next view backwards classes');

    current.dispatchEvent(animationEndEvent);
    next.dispatchEvent(animationEndEvent);
  });

  test('undoing animations with home', function(done) {
    currentTransition = 'home';
    navigation.go('view-contact-details', 'go-deeper');
    navigation.go('view-contact-form', 'popup');
    navigation.go('view-select-tag', 'right-left');

    assert.equal(navigation.stack.length, 4, 'initial stack');

    navigation.home(callback.bind(null, done));
    assert.equal(navigation.stack.length, 1, 'final stack');

    current = viewSelectTag;
    next = viewContactForm;
    current.dispatchEvent(animationEndEvent);
    next.dispatchEvent(animationEndEvent);
  });

  test('should send hide-navbar to dialer when entering view-contact-form',
  function() {
    var postMessageSpy = this.sinon.spy(window.parent, 'postMessage');
    navigation.go('view-contact-form', 'go-deeper');
    assert.isTrue(postMessageSpy.withArgs({type: 'hide-navbar'}).calledOnce);
  });

  test('should send show-navbar to dialer when leaving view-contact-form',
  function() {
    navigation.go('view-contact-form', 'go-deeper');
    var postMessageSpy = this.sinon.spy(window.parent, 'postMessage');
    navigation.back();
    assert.isTrue(postMessageSpy.withArgs({type: 'show-navbar'}).calledOnce);
  });
});
