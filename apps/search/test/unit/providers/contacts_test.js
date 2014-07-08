'use strict';
/* global MocksHelper, MockMozContacts, MockContactsList, MockMozActivity,
   Search */

require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/js/url_helper.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
require('/apps/communications/contacts/test/unit/mock_mozContacts.js');
require('/apps/communications/contacts/test/unit/mock_contacts_list.js');

var mocksForMarketplaceProvider = new MocksHelper([
  'MozActivity'
]).init();

suite('search/providers/contacts', function() {
  mocksForMarketplaceProvider.attachTestHelpers();

  var fakeElement, stubById, subject;

  suiteSetup(function() {
    navigator.mozContacts = MockMozContacts;
    sinon.stub(navigator.mozContacts, 'find', function() {
      return {
        set onsuccess(cb) {
          cb(MockContactsList());
        },
        set onerror(cb) {
        },
        result: MockContactsList()
      };
    });
  });

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/contacts.js', function() {
      subject = Search.providers.Contacts;
      subject.init();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
  });

  suite('click', function() {
    test('launches the web activity', function() {
      var searchCloseStub = this.sinon.stub(Search, 'close');
      subject.click({
        target: {
          dataset: {
            contactId: 'mozilla'
          }
        }
      });
      var activityInfo = MockMozActivity.calls[0];
      assert.equal(activityInfo.name, 'open');
      assert.equal(activityInfo.data.params.id, 'mozilla');
      assert.ok(searchCloseStub.calledOnce);
    });
  });

  suite('search', function() {

    setup(function() {
      this.sinon.stub(URL, 'createObjectURL');
    });

    test('clears results', function() {
      var stub = this.sinon.stub(subject, 'clear');
      subject.search(null, function() {});
      assert.ok(stub.calledOnce);
    });

    test('contact is rendered', function(done) {
      subject.search('stub content').then((results) => {
        Search.collect(subject, results);
        var contact = subject.container.querySelector('.result');
        assert.equal(contact.querySelector('.title').innerHTML, 'Pepito A');
        assert.equal(contact.getAttribute('aria-label'), 'Pepito A');
        assert.equal(contact.getAttribute('role'), 'link');
        assert.equal(contact.querySelector('.icon').getAttribute('role'),
          'presentation');
        done();
      });
    });
  });

});
