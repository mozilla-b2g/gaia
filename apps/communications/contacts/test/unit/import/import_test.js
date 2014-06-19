'use strict';

/* global utils, importer, MockAlphaScroll, MockImageLoader */
/* global MockSearch, MockasyncStorage, MockOauthflow, MockImportHtml */
/* global MockConnector, MockImportedContacts */

require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/search.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
require('/shared/js/contacts/import/importer_ui.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');

requireApp('communications/contacts/test/unit/import/mock_import.html.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_search.js');
requireApp('communications/contacts/test/unit/mock_oauthflow.js');
require('/shared/js/contacts/import/friends_list.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/facebook/test/unit/mock_curtain.js');
requireApp('communications/contacts/test/unit/import/mock_connector.js');
requireApp(
        'communications/contacts/test/unit/import/mock_imported_contacts.js');

var realSearch,
    realImageLoader,
    realAlphaScroll,
    realAsyncStorage,
    realOauthflow,
    groupsListChild, groupsList;

if (!window.asyncStorage) {
  window.asyncStorage = null;
}

if (!window.ImageLoader) {
  window.ImageLoader = null;
}

if (!window.contacts) {
  window.contacts = null;
}

if (!window.onrendered) {
  window.onrendered = true;
}

if (!window.oauthflow) {
  window.oauthflow = null;
}

setup(function() {
  importer.reset();
});



suite('Import Friends Test Suite', function() {
  suiteSetup(function() {
    realAlphaScroll = utils.AlphaScroll;
    utils.alphaScroll = MockAlphaScroll;

    realImageLoader = window.ImageLoader;
    window.ImageLoader = MockImageLoader;

    realSearch = window.contacts.Search;
    window.contacts.Search = MockSearch;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    realOauthflow = window.oauthflow;
    window.oauthflow = MockOauthflow;

    document.body.innerHTML = MockImportHtml;

    groupsList = document.body.querySelector('#groups-list');
    groupsListChild = groupsList.firstElementChild;

    importer.ui.init();
  });


  test('Import UI. items created. not already present', function(done) {
    var contactsLoadedCalled = false;
    MockConnector.oncontactsloaded = function() {
      contactsLoadedCalled = true;
    };
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);

    importer.start('mock_token', MockConnector, '*', function() {
      assert.equal(document.querySelectorAll('#groups-list li').length,
                   MockImportedContacts.data.length);

      // MockAsyncStorage is ordering by first name
      assert.isNotNull(document.
                       querySelector('section#group-P li[data-uuid="1xz"]'));
      assert.isNotNull(document.
                       querySelector('section#group-A li[data-uuid="2abc"]'));
       assert.isNotNull(document.
                       querySelector('section#group-Ψ li[data-uuid="3cde"]'));

      assert.equal(document.querySelectorAll('section#group-G *').length, 0);

      assert.equal(document.querySelector('input[name="1xz"]').checked, false);
      assert.equal(document.querySelector('input[name="2abc"]').checked, false);
      assert.equal(document.querySelector('input[name="3cde"]').checked, false);

      assert.isTrue(document.getElementById('deselect-all').disabled);
      assert.isFalse(document.getElementById('select-all').disabled);
      assert.isTrue(document.getElementById('import-action').disabled);

      if (contactsLoadedCalled) {
        done();
      }
      else {
        assert.fail('contactsLoaded not Called', 'contactsLoadedCalled');
        done();
      }
    });
  });


  test('Import UI with some contacts already imported', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);
    var listDeviceContacts = MockConnector.listDeviceContacts;

    MockConnector.listDeviceContacts = function(callbacks) {
      callbacks.success([
        {
          uid: '1xz'
        }
      ]);
    };

    importer.start('mock_token', MockConnector, '*', function() {
      var check = document.querySelector(
                                  'li[data-uuid="1xz"] input[type="checkbox"]');

      assert.isTrue(check.checked);

      var otherCheck = document.querySelector(
                                'li[data-uuid="2abc"] input[type="checkbox"]');

      assert.isFalse(otherCheck.checked);

      assert.isFalse(document.getElementById('deselect-all').disabled);
      assert.isFalse(document.getElementById('select-all').disabled);

      done();
    });

    MockConnector.listDeviceContacts = listDeviceContacts;
  });

  test('Import UI with all contacts already imported', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);
    var listDeviceContacts = MockConnector.listDeviceContacts;

    MockConnector.listDeviceContacts = function(callbacks) {
      callbacks.success([
        {
          uid: '1xz'
        },
        {
          uid: '2abc'
        },
        {
          uid: '3cde'
        }
      ]);
    };

    importer.start('mock_token', MockConnector, '*', function() {
      var check = document.querySelector(
                                  'li[data-uuid="1xz"] input[type="checkbox"]');

      assert.isTrue(check.checked);

      var otherCheck = document.querySelector(
                                'li[data-uuid="2abc"] input[type="checkbox"]');

      assert.isTrue(otherCheck.checked);

      var anotherCheck = document.querySelector(
                                'li[data-uuid="3cde"] input[type="checkbox"]');

      assert.isTrue(anotherCheck.checked);

      assert.isTrue(document.getElementById('deselect-all').disabled === false);
      assert.isTrue(document.getElementById('select-all').disabled === true);

      done();
    });

    MockConnector.listDeviceContacts = listDeviceContacts;
  });

  test('Import UI, Importing then deleting contacts from Outlook/Gmail ' +
       'returns the correct result', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);
    var listDeviceContacts = MockConnector.listDeviceContacts;
    // Simulate contacts already imported from the connector
    MockConnector.listDeviceContacts = function(callbacks) {
      callbacks.success([
        {
          uid: '1xz'
        },
        {
          uid: '2abc'
        },
        {
          uid: '3cde'
        }
      ]);
    };
    // Simulate the desktop deletion of all contacts
    this.sinon.stub(MockConnector, 'listAllContacts',
      function(access_token, callbacks) {
        callbacks.success({data: []});
      }
    );

    importer.start('mock_token', MockConnector, '*', function() {
      var friendsMsgElement = document.querySelector('#friends-msg');
      assert.equal(friendsMsgElement.textContent, 'fbNoFriends');
      done();
    });
    MockConnector.listDeviceContacts = listDeviceContacts;
  });

  test('Import UI with no contacts available to import', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);

    var listAllContacts = MockConnector.listAllContacts;

    MockConnector.listAllContacts = function(access_token, callbacks) {
      callbacks.success({ data: []});
    };

    importer.start('mock_token', MockConnector, '*', function() {

      assert.isTrue(document.getElementById('deselect-all').disabled === true);
      assert.isTrue(document.getElementById('select-all').disabled === false);

      var friendsElement = document.getElementById('friends-msg');
      assert.isTrue(friendsElement.textContent === 'fbNoFriends');

      done();
    });

    MockConnector.listAllContacts = listAllContacts;
  });

  suiteTeardown(function() {
    utils.alphaScroll = realAlphaScroll;
    window.ImageLoader = realImageLoader;
    window.contacts.Search = realSearch;
    window.asyncStorage = realAsyncStorage;
    window.oauthflow = realOauthflow;
  });

});
