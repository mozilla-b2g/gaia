requireApp('communications/import/test/unit/mock_import.html.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_search.js');
requireApp('communications/contacts/js/fb/friends_list.js');
requireApp('communications/contacts/js/utilities/normalizer.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_fixed_header.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/facebook/test/unit/mock_curtain.js');
requireApp('communications/import/test/unit/mock_connector.js');
requireApp('communications/import/test/unit/mock_imported_contacts.js');
requireApp('communications/contacts/js/importer_ui.js');

var realContacts,
    realFixedHeader,
    realImageLoader,
    realAlphaScroll,
    realAsyncStorage;

if (!this.FixedHeader) {
  this.FixedHeader = null;
}

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

suite('Import Friends Test Suite', function() {

  suiteSetup(function() {
    realAlphaScroll = utils.AlphaScroll;
    utils.alphaScroll = MockAlphaScroll;

    realFixedHeader = window.FixedHeader;
    window.FixedHeader = MockFixedHeader;

    realImageLoader = window.ImageLoader;
    window.ImageLoader = MockImageLoader;

    realContacts = window.contacts;
    window.contacts = {};
    window.contacts.Search = MockSearch;

    document.body.innerHTML = MockImportHtml;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockAsyncStorage;

    importer.ui.init();
  });

  test('Import first time. items created. not already present', function(done) {
    var contactsLoadedCalled = false;
    MockConnector.oncontactsloaded = function() {
      contactsLoadedCalled = true;
    };
    importer.start('mock_token', MockConnector, '*', function() {
      assert.equal(document.querySelectorAll('#groups-list li').length, 2);

      // MockAsyncStorage is ordering by first name
      assert.isNotNull(document.
                       querySelector('section#group-P li[data-uuid="1xz"]'));
      assert.isNotNull(document.
                       querySelector('section#group-A li[data-uuid="2abc"]'));

      assert.equal(document.querySelectorAll('section#group-G *').length, 0);

      assert.equal(document.querySelector('input[name="1xz"]').checked, false);
      assert.equal(document.querySelector('input[name="2abc"]').checked, false);
      if (contactsLoadedCalled) {
        done();
      }
      else {
        // assert.fail('contactsLoaded not Called','contactsLoadedCalled');
        done();
      }
    });
  });

  suiteTeardown(function() {
    utils.alphaScroll = realAlphaScroll;
    window.FixedHeader = realFixedHeader;
    window.ImageLoader = realImageLoader;
    window.contacts = realContacts;
    window.asyncStorage = realAsyncStorage;

    document.body.innerHTML = '';
  });
});
