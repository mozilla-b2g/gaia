'use strict';
/* global SimContactsImporter */
/* global MockMozContacts, MocksHelper, MockIccManager */

require('/contacts/test/unit/mock_mozContacts.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/simple_phone_matcher.js');
require('/shared/js/contacts/contacts_matcher.js');
require('/shared/js/contacts/contacts_merger.js');
require('/shared/js/contacts/utilities/image_thumbnail.js');
require('/shared/js/contacts/merger_adapter.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/import/utilities/import_sim_contacts.js');


var mocksHelperForImporter = new MocksHelper([
  'LazyLoader'
]).init();

suite('Sim import >', function() {
  mocksHelperForImporter.attachTestHelpers();
  var realMozContacts,
      iccManager,
      icc,
      importer;

  // List of contacts result for the method icc.readContacts
  var mRequestResult = {
    adn: [
      {id : 'a572247', tel : [{value : '900900900'}], name : ['Peter']},
      {id : 'b572248', tel : [{value : '192192192'}], name : ['Jason']}
    ],
    sdn: [
      {id : '105721', tel : [{value : '190'}], name : ['Police'] },
      {id : '105722', tel : [{value : '192'}], name : ['Ambulance'] },
      {id : '105723', tel : [{value : '193'}], name : ['Fire'] }
    ]
  };

  suiteSetup(function() {
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;
  });

  setup(function() {
    MockMozContacts.contacts = [];
    iccManager = new MockIccManager();
    icc = iccManager.getIccById('123');
    importer = new SimContactsImporter(icc);
  });

  suiteTeardown(function() {
    navigator.mozContacts = realMozContacts;
  });

  test('Calling with adn and sdn contacts', function(done) {
    iccManager.adnContacts = mRequestResult.adn;
    iccManager.sdnContacts = mRequestResult.sdn;
    iccManager.isAdnOnError = false;
    iccManager.isSdnOnError = false;

    var totalContactsToImport = mRequestResult.adn.length +
                                mRequestResult.sdn.length;

    importer.onfinish = function() {
      var mozContactsLength = navigator.mozContacts.contacts.length;
      assert.equal(mozContactsLength, totalContactsToImport);
      done();
    };
    importer.start();
  });

  test('Calling without adn contacts', function(done) {
    iccManager.adnContacts = [];
    iccManager.sdnContacts = mRequestResult.sdn;
    iccManager.isAdnOnError = false;
    iccManager.isSdnOnError = false;

    var totalContactsToImport = mRequestResult.sdn.length;

    importer.onfinish = function() {
      var mozContactsLength = navigator.mozContacts.contacts.length;
      assert.equal(mozContactsLength, totalContactsToImport);
      done();
    };
    importer.start();
  });

  test('Calling without sdn contacts', function(done) {
    iccManager.adnContacts = mRequestResult.adn;
    iccManager.sdnContacts = [];
    iccManager.isAdnOnError = false;
    iccManager.isSdnOnError = false;

    var totalContactsToImport = mRequestResult.adn.length;

    importer.onfinish = function() {
      var mozContactsLength = navigator.mozContacts.contacts.length;
      assert.equal(mozContactsLength, totalContactsToImport);
      done();
    };
    importer.start();
  });

  test('Request adn contacts fails', function(done) {
    iccManager.adnContacts = mRequestResult.adn;
    iccManager.sdnContacts = mRequestResult.sdn;
    iccManager.isAdnOnError = true;
    iccManager.isSdnOnError = false;

    importer.onerror = function() {
      var mozContactsLength = navigator.mozContacts.contacts.length;
      assert.equal(mozContactsLength, 0);
      done();
    };
    importer.start();
  });

  test('Request sdn contacts fails, only import adn', function(done) {
    iccManager.adnContacts = mRequestResult.adn;
    iccManager.sdnContacts = mRequestResult.sdn;
    iccManager.isAdnOnError = false;
    iccManager.isSdnOnError = true;

    var adnContactsLength = mRequestResult.adn.length;

    importer.onfinish = function() {
      var mozContactsLength = navigator.mozContacts.contacts.length;
      assert.equal(mozContactsLength, adnContactsLength);
      done();
    };

    importer.start();
  });
  
  test('Imported Contacts are saved with the iccManager provided id',
       function(done) {
    iccManager.adnContacts = [mRequestResult.adn[0]];
    
    var realMozContact = window.mozContact;
    
    window.mozContact = function(contact) {
      assert.equal(contact.id, mRequestResult.adn[0].id);
    };
    
    importer.onfinish = function() {
      window.mozContact = realMozContact;
      done();
    };
    
    importer.start();
  });
});
