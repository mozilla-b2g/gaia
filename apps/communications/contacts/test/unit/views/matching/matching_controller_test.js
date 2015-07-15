'use strict';
/* global matchingDetailsData */
/* global MockMozL10n */
/* global MockCurtain */
/* global MockContactsService */
/* global LazyLoader */
/* global Curtain */
/* global MatchingController */
/* global Matcher */
/* global ContactsService */
/* global MergeHelper */

require('/shared/js/lazy_loader.js');

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_matching_contacts.js.html');
requireApp('communications/contacts/test/unit/' +
           'contacts_matching_ui_test_data.js');
requireApp('communications/contacts/test/unit/mock_contacts_service.js');
requireApp('communications/facebook/test/unit/mock_curtain.js');

requireApp('communications/contacts/views/matching/js/matching_controller.js');


suite('MatchingController', function() {

  var realL10n, realCurtain, realContactsService, realMatcher, realMergeHelper,
    realParentContactsService;

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockMozL10n;
    realCurtain = window.Curtain;
    window.Curtain = MockCurtain;
    realContactsService = window.ContactsService;
    window.ContactsService = MockContactsService;
    realMatcher = window.Matcher;
    window.Matcher = {
      match: function foo(){}
    };
    realMergeHelper = window.MergeHelper;
    window.MergeHelper = {
      merge: function foo() {
        return {
          then: function boo(cb) {
            cb();
          }
        };
      }
    };

    sinon.stub(LazyLoader, 'load', function(files, cb) {
      cb();
    });

    realParentContactsService = parent.ContactsService;
    parent.ContactsService = window.ContactsService;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    realL10n = null;

    window.Curtain = realCurtain;
    realCurtain = null;

    window.ContactsService = realContactsService;
    realContactsService = null;

    window.Matcher = realMatcher;
    realMatcher = null;

    window.MergeHelper = realMergeHelper;
    realMergeHelper = null;

    parent.ContactsService = realParentContactsService;
  });

  suite(' > On merge', function() {
    var showSpy, hideMenuSpy, mergeSpy, hideSpy;
    setup(function() {
      showSpy = this.sinon.spy(Curtain, 'show');
      hideMenuSpy = this.sinon.spy(Curtain, 'hideMenu');
      hideSpy = this.sinon.spy(Curtain, 'hide');
      mergeSpy = this.sinon.spy(MergeHelper, 'merge');

      MatchingController.init();
    });

    test('On merge event received', function() {
      window.dispatchEvent(new CustomEvent('merge', {
        'detail': {
          'checkedContacts': {'1a': '1a'}
        }
      }));
      // When MatchingController is initialized, start method is called with
      // the timestamp of the test, so the method thinks that it's a contact id.
      // In this case, the specific code will be executed causing 
      // that Curtain.show will be called twice
      assert.isTrue(showSpy.calledTwice);
      assert.isTrue(hideMenuSpy.calledOnce);
      assert.isTrue(mergeSpy.calledOnce);
      assert.isTrue(hideSpy.calledOnce);
    });
  });

  suite(' > On start', function() {
    var showSpy, matchStub, getContactStub;
    setup(function() {
      showSpy = this.sinon.spy(Curtain, 'show');
      getContactStub = this.sinon.stub(ContactsService, 'get',
        function(contactID, successCb, errorCb) {
          successCb(matchingDetailsData.user_id_1);
      });

      matchStub = this.sinon.stub(Matcher, 'match',
        function(contact, type, callbacks) {
        callbacks.onmatch();
      });
    });

    test('Start method should call match', function(done) {
      window.addEventListener('initUI', function fn() {
        window.removeEventListener('initUI', fn);
        done();
      });

      MatchingController.init();

      assert.isTrue(showSpy.calledOnce);
      assert.isTrue(getContactStub.calledOnce);
      assert.isTrue(matchStub.calledOnce);
    });
  });

});
