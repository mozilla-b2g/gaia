'use strict';
/* global CORRECT_MATCHED_VALUE */
/* global dataImage */
/* global dupContacts */
/* global matchingDetailsData */
/* global MockMatchingContactsHtml */
/* global MocksHelper */
/* global MockImageLoader */
/* global MockMozL10n */
/* global MockURL */
/* global MatchingUI */

/* eslint-disable */

require('/shared/js/lazy_loader.js');
require('/shared/js/sanitizer.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');

requireApp('communications/contacts/test/unit/mock_matching_contacts.js.html');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/test/unit/' +
           'contacts_matching_ui_test_data.js');

requireApp('communications/contacts/views/matching/js/matching_ui.js');

if (!window.ImageLoader) {
  window.ImageLoader = null;
}

var mocksHelperForContactMatchingUI = new MocksHelper([
  'ContactPhotoHelper'
]).init();

suite('MatchingUI', function() {

  mocksHelperForContactMatchingUI.attachTestHelpers();

  var wrapper = null,
    realImageLoader, realURL, list, matchingDetails, matchingName, matchingImg,
    matchingDetailList, mergeAction, realL10n;

  var masterContact = {
    givenName: ['Manolo'],
    familyName: ['García']
  };

  function checkItem(item, contact) {
    var bdiNodes = item.querySelectorAll('bdi');

    // Given and family names are displayed fine
    assert.equal(
      bdiNodes[0].textContent,
      contact.givenName[0] + ' ' + contact.familyName[0]
    );

    // The second bdi node is the main reason for matching
    // The current preference is tel, email and name
    // Check in selectMainReason() of contacts_matching_ui.js
    assert.equal(bdiNodes[1].textContent, CORRECT_MATCHED_VALUE);

    // The image is ready for the image loader
    assert.isTrue(item.querySelector('img').dataset.src == dataImage);

    // At the beginning the contact is checked by default
    assert.isTrue(item.querySelector('input[type="checkbox"]').checked);
  }

  suiteSetup(function() {
    realImageLoader = window.ImageLoader;
    realURL = window.URL || {};
    realL10n = window.navigator.mozL10n;

    window.ImageLoader = MockImageLoader;
    window.URL = MockURL;
    window.navigator.mozL10n = MockMozL10n;

    wrapper = document.createElement('section');
    wrapper.innerHTML = MockMatchingContactsHtml;
    document.body.appendChild(wrapper);
    MatchingUI.init();
    list = wrapper.querySelector('#contacts-list-container ol');
    mergeAction = wrapper.querySelector('#merge-action');
  });

  suiteTeardown(function() {
    window.ImageLoader = realImageLoader;
    window.URL = realURL;
    window.navigator.mozL10n = realL10n;
    document.body.removeChild(wrapper);
  });

  test('The UI is initialized correctly ', function(done) {
    window.addEventListener('UIReady', function fn() {
      window.removeEventListener('UIReady', fn);
      // The merge button is initially enabled because there are some duplicate
      // contacts
      assert.isFalse(mergeAction.disabled);

      // The message is displayed correctly
      var l10nAttrs = navigator.mozL10n.getAttributes(
        wrapper.querySelector('#duplicate-msg > p'));
      assert.deepEqual(l10nAttrs.args.name, 'Manolo García');

      // Duplicate contacts list is displayed correctly
      var dupContactsKeys = Object.keys(dupContacts);

      assert.equal(list.children.length, dupContactsKeys.length);
      dupContactsKeys.forEach(function(id) {
        checkItem(list.querySelector('li[data-uuid="' + id + '"]'),
                  dupContacts[id].matchingContact);
      });
      done();
    });

    MatchingUI.load('matching', masterContact, dupContacts);
  });

  test('Users are able to un-select contacts ', function(done) {
    var firstItem = list.querySelector('li[data-uuid="1a"]');
    var checkbox = firstItem.querySelector('input[type="checkbox"]');
    assert.isTrue(checkbox.checked);
    firstItem.click();
    setTimeout(function() {
      assert.isFalse(checkbox.checked);
      // After un-selecting a contact the merge button is enabled because
      // there are two selected
      assert.isFalse(mergeAction.disabled);
      done();
    });
  });

  test('Users are able to select contacts ', function(done) {
    var firstItem = list.querySelector('li[data-uuid="1a"]');
    var checkbox = firstItem.querySelector('input[type="checkbox"]');
    assert.isFalse(checkbox.checked);
    firstItem.click();
    setTimeout(function() {
      assert.isTrue(checkbox.checked);
      // After selecting this contact the merge button is enabled because
      // there are three selected
      assert.isFalse(mergeAction.disabled);
      done();
    });
  });

  test('Merge button throws an event ', function(done) {
    // We are un-selecting the two first ones
    list.querySelector('li[data-uuid="1a"]').click();
    list.querySelector('li[data-uuid="2b"]').click();

    window.addEventListener('merge', function(evt) {
      assert.equal(Object.keys(evt.detail.checkedContacts).length, 1);
      done();
    });

    mergeAction.click();
  });

  suite('duplicate contact details', function() {
    var observerConfig = {
      attributes: true,
      attributeFilter: ['class']
    };

    setup(function(done) {
      document.body.removeChild(wrapper);
      wrapper.innerHTML = MockMatchingContactsHtml;
      document.body.appendChild(wrapper);
      MatchingUI.init();
      matchingDetails = wrapper.querySelector('#matching-details');
      matchingName = matchingDetails.querySelector('figcaption');
      matchingImg = matchingDetails.querySelector('img');
      matchingDetailList = matchingDetails.querySelector('#matching-list');
      // Add a photo to the matching contact with id 'user_id_1'.
      matchingDetailsData.user_id_1.matchingContact.photo[0] =
        matchingImg.src;

      window.addEventListener('UIReady', function fn() {
        window.removeEventListener('UIReady', fn);
        done();
      });
      MatchingUI.load('matching', masterContact, matchingDetailsData);
    });

    test('should show the duplicate contact details overlay', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        assert.isFalse(matchingDetails.classList.contains('hide'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the duplicate contact name and highlight it',
         function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        assert.equal(matchingName.textContent, 'The Name The Surname');
        assert.isTrue(matchingName.classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the duplicate contact name but not highlight it',
         function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        assert.equal(matchingName.textContent, 'The Name Another Surname');
        assert.isFalse(matchingName.classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_2');
    });

    test('should show the duplicate contact image', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        assert.isFalse(matchingImg.classList.contains('hide'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should hide the duplicate contact image', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        assert.isTrue(matchingImg.classList.contains('hide'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      // 'user_id_2' has no photo.
      MatchingUI.displayMatchingDetails('user_id_2');
    });

    test('should show the phone number but not highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        var l10nAttrs = navigator.mozL10n.getAttributes(listItems[0]);
        assert.deepEqual(l10nAttrs.args, {
          'label': 'type_1',
          'item': '111111111'
        });
        assert.isFalse(listItems[0].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the phone number and highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        var l10nAttrs = navigator.mozL10n.getAttributes(listItems[1]);
        assert.deepEqual(l10nAttrs.args, {
          'label': 'type_2',
          'item': '222222222'
        });
        assert.isTrue(listItems[1].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the email but not highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        var l10nAttrs = navigator.mozL10n.getAttributes(listItems[2]);
        assert.deepEqual(l10nAttrs.args, {
          'label': 'email_type_1',
          'item': 'email_1@acme.com'
        });
        assert.isFalse(listItems[2].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the email and highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        var l10nAttrs = navigator.mozL10n.getAttributes(listItems[3]);
        assert.deepEqual(l10nAttrs.args, {
          'label': 'email_type_2',
          'item': 'email_2@acme.com'
        });
        assert.isTrue(listItems[3].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      MatchingUI.displayMatchingDetails('user_id_1');
    });
  });
});
