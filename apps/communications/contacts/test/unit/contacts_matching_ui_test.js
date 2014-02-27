require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/' +
                                        'mock_contacts_matching_controller.js');
requireApp('communications/contacts/test/unit/mock_matching_contacts.html.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/' +
           'contacts_matching_ui_test_data.js');

requireApp('communications/contacts/js/contacts_matching_ui.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');

if (!this.ImageLoader) {
  this.ImageLoader = null;
}

var mocksHelperForContactMatchingUI = new MocksHelper([
  'ContactPhotoHelper'
]).init();

suite('Matching duplicate contacts UI Test Suite', function() {

  mocksHelperForContactMatchingUI.attachTestHelpers();

  var wrapper = null,
    realImageLoader, realURL, list, matchingDetails, matchingName, matchingImg,
    matchingDetailList, realMatchingController, mergeAction, realL10n;

  var masterContact = {
    givenName: ['Manolo'],
    familyName: ['García']
  };

  function checkItem(item, contact) {
    var paragraphs = item.querySelectorAll('p');

    // Given and family names are displayed fine
    assert.isTrue(paragraphs[0].textContent === contact.givenName[0] + ' ' +
                                                         contact.familyName[0]);

    // The second paragraph is the main reason for matching
    // The current preference is tel, email and name
    // Check in selectMainReason() of contacts_matching_ui.js
    assert.equal(paragraphs[1].textContent, CORRECT_MATCHED_VALUE);

    // The image is ready for the image loader
    assert.isTrue(item.querySelector('img').dataset.src == dataImage);

    // At the beginning the contact is checked by default
    assert.isTrue(item.querySelector('input[type="checkbox"]').checked);
  }

  suiteSetup(function() {
    realImageLoader = window.ImageLoader;
    realURL = window.URL || {};
    realMatchingController = contacts.MatchingController;
    realL10n = window.navigator.mozL10n;

    window.contacts.MatchingController = MockMatchingController;
    window.ImageLoader = MockImageLoader;
    window.URL = MockURL;
    window.navigator.mozL10n = MockMozL10n;

    wrapper = document.createElement('section');
    wrapper.innerHTML = MockMatchingContactsHtml;
    document.body.appendChild(wrapper);
    contacts.MatchingUI.init();
    list = wrapper.querySelector('#contacts-list-container ol');
    mergeAction = wrapper.querySelector('#merge-action');
  });

  suiteTeardown(function() {
    window.ImageLoader = realImageLoader;
    window.contacts.MatchingController = realMatchingController;
    window.URL = realURL;
    window.navigator.mozL10n = realL10n;
    document.body.removeChild(wrapper);
  });

  test('The UI is initialized correctly ', function(done) {
    contacts.MatchingUI.load('matching', masterContact, dupContacts,
                             function() {
      // The merge button is initially enabled because there are some duplicate
      // contacts
      assert.isFalse(mergeAction.disabled);

      // The message is displayed correctly
      assert.isTrue(wrapper.querySelector('#duplicate-msg > p').textContent.
                                              indexOf('Manolo García') !== -1);

      // Duplicate contacts list is displayed correctly
      var dupContactsKeys = Object.keys(dupContacts);

      assert.equal(list.children.length, dupContactsKeys.length);
      dupContactsKeys.forEach(function(id) {
        checkItem(list.querySelector('li[data-uuid="' + id + '"]'),
                  dupContacts[id].matchingContact);
      });

      done();
    });
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

  test('Merging contacts works fine ', function(done) {
    // We are un-selecting the two first ones
    list.querySelector('li[data-uuid="1a"]').click();
    list.querySelector('li[data-uuid="2b"]').click();

    setTimeout(function() {
      // User clicks on merge button
      mergeAction.click();
      setTimeout(function() {
        var checkedContacts = MockMatchingController.checkedContacts;
        // Only one duplicate contact to merge
        assert.equal(Object.keys(checkedContacts).length, 1);
        assert.isDefined(checkedContacts['3c']);
        done();
      });
    });
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
      contacts.MatchingUI.init();
      matchingDetails = wrapper.querySelector('#matching-details');
      matchingName = matchingDetails.querySelector('figcaption');
      matchingImg = matchingDetails.querySelector('img');
      matchingDetailList = matchingDetails.querySelector('#matching-list');
      // Add a photo to the matching contact with id 'user_id_1'.
      matchingDetailsData['user_id_1'].matchingContact.photo[0] =
        matchingImg.src;
      contacts.MatchingUI.load('matching', masterContact, matchingDetailsData,
        function() {
          done();
        });
    });

    test('should show the duplicate contact details overlay', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        assert.isFalse(matchingDetails.classList.contains('hide'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      contacts.MatchingUI.displayMatchingDetails('user_id_1');
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
      contacts.MatchingUI.displayMatchingDetails('user_id_1');
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
      contacts.MatchingUI.displayMatchingDetails('user_id_2');
    });

    test('should show the duplicate contact image', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        assert.isFalse(matchingImg.classList.contains('hide'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      contacts.MatchingUI.displayMatchingDetails('user_id_1');
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
      contacts.MatchingUI.displayMatchingDetails('user_id_2');
    });

    test('should show the phone number but not highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        assert.equal(listItems[0].textContent, 'type_1, 111111111');
        assert.isFalse(listItems[0].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      contacts.MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the phone number and highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        assert.equal(listItems[1].textContent, 'type_2, 222222222');
        assert.isTrue(listItems[1].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      contacts.MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the email but not highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        assert.equal(listItems[2].textContent,
                     'email_type_1, email_1@acme.com');
        assert.isFalse(listItems[2].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      contacts.MatchingUI.displayMatchingDetails('user_id_1');
    });

    test('should show the email and highlight it', function(done) {
      var checkAssertions = function() {
        observer.disconnect();
        var listItems = matchingDetailList.querySelectorAll('li');
        assert.equal(listItems[3].textContent,
                     'email_type_2, email_2@acme.com');
        assert.isTrue(listItems[3].classList.contains('selected'));
        done();
      };
      var observer = new MutationObserver(checkAssertions);
      observer.observe(matchingDetails, observerConfig);
      contacts.MatchingUI.displayMatchingDetails('user_id_1');
    });

  });

});
