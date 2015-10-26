/* global LazyLoader, DetailsController, ContactsService, MockL10n */
/* global  MockContactAllFields, MatchService */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/lazy_loader.js');

requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/js/match_service.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/simple_phone_matcher.js');
require('/shared/js/contacts/contacts_matcher.js');
require('/shared/js/contacts/import/utilities/misc.js');

require('/shared/test/unit/mocks/mock_contact_all_fields.js');

requireApp('communications/contacts/views/details/js/details_controller.js');


suite('DetailsController', function() {

  var realMozL10n;
  var mozContact;
  var stubLazyLoader;
  var stubContactServiceSave;
  var realContactToVcardBlob;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    DetailsController.init();

    realContactToVcardBlob = window.ContactToVcardBlob;
    window.ContactToVcardBlob = function foo() {};
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window.ContactToVcardBlob = realContactToVcardBlob;
    realMozL10n = null;
    realContactToVcardBlob = null;
  });

  setup(function() {
    mozContact = new MockContactAllFields();
    stubContactServiceSave = this.sinon.stub(ContactsService, 'save',
                                              function(contact, callback) {});
    stubLazyLoader = this.sinon.stub(LazyLoader, 'load',
      function(files, callback) {
      callback();
    });
  });

  teardown(function() {
    stubLazyLoader = null;
    stubLazyLoader = null;
    stubContactServiceSave = null;
    mozContact = null;
  });

  suite('Close button', function() {
    test(' > must call handleBackAction when an event is received',
      function(done) {
        var spy = this.sinon.spy(window.history, 'back');
        window.addEventListener('backAction', function() {
          assert.isTrue(spy.calledOnce);
          done();
        });

        window.dispatchEvent(new CustomEvent('backAction'));
    });
  });

  suite('Edit button', function() {
    test('> must call handleEditAction when an event is received', function() {
      //TODO: add tests when edit mode works
      assert.isTrue(true);
    });
  });

  suite('Share', function() {
    var spyContactToVcardBlob;
    setup(function() {
      spyContactToVcardBlob = this.sinon.spy(window, 'ContactToVcardBlob');
    });

    teardown(function() {
      spyContactToVcardBlob = null;
    });

    test(' > Must handle shareAction event', function(done) {
      window.addEventListener('shareAction', function(evt) {
        assert.equal(evt.detail.contact, mozContact);
        assert.isTrue(spyContactToVcardBlob.calledOnce);
        done();
      });

      window.dispatchEvent(new CustomEvent('shareAction', {'detail': {
        'contact': mozContact
      }}));
    });
  });

  suite('Find Duplicates', function() {
    test(' > Must handle find duplicates event', function(done) {
      var stubMatch = this.sinon.stub(MatchService, 'match');
      window.addEventListener('findDuplicatesAction', function() {
        assert.isTrue(stubMatch.calledWith(mozContact.id));
        done();
      });

      window.dispatchEvent(new CustomEvent('findDuplicatesAction', {'detail': 
        {'contactId': mozContact.id}}));
    });
  });

  suite('Toggle favorite', function() {
    test(' > Must handle toggle favorite event', function(done) {
      window.addEventListener('toggleFavoriteAction', function() {
        assert.isTrue(stubContactServiceSave.calledOnce);
        done();
      });

      function isFavorite()
      {
        return mozContact != null && mozContact.category != null &&
              mozContact.category.indexOf('favorite') != -1;
      }

      window.dispatchEvent(new CustomEvent('toggleFavoriteAction', {'detail': 
        {'contact': mozContact, 'isFavorite': isFavorite()}}));
    });
  });
});
