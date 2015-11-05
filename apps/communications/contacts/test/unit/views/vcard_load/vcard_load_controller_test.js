/* global LazyLoader, ContactsService, MockMatcher, MockContactsList */
/* global VCardLoadController */

'use strict';

require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_contacts_match.js');
requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp(
  'communications/contacts/views/vcard_load/js/vcard_load_controller.js');

suite('VCardLoadController', function() {

  var stubLazyLoader;
  var stubContactServiceSave;
  var contacts;
  var realMatcher;
  var fakeActivity = {
    source: {
      data: {
        allowSave: true,
        blob: null,
        filename:
          '/apps/communications/contacts/test/unit/vcards/vcard_21.vcf',
        type:'text/x-vcard'
      }
    },
    postResult: function foo() {}
  };

  suiteSetup(function() {
    VCardLoadController.init();
    VCardLoadController.setActivity(fakeActivity);

    realMatcher = window.Matcher;
    window.Matcher = MockMatcher;
  });

  suiteTeardown(function() {
    window.Matcher = realMatcher;
    realMatcher = null;
  });

  setup(function() {
    contacts = MockContactsList();
    stubContactServiceSave = this.sinon.stub(ContactsService, 'save',
                                              function(contact, onerror) {
                                                onerror(null);
                                              });
    stubLazyLoader = this.sinon.stub(LazyLoader, 'load',
      function(files, callback) {
      callback();
    });
  });

  teardown(function() {
    stubLazyLoader = null;
    stubContactServiceSave = null;
    contacts = null;
  });

  suite('Close button', function() {
    test(' > must call close when an event is recived', function(done) {
      var spy = this.sinon.spy(fakeActivity, 'postResult');
      window.addEventListener('closeAction', function() {
        assert.isTrue(spy.calledOnce);
        done();
      });

      window.dispatchEvent(new CustomEvent('closeAction'));
    });
  });

  suite('Import all button', function() {
    var clock, spyMatcher, spyPostResult;

    setup(function() {
      clock = this.sinon.useFakeTimers();
      spyMatcher = this.sinon.spy(window.Matcher, 'match');
      spyPostResult = this.sinon.spy(fakeActivity, 'postResult');
    });

    test(' > must import all contacts received', function(done) {
      window.addEventListener('saveAction', function(evt) {
        console.info(evt.detail);
        assert.equal(evt.detail.contactsToImport.length, contacts.length);
        assert.isTrue(spyMatcher.calledThrice);
        assert.isTrue(stubContactServiceSave.calledThrice);
        clock.tick(3000);
        assert.isTrue(spyPostResult.calledOnce);
        done();
      });

      window.dispatchEvent(new CustomEvent('saveAction', {
        'detail': {
          'contactsToImport': contacts
        }
      }));
    });
  });
});
