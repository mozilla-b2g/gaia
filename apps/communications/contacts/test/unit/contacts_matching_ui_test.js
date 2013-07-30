require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/' +
                                        'mock_contacts_matching_controller.js');
requireApp('communications/contacts/test/unit/mock_matching_contacts.html.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/js/utilities/templates.js');

requireApp('communications/contacts/js/contacts_matching_ui.js');

if (!this.ImageLoader) {
  this.ImageLoader = null;
}

suite('Matching duplicate contacts UI Test Suite', function() {

  var wrapper = null, realImageLoader, realURL, list, realMatchingController,
      mergeAction, realL10n;

  var masterContact = {
    name: ['Manolo García']
  };

  var dataImage = 'data:image/gif;base64,R0lGODlhyAAiALM...DfD0QAADs=';

  var dupContacts = {
    '1a': {
      matchingContact: {
        id: '1a',
        givenName: ['Manolo'],
        familyName: ['García'],
        photo: [dataImage],
        email: [{
          value: 'man@tid.es'
        }]
      }
    },
    '2b': {
      matchingContact: {
        id: '2b',
        givenName: ['Manolo'],
        familyName: ['García'],
        photo: [dataImage],
        email: [{
          value: 'man@tid.es'
        }, {
          value: 'man@telefonica.es'
        }]
      }
    },
    '3c': {
      matchingContact: {
        id: '3c',
        givenName: ['Manolo'],
        familyName: ['García'],
        photo: [dataImage],
        email: [{
          value: 'man@tid.es'
        }],
        'tel': [{
          value: '+346578888881',
          type: 'Mobile'
        }]
      }
    }
  };

  function checkItem(item, contact) {
    var paragraphs = item.querySelectorAll('p');

    // Given and family names are displayed fine
    assert.isTrue(paragraphs[0].textContent === contact.givenName[0] + ' ' +
                                                         contact.familyName[0]);

    // The first e-mail is displayed correctly
    assert.isTrue(paragraphs[1].textContent === contact.email[0].value);

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

});
