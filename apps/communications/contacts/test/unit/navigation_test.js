'use strict';
/* global MockContactsIndexHtml */
/* global navigationStack */

require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_contacts_index.html.js');
requireApp('communications/contacts/js/navigation.js');

suite('contacts/navigation', function() {

  var navigation, viewContactList, viewContactForm, viewSettings,
    viewContactDetails, viewScreenshot, viewSelectTag, viewSearch,
    callbackCounter, callback, homeCallback, animationEndEvent,
    navigationAssert, initialStateAssert, currentViewAssert;


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
          navigationClass), result, test + ' wut ' + navigationClass + ' ' +
          view.id);
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
    currentViewAssert = function(previous, current) {
      var currentViews = document.querySelectorAll('.view.current');
      assert.equal(currentViews.length, 1, 'more than one |current| view');
      assert.equal(current, currentViews[0], 'expected ' + current.id +
        ' to be |current| view, but ' + currentViews[0].id + ' is instead.');
    };
    callback = function(done, current, next, transition, realNext) {
      initialStateAssert(current, next, transition);
      currentViewAssert(current, realNext || next);
      if (done) {
        done();
      }
    };
    callbackCounter = 0;
    homeCallback = function(done) {
      callbackCounter++;
      switch (callbackCounter) {
        case 1:
          // First back callback execution.
          initialStateAssert(viewSelectTag, viewContactForm, 'right-left');
          viewContactForm.dispatchEvent(animationEndEvent);
          viewContactDetails.dispatchEvent(animationEndEvent);
          break;
        case 2:
          // Second back callback execution.
          initialStateAssert(viewContactForm, viewContactDetails, 'popup');
          viewContactDetails.dispatchEvent(animationEndEvent);
          viewContactList.dispatchEvent(animationEndEvent);
          break;
        case 3:
          // Third back callback execution.
          initialStateAssert(viewContactDetails, viewContactList, 'go-deeper');
          currentViewAssert(viewContactDetails, viewContactList);
          callbackCounter = 0;
          done();
          break;
        }
      };
  });

  test('no forwards animation', function(done) {
    var transition = 'none';
    navigation.go('search-view', transition,
      callback.bind(null, done, viewContactList, viewSearch, transition));
    assert.isTrue(viewSearch.style.zIndex > viewContactList.style.zIndex);
  });

  test('no backwards animation', function(done) {
    var transition = 'none';
    navigation.go('search-view', transition,
      function () {
        callback(function () {}, viewContactList, viewSearch, transition);
        navigation.back(callback.bind(null, done, viewSearch,
          viewContactList, transition));
      });
  });

  test('right-left forwards animation', function(done) {
    var transition = 'right-left';
    navigation.go('view-select-tag', transition,
      callback.bind(null, done, viewContactList, viewSelectTag, transition));
    viewContactList.dispatchEvent(animationEndEvent);
    viewSelectTag.dispatchEvent(animationEndEvent);
  });

  test('right-left backwards animation', function(done) {
    var transition = 'right-left';
    navigation.go('view-select-tag', transition,
      function () {
        callback(function () {}, viewContactList, viewSelectTag, transition);
        navigation.back(callback.bind(null, done, viewSelectTag,
          viewContactList, transition));

        navigationAssert(viewSelectTag, transition, 'backwards', 'current',
          true, 'current view backwards classes');

        navigationAssert(viewContactList, transition, 'backwards', 'next',
          true, 'next view backwards classes');

        viewSelectTag.dispatchEvent(animationEndEvent);
        viewContactList.dispatchEvent(animationEndEvent);

      });

    viewContactList.dispatchEvent(animationEndEvent);
    viewSelectTag.dispatchEvent(animationEndEvent);
  });

  test('popup forwards animation', function(done) {
    var transition = 'popup';
    navigation.go('view-contact-form', transition,
      callback.bind(null, done, viewContactList, viewContactForm, transition));

    navigationAssert(viewContactList, transition, 'forwards', 'current',
      true, 'current view forwards classes');

    navigationAssert(viewContactForm, transition, 'forwards', 'next',
      true, 'next view forwards classes');

    viewContactList.dispatchEvent(animationEndEvent);
    viewContactForm.dispatchEvent(animationEndEvent);
  });

  test('popup backwards animation', function(done) {
    var transition = 'popup';
    navigation.go('view-contact-form', transition,
      function () {
        callback(function () {}, viewContactList, viewContactForm, transition);
        navigation.back(callback.bind(null, done, viewContactForm,
          viewContactList, transition));

        navigationAssert(viewContactForm, transition, 'backwards', 'current',
          true, 'current view backwards classes');

        navigationAssert(viewContactList, transition, 'backwards', 'next',
          true, 'next view backwards classes');

        viewContactForm.dispatchEvent(animationEndEvent);
        viewContactList.dispatchEvent(animationEndEvent);
      });

    viewContactList.dispatchEvent(animationEndEvent);
    viewContactForm.dispatchEvent(animationEndEvent);
  });

  test('go-deeper forwards animation', function(done) {
    var transition = 'go-deeper';
    navigation.go('view-contact-details', transition,
      callback.bind(null, done, viewScreenshot, viewContactDetails,
        transition));

    navigationAssert(viewScreenshot, transition, 'forwards', 'current',
      true, 'current view forwards classes');

    navigationAssert(viewContactDetails, transition, 'forwards', 'next',
      true, 'next view forwards classes');

    viewScreenshot.dispatchEvent(animationEndEvent);
    viewContactDetails.dispatchEvent(animationEndEvent);
  });

  test('go-deeper backwards animation', function(done) {
    var transition = 'go-deeper';
    navigation.go('view-contact-details', transition,
      function () {
        callback(function () {}, viewContactList, viewContactDetails,
          transition);
        navigation.back(callback.bind(null, done, viewContactDetails,
          viewScreenshot, transition, viewContactList));
        navigationAssert(viewContactDetails, transition, 'backwards', 'current',
          true, 'current view backwards classes');

        navigationAssert(viewScreenshot, transition, 'backwards', 'next',
          true, 'next view backwards classes');

        viewContactDetails.dispatchEvent(animationEndEvent);
        viewScreenshot.dispatchEvent(animationEndEvent);
      });

    viewContactList.dispatchEvent(animationEndEvent);
    viewContactDetails.dispatchEvent(animationEndEvent);
  });

  test('go-deeper-search forwards animation', function(done) {
    var transition = 'go-deeper-search';
    navigation.go('view-contact-details', transition,
      callback.bind(null, done, viewScreenshot, viewContactDetails,
        transition));

    navigationAssert(viewScreenshot, transition, 'forwards', 'current',
      true, 'current view forwards classes');

    navigationAssert(viewContactDetails, transition, 'forwards', 'next',
      true, 'next view forwards classes');

    viewScreenshot.dispatchEvent(animationEndEvent);
    viewContactDetails.dispatchEvent(animationEndEvent);
  });

  test('go-deeper-search backwards animation', function(done) {
    var transition = 'go-deeper-search';
    navigation.go('view-contact-details', transition,
      function () {
        callback(function () {}, viewScreenshot, viewContactDetails,
          transition);
        navigation.back(callback.bind(null, done, viewContactDetails,
          viewScreenshot, transition, viewContactList));

        navigationAssert(viewContactDetails, transition, 'backwards', 'current',
          true, 'current view backwards classes');

        navigationAssert(viewScreenshot, transition, 'backwards', 'next',
          true, 'next view backwards classes');

        viewContactDetails.dispatchEvent(animationEndEvent);
        viewScreenshot.dispatchEvent(animationEndEvent);
      });

    viewContactList.dispatchEvent(animationEndEvent);
    viewContactDetails.dispatchEvent(animationEndEvent);
  });

  test('undoing animations with home', function(done) {
    navigation.go('view-contact-details', 'go-deeper',
      function() {
        callback(null, viewContactList, viewContactDetails, 'go-deeper');
        navigation.go('view-contact-form', 'popup',
          function() {
            callback(null, viewContactDetails, viewContactForm, 'popup');
            navigation.go('view-select-tag', 'right-left',
              function() {
                callback(null, viewContactForm, viewSelectTag, 'right-left');
                assert.equal(navigation.stack.length, 4, 'initial stack');
                navigation.home(homeCallback.bind(null, done));
                viewSelectTag.dispatchEvent(animationEndEvent);
                viewContactForm.dispatchEvent(animationEndEvent);
              });
            viewContactForm.dispatchEvent(animationEndEvent);
            viewSelectTag.dispatchEvent(animationEndEvent);
          });
        viewContactDetails.dispatchEvent(animationEndEvent);
        viewContactForm.dispatchEvent(animationEndEvent);
      });
    viewContactList.dispatchEvent(animationEndEvent);
    viewContactDetails.dispatchEvent(animationEndEvent);
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
