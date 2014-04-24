'use strict';
/* global fb */
/* global MockFbContactsObj */
/* global MockMozContactsObj */

require('/shared/js/fb/fb_reader_utils.js');
require('/shared/js/fb/fb_request.js');
require('/shared/test/unit/mocks/mock_fb_data_reader.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');

var realFbContacts, realMozContacts;

if (!window.realFbContacts) {
  window.realFbContacts = null;
}

if (!window.realMozContacts) {
  window.realMozContacts = null;
}

suite('Facebook data reader utils suite', function() {
  var uid = '999999';
  var localName = 'José Carlos Fdez Avila';
  var localGivenName = 'José Carlos';
  var localFamilyName = 'Fdez Avila';
  var localNumber = '676767676';
  var fbNumber = '+34655555555';

  var localContact = {
    id: '12345',
    name: [localName],
    givenName: [localGivenName],
    familyName: [localFamilyName],
    category: ['favorite', 'facebook', 'fb_not_linked', uid],
    tel: [{
      type: ['mobile'],
      value: localNumber
    }]
  };

  var fbFriendData = {
    uid: uid,
    name: ['Carlos Fdez'],
    givenName: ['Carlos'],
    familyName: ['Fdez'],
    tel: [{
      type: ['personal'],
      value: fbNumber
    }],
    email: [{
      type: ['personal'],
      value: 'jj@@jj.com'
    }],
    photo: [{}]
  };

  suiteSetup(function() {
    realFbContacts = fb.contacts;
    fb.contacts = new MockFbContactsObj(fbFriendData);
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = new MockMozContactsObj([localContact]);
  });

  suiteTeardown(function() {
    fb.contacts = realFbContacts;
    navigator.mozContacts = realMozContacts;
  });

  test('It is Facebook Contact', function() {
    assert.isTrue(fb.isFbContact(localContact));
  });

  test('It is not Facebook Contact', function() {
    var currentCat = localContact.category;
    localContact.category = null;
    assert.isTrue(!fb.isFbContact(localContact));
    localContact.category = currentCat;
  });

  test('Get Friend UID', function() {
    assert.equal(fb.getFriendUid(localContact), uid);
  });

  test('It is Facebook Contact: Not linked', function() {
    assert.isTrue(fb.isFbContact(localContact));
    assert.isFalse(fb.isFbLinked(localContact));
  });

  test('Get LinkedTo. Not Linked', function() {
    assert.isUndefined(fb.getLinkedTo(localContact));
  });

  test('Is Facebook Contact: Linked', function() {
    localContact.category[2] = 'fb_linked';
    assert.isTrue(fb.isFbLinked(localContact));
  });

  test('Get LinkedTo. Linked', function() {
    localContact.category[2] = 'fb_linked';
    assert.equal(fb.getLinkedTo(localContact), uid);
  });

  function assertFbMergedData(result) {
    assert.equal(result.givenName[0], localGivenName);
    assert.equal(result.familyName[0], localFamilyName);
    assert.equal(result.name[0], localName);
    assert.isTrue(Array.isArray(result.tel) && result.tel.length === 2);
    assert.equal(result.tel[0].value, localNumber);
    assert.equal(result.tel[1].value, fbNumber);
    assert.isTrue(Array.isArray(result.photo) && result.photo.length === 1);
  }

  function errorNotExpected(done) {
    done(function() {
      assert.fail('Error not expected: ' + this.error.name);
    });
  }

  function successNotExpected(done) {
    done(function() {
      assert.fail('Succcess not expected');
    });
  }

  test('Get Data from Facebook. Linked Contact', function(done) {
    var req = fb.getData(localContact);

    req.onsuccess = function() {
      done(function() {
        var result = req.result;
        assertFbMergedData(result);
      });
    };

    req.onerror = errorNotExpected.bind(req, done);
  });

  test('Get Contact by Number', function(done) {
    fb.getContactByNumber(fbNumber, function success(contact) {
      done(function() {
        assertFbMergedData(contact);
      });
    }, function error(err) {
         (errorNotExpected.bind(err, done))();
    });
  });

  test('Get Contact by Number. In error', function(done) {
    fb.contacts.inError = true;

    fb.getContactByNumber(fbNumber, function success(contact) {
      successNotExpected(done);
    },
    function error(err) {
      done(function() {
        assert.equal(err.name, 'UnknownError');
      });
    });
  });

  test('Get Data from Facebook. In Error', function(done) {
    var req = fb.getData(localContact);

    req.onsuccess = successNotExpected.bind(null, done);

    req.onerror = function() {
      assert.equal(req.error.name, 'UnknownError');
      done();
    };
  });

});
