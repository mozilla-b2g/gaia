require('/shared/js/text_normalizer.js');
requireApp('communications/import/test/unit/mock_import.html.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_search.js');
requireApp('communications/contacts/test/unit/mock_oauthflow.js');
requireApp('communications/contacts/js/import_utils.js');
requireApp('communications/contacts/js/utilities/dom.js');
requireApp('communications/contacts/js/fb/friends_list.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/facebook/test/unit/mock_curtain.js');
requireApp('communications/import/test/unit/mock_connector.js');
requireApp('communications/import/test/unit/mock_imported_contacts.js');
requireApp('communications/contacts/js/views/search.js');
requireApp('communications/contacts/js/importer_ui.js');

var realSearch,
    realImageLoader,
    realAlphaScroll,
    realAsyncStorage,
    realOauthflow,
    groupsListChild, groupsList;

if (!this.asyncStorage) {
  this.asyncStorage = null;
}

if (!this.ImageLoader) {
  this.ImageLoader = null;
}

if (!this.contacts) {
  this.contacts = null;
}

if (!this.onrendered) {
  this.onrendered = true;
}

if (!this.oauthflow) {
  this.oauthflow = null;
}

setup(function() {
  importer.reset();
});



suite('Import Friends Test Suite', function() {
  // disabled because of perma-red: bug 909630
  return;

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
                   MockImportedContacts.length);

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

  suiteTeardown(function() {
    utils.alphaScroll = realAlphaScroll;
    window.ImageLoader = realImageLoader;
    window.contacts.Search = realSearch;
    window.asyncStorage = realAsyncStorage;
    window.oauthflow = realOauthflow;
  });

});
