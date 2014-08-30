/* global fb, MockDatastore, MockMozContacts, MockNavigatorDatastore,
          MockMozContactsObj, MockContactAllFields

*/
'use strict';

require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/js/contacts/import/facebook/fb_utils.js');
require('/contacts/test/unit/mock_mozContacts.js');
require('/shared/js/contacts/import/facebook/fb_contact.js');
require('/shared/js/contacts/import/facebook/facebook_connector.js');
require('/shared/js/fb/fb_reader_utils.js');
require('/shared/js/fb/fb_request.js');
require('/shared/js/lazy_loader.js');
require('/shared/js/contacts/import/facebook/fb_data.js');
require('/shared/js/contacts/import/facebook/fb_data_reader.js');
require('/shared/js/contacts/import/facebook/fb_contact_utils.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/image_square.js');

suite('Import Friends Test Suite', function() {
  var fbConnector,
      realDatastore,
      realMozContacts;

  suiteSetup(function() {
    realMozContacts = navigator.mozContacts;
    MockMozContacts.contacts = [];
    navigator.mozContacts = MockMozContacts;
    fbConnector = window.FacebookConnector;

    realDatastore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  suiteTeardown(function() {
    navigator.mozContacts = realMozContacts;
    navigator.getDataStores = realDatastore;
  });

  setup(function() {
    // Reset database contact
    MockMozContacts.contacts = [];
    MockNavigatorDatastore._records = {};
  });

  function createFbContact(uid) {
    var fbContact = new MockContactAllFields();
    fbContact.category = ['facebook'];
    fbContact.uid = uid;
    var mContactTest = fbConnector.adaptDataForSaving(fbContact);
    var fbInfo = {
      bday: fbContact.bday,
      org: fbContact.org,
      adr: fbContact.adr,
      url: fbContact.url,
      photo: fbContact.photo
    };
    mContactTest.fbInfo = fbInfo;
    mContactTest.category = ['facebook', 'fb_linked', '123456789'];

    return mContactTest;
  }

  function assertStoreCorrectly(contactSaved) {
    var uid = contactSaved.uid;
    assert.equal(MockDatastore._records[uid].uid, uid);
    assert.deepEqual(MockDatastore._records[uid].tel, contactSaved.tel);
    assert.deepEqual(MockDatastore._records[uid].email, contactSaved.email);
    assert.deepEqual(MockDatastore._records[uid].familyName,
                     contactSaved.familyName);
    assert.deepEqual(MockDatastore._records[uid].name, contactSaved.name);
    assert.deepEqual(MockDatastore._records[uid].org, contactSaved.fbInfo.org);
  }

  test('Facebook contact getData returns the data correctly', function(done) {
    var mContactTest = createFbContact('1234');
    var fbContact = new fb.Contact(mContactTest);

    var req = fbContact.getData();
    req.onsuccess = function() {
      assert.deepEqual(req.result, mContactTest);
      done();
    };
    req.onerror = function() {
      assert.isTrue(false);
      done();
    };
  });

  test('Facebook contact save new Contact without store data throws exception',
       function() {
      var mContactTest = createFbContact('1234');
      var fbContact = new fb.Contact(mContactTest);
      try {
        fbContact.save();
        assert.ok(false);
      } catch (e) {
        assert.ok(true);
      }
    }
  );

  test('Facebook contact save contact', function(done) {
    var mContactTest = createFbContact('999');
    var fbContact = new fb.Contact(mContactTest);
    fbContact.setData(mContactTest);
    var saveReq = fbContact.save();
    saveReq.onsuccess = function() {
      assertStoreCorrectly(mContactTest);
      done();
    };
    saveReq.onerror = function() {
      assert.ok(false);
      done();
    };
  });

  test('Facebook contact - updating contact', function(done) {
    var uid = '999';
    var mContactTest = createFbContact(uid);
    var fbContact = new fb.Contact(mContactTest);
    fbContact.setData(mContactTest);

    mContactTest.fbInfo.org = ['ORG2'];
    mContactTest.name = 'Lucia';
    var updateReq = fbContact.update(mContactTest);

    updateReq.onsuccess = function() {
      assert.equal(MockDatastore._records[uid].uid, uid);
      assertStoreCorrectly(mContactTest);
      done();
    };
    updateReq.onerror = function() {
      assert.ok(false);
      done();
    };
  });

  test('Facebook contact - getData returns contact Info', function(done) {
    var mContactTest = createFbContact('22222');
    var fbContact = new fb.Contact(mContactTest);
    fbContact.setData(mContactTest);

    var req = fbContact.getData();
    req.onsuccess = function() {
      assert.deepEqual(req.result, mContactTest);
      done();
    };
    req.onerror = function() {
      assert.isTrue(false);
      done();
    };
  });

  test('Facebook contact - merging contacts', function() {
    var mContactTest =  {
      uid: 1212,
      name: ['Carlos'],
      givenName: [''],
      tel: [
        {
          type: ['other'],
          value: 123123123
        }
      ]
    };
    var mContactToMerge = {
      name: ['Carlos'],
      org: ['mergedField']
    };
    var fbContact = new fb.Contact(mContactTest);
    var mergedContact = fbContact.merge(mContactToMerge);

    // Check that the merged contact contains the field org
    assert.deepEqual(mergedContact.org, mContactToMerge.org);
  });

  test('Facebook contact - removing contact', function(done) {
    var uid = '3455';
    var mContactTest = createFbContact(uid);
    var fbContact = new fb.Contact(mContactTest);
    fbContact.setData(mContactTest);
    var saveReq = fbContact.save();
    saveReq.onsuccess = function() {
      assert.isDefined(MockDatastore._records[uid]);

      var removeReq = fbContact.remove(true);
      removeReq.onsuccess = function() {
        assert.isUndefined(MockDatastore._records[uid]);
        done();
      };

      removeReq.onerror = function() {
        assert.ok(false);
        done();
      };

    };
    saveReq.onerror = function() {
      assert.ok(false);
      done();
    };
  });

  test('Facebook contact - unlinking To contact', function(done) {
    var uid = '3455';
    var mContactTest = createFbContact(uid);
    navigator.mozContacts = new MockMozContactsObj([mContactTest]);

    var fbContact = new fb.Contact(mContactTest);
    fbContact.setData(mContactTest);
    var saveReq = fbContact.save();
    saveReq.onsuccess = function() {
      assert.include(fbContact.mozContact.category, fb.CATEGORY);
      var unLinkToReq = fbContact.unlink();
      unLinkToReq.onsuccess = function() {
        assert.equal(fbContact.mozContact.category.length, 0);
        done();
      };
      unLinkToReq.onerror = function() {
        assert.ok(false);
        done();
      };
    };
    saveReq.onerror = function() {
      assert.ok(false);
      done();
    };
  });

  test('Facebook contact - linking To contact', function(done) {
    var uid = '3456';
    var mContactTest = createFbContact(uid);
    mContactTest.category = [];
    navigator.mozContacts = new MockMozContactsObj([mContactTest]);

    var fbContact = new fb.Contact(mContactTest);
    fbContact.setData(mContactTest);

    assert.equal(fbContact.mozContact.category.length, 0);
    var linkToReq = fbContact.linkTo(mContactTest);
    linkToReq.onsuccess = function() {
      assert.include(fbContact.mozContact.category, fb.CATEGORY);
      done();
    };
    linkToReq.onerror = function() {
      assert.ok(false);
      done();
    };
  });
});
