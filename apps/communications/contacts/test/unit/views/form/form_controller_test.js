/* global LazyLoader, FormController, ContactsService, MockL10n, mozContact */
/* global  Matcher, MatchService */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/lazy_loader.js');

requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/js/match_service.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/simple_phone_matcher.js');
require('/shared/js/contacts/contacts_matcher.js');
require('/shared/js/contacts/import/utilities/misc.js');

requireApp('communications/contacts/views/form/js/form_controller.js');


suite('FormController', function() {

  var realMozL10n;
  var testContact;
  var stubLazyLoader;
  var stubContactServiceSave;
  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    FormController.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  function dispatchSaveEvent() {
    window.dispatchEvent(new CustomEvent('save-contact',
      {detail: testContact}));
  }

  setup(function() {
    testContact = new mozContact();
    testContact.givenName = ['Test'];
    stubContactServiceSave = this.sinon.stub(ContactsService, 'save',
                                              function(contact, onerror) {});
    stubLazyLoader = this.sinon.stub(LazyLoader, 'load',
      function(files, callback) {
      callback();
    });
  });

  teardown(function() {
    stubLazyLoader = null;
    stubContactServiceSave = null;
    testContact = null;
  });

  suite('Close button', function() {
    test(' > must call close when an event is recived', function(done) {
      var spy = this.sinon.spy(window.history, 'back');
      window.addEventListener('close-ui', function() {
        assert.isTrue(spy.calledOnce);
        done();
      });

      window.dispatchEvent(new CustomEvent('close-ui'));
    });
  });

  suite('Save button', function() {
    setup(function() {
      dispatchSaveEvent();
    });

    test(' > LazyLoader must be called 2 times', function() {
      assert.isTrue(stubLazyLoader.calledTwice);
    });

    test(' > First call must ensure match service', function() {
      // First of all we need to bring l10n library for localization
      var firstCall = stubLazyLoader.getCall(0);
      assert.isTrue(Array.isArray(firstCall.args[0]));
      assert.equal(firstCall.args[0][0], '/contacts/style/match_service.css');
      assert.equal(firstCall.args[0][1], '/contacts/js/match_service.js');
    });

    test(' > Second call must ensure other dependencies', function() {
      var secondCall = stubLazyLoader.getCall(1);
      assert.isTrue(Array.isArray(secondCall.args[0]));
      assert.equal(secondCall.args[0][0], '/shared/js/text_normalizer.js');
      assert.equal(secondCall.args[0][1], '/shared/js/simple_phone_matcher.js');
      assert.equal(secondCall.args[0][2],
        '/shared/js/contacts/contacts_matcher.js');
    });
  });

  suite('On match contacts', function() {
    var stubMatcher;
    setup(function() {
      stubMatcher = this.sinon.stub(Matcher, 'match',
        function(contact, mode, callbacks) {
          callbacks.onmatch();
      });
    });

    teardown(function() {
      stubMatcher = null;
    });

    test(' > When matching contacts showDuplicatesContacts must be called',
      function() {
        var stubShowDuplicates =
          this.sinon.stub(MatchService, 'showDuplicateContacts');

        dispatchSaveEvent();
        assert.isTrue(stubShowDuplicates.called);
        assert.isFalse(stubContactServiceSave.called);
    });
  });
});
