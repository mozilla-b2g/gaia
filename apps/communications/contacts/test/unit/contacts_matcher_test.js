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
  function assertDefaultMatch(results) {
    assert.equal(Object.keys(results).length, 1);
    assert.equal(Object.keys(results)[0], '1B');
    var matchingContact = results['1B'].matchingContact;
    assert.equal(matchingContact.email[0].value, 'jj@jj.com');
    assert.equal(matchingContact.tel[0].value, '676767671');
  }

  function testMatch(myObj, mode, done) {
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

    contacts.Matcher.match(myObj, mode, cbs);
  }

  function testMismatch(myObj, mode, done) {
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

    contacts.Matcher.match(myObj, mode, cbs);
  }

  function setupSuite() {
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
  }

  suiteTeardown(function() {
    navigator.mozContacts = realmozContacts;
  });

  suite('Test Contacts Matcher. PassiveMode', function() {
    suiteSetup(setupSuite);

    test('Matching by name and phone number', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];

      testMatch(myObj, 'passive', done);
    });

    test('Matching by name and phone number. Accents', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.familyName = ['Alvarez delrio'];

      testMatch(myObj, 'passive', done);
    });

    test('Matching by name and phone number. Name defined in the name prop',
      function(done) {
        var myObj = Object.create(contact);

        myObj.id = '1A';
        myObj.email = [];
        myObj.familyName = [];
        myObj.givenName = ['Carlos Alvarez del Río'];
        myObj.name = ['Carlos Alvarez del Río'];

        var saveGN = contact.givenName;
        var saveFN = contact.familyName;
        contact.givenName = ['Carlos Alvarez del Río'];
        contact.familyName = ['  '];
        contact.name = ['Carlos Álvarez del rio'];

        testMatch(myObj, 'passive', function() {
          contact.givenName = saveGN;
          contact.familyName = saveFN;
          contact.name = null;
          done();
        });
    });

    test('Matching by name and e-mail', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.tel = null;

      testMatch(myObj, 'passive', done);
    });

    test('Matching by name, e-mail and phone number', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';

      testMatch(myObj, 'passive', done);
    });

    test('Phone number matches but name does not match', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.givenName = ['Adolfo'];
      myObj.email = null;

      testMismatch(myObj, 'passive', done);
    });

    test('e-mail matches but name does not match', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.givenName = ['Adolfo'];
      myObj.tel = [];

      testMismatch(myObj, 'passive', done);
    });

    test('Name matches, e-mail matches but phone number does not match',
         function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.tel = [{
        type: ['mobile'],
        value: '98645678'
      }];

      testMismatch(myObj, 'passive', done);
    });

    test('Name matches, phone number matches but e-mail does not match',
         function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [{
        type: ['personal'],
        value: 'kk@kk.com'
      }];

      testMismatch(myObj, 'passive', done);
    });

    test('No name defined then mismatch', function(done) {
      var myObj = Object.create(contact);

      myObj.givenName = [];

      testMismatch(myObj, 'passive', done);
    });

    test('No name defined in matching contact then mismatch', function(done) {
      contact.givenName = [];
      var myObj = Object.create(contact);

      testMismatch(myObj, 'passive', done);
    });
  });

  suite('Test Contacts Matcher. Active Mode', function() {
    suiteSetup(setupSuite);

    test('Matching by phone', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [{
        type: ['work'],
        value: 'work@work.it'
      }];
      myObj.givenName = [];
      myObj.familyName = null;

      testMatch(myObj, 'active', done);
    });

    test('Matching by email', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.tel = [{
        type: ['personal'],
        value: '9999999'
      }];
      myObj.givenName = ['Lucas'];
      myObj.familyName = ['Petrov'];

      testMatch(myObj, 'active', done);
    });

    test('Matching by phone and email', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.givenName = ['  '];
      myObj.familyName = [' '];

      testMatch(myObj, 'active', done);
    });

    test('Matching by name', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.tel = [{
        type: ['personal'],
        value: '9999999'
      }];

      testMatch(myObj, 'active', done);
    });

    test('Matching by phone, email and name', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';

      testMatch(myObj, 'active', done);
    });

    test('Matching by name. givenName startsWith', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.tel = null;
      myObj.givenName = ['Carlos Ángel'];

      testMatch(myObj, 'active', done);
    });

    test('familyName matches but givenName not', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.tel = null;
      myObj.givenName = ['David'];

      testMismatch(myObj, 'active', done);
    });

    test('No matches at all', function(done) {
      var myObj = {
        id: '1A',
        email: [{}],
        tel: [{
          type: ['mobile'],
          value: '8888888'
        }],
        givenName: null,
        familyName: []
      };

      testMismatch(myObj, 'active', done);
    });
  });
});
