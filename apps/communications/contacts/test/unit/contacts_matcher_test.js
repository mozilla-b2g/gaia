require('/shared/js/text_normalizer.js');
requireApp('communications/contacts/test/unit/mock_find_matcher.js');
requireApp('communications/contacts/js/contacts_matcher.js');

var realmozContacts,
    contact;


if (!this.realmozContacts) {
  this.realmozContacts = null;
}

if (!this.contact) {
  this.contact = null;
}

suite('Test Contacts Matcher', function() {

  suiteSetup(function() {
    // Base contact
    contact = {
      id: '1B',
      givenName: ['Carlos'],
      familyName: ['Álvarez del Río'],
      tel: [{
        type: ['home'],
        value: '676767671'
      }],
      email: [{
        type: ['personal'],
        value: 'jj@jj.com'
      }]
    };

    MockFindMatcher.setData(contact);

    realmozContacts = navigator.mozContacts;
    navigator.mozContacts = MockFindMatcher;
  });

  suiteTeardown(function() {
    navigator.mozContacts = realmozContacts;
  });

  function assertDefaultMatch(results) {
    assert.equal(Object.keys(results).length, 1);
    assert.equal(Object.keys(results)[0], '1B');
    var matchingContact = results['1B'].matchingContact;
    assert.equal(matchingContact.email[0].value, 'jj@jj.com');
    assert.equal(matchingContact.tel[0].value, '676767671');
  }

  function testMatch(myObj, done) {
    var cbs = {
      onmatch: function(results) {
        assertDefaultMatch(results);
        done();
      },
      onmismatch: function() {
        assert.fail(cbs.onmatch, cbs.onmismatch, 'No contacts matches found!!');
        done();
      }
   };

    contacts.Matcher.match(myObj, 'passive', cbs);
  }

  function testMismatch(myObj, done) {
    var cbs = {
      onmatch: function(results) {
        assert.fail(cbs.onmismatch, cbs.onmatch, 'Matching found!!');
        done();
      },
      onmismatch: function() {
        assert.ok(true, 'Mismatch callback invoked');
        done();
      }
   };

    contacts.Matcher.match(myObj, 'passive', cbs);
  }

  test('Matching by name and phone number', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.email = [];

    testMatch(myObj, done);
  });

  test('Matching by name and phone number. Accents', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.email = [];
    myObj.familyName = ['Alvarez delrio'];

    testMatch(myObj, done);
  });

  test('Matching by name and e-mail', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.tel = null;

    testMatch(myObj, done);
  });

  test('Matching by name, e-mail and phone number', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';

    testMatch(myObj, done);
  });

  test('Phone number matches but name does not match', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.givenName = ['Adolfo'];
    myObj.email = null;

    testMismatch(myObj, done);
  });

  test('e-mail matches but name does not match', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.givenName = ['Adolfo'];
    myObj.tel = [];

    testMismatch(myObj, done);
  });

  test('Name matches, e-mail matches but phone number does not match',
       function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.tel = [{
      type: ['mobile'],
      value: '98645678'
    }];

    testMismatch(myObj, done);
  });

  test('Name matches, phone number matches but e-mail does not match',
       function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.email = [{
      type: ['personal'],
      value: 'kk@kk.com'
    }];

    testMismatch(myObj, done);
  });

  test('No name defined then mismatch', function(done) {
    var myObj = Object.create(contact);

    myObj.givenName = [];

    testMismatch(myObj, done);
  });

  test('No name defined in matching contact then mismatch', function(done) {
    contact.givenName = [];
    var myObj = Object.create(contact);

    testMismatch(myObj, done);
  });
});
