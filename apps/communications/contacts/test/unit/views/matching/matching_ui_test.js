'use strict';
/* global CORRECT_MATCHED_VALUE */
/* global dataImage */
/* global dupContacts */
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
    realImageLoader, realURL, list, mergeAction, realL10n;

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
    var firstItem = list.querySelector('li[data-uuid="1a"] label');
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
    var firstItem = list.querySelector('li[data-uuid="1a"] label');
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
    list.querySelector('li[data-uuid="1a"] label').click();
    list.querySelector('li[data-uuid="2b"] label').click();

    window.addEventListener('merge', function(evt) {
      assert.equal(Object.keys(evt.detail.checkedContacts).length, 1);
      done();
    });

    mergeAction.click();
  });
});
