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

    test('First name is null only in incoming, lastName matches. Then mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = 'abcde';
        myObj.givenName = [];

        testMismatch(myObj, 'passive', done);
    });

    test('first name is null only in existing contact. Then mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = 'wvy';
        myObj.givenName = ['Carlos'];

        var saveGN = contact.givenName;
        contact.givenName = null;

        testMismatch(myObj, 'passive', function() {
          contact.givenName = saveGN;
          done();
        });
    });

    test('First name is null, in both. LastName matches. Then match',
      function(done) {
        var myObj = Object.create(contact);

        myObj.id = 'zx1';

        myObj.givenName = [];
        var saveGN = contact.givenName;
        contact.givenName = [];

        testMatch(myObj, 'passive', function() {
          contact.givenName = saveGN;
          done();
        });
    });

    test('Last name is null, in both. First name matches. Then match',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = 'zx1';

        myObj.familyName = [];
        var saveFN = contact.familyName;
        contact.familyName = [];

        testMatch(myObj, 'passive', function() {
          contact.familyName = saveFN;
          done();
        });
    });

    test('Incoming SIM Contact matches with a normal contact', function(done) {
      var simObj = {
        id: '678',
        category: ['sim'],
        name: ['Juan Ramón del SIM'],
        givenName: ['Juan Ramón del SIM'],
        tel: [{
          type: ['home'],
          value: '676767671'
        }]
      };

      var existingContact = {
        id: '1B',
        givenName: ['Juan Ramon'],
        familyName: ['del SIM'],
        name: ['Juan Ramón del SIM'],
        tel: [{
          type: ['home'],
          value: '676767671'
        }],
        email: [{
          type: ['personal'],
          value: 'jj@jj.com'
        }]
      };

      MockFindMatcher.setData(existingContact);

      testMatch(simObj, 'passive', function() {
        MockFindMatcher.setData(contact);
        done();
      });
    });

    test('Incoming Contact matches with an existing SIM contact',
      function(done) {
        var existingSimContact = {
          id: '1B',
          category: ['sim'],
          name: ['Juan Ramón del SIM'],
          givenName: ['Juan Ramón del SIM'],
          tel: [{
            type: ['home'],
            value: '676767671'
          }],
          email: [{
            type: ['personal'],
            value: 'jj@jj.com'
          }]
        };

        var incomingContact = {
          id: '678',
          givenName: ['Juan Ramon'],
          familyName: ['del SIM'],
          name: ['Juan Ramón del SIM'],
          tel: [{
            type: ['home'],
            value: '676767671'
          }]
        };

        MockFindMatcher.setData(existingSimContact);

        testMatch(incomingContact, 'passive', function() {
          MockFindMatcher.setData(contact);
          done();
        });
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

    test('familyName matches but givenName not. Mismatch', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.tel = null;
      myObj.givenName = ['David'];

      testMismatch(myObj, 'active', done);
    });

    test('familyName of incoming is empty. GivenName matches. Mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = '1A';
        myObj.email = [];
        myObj.tel = null;
        myObj.familyName = null;

        testMismatch(myObj, 'active', done);
    });

    test('givenName of incoming is empty. familyName matches. Mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = '1A';
        myObj.email = [];
        myObj.tel = null;
        myObj.givenName = null;

        testMismatch(myObj, 'active', done);
    });

    test('family Name of existing is empty. givenName Matches. Mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = 'zxy';
        myObj.email = null;
        myObj.tel = null;
        myObj.familyName = contact.familyName;

        contact.familyName = [];

        testMismatch(myObj, 'active', function() {
          contact.familyName = myObj.familyName;
          done();
        });
    });

    test('given Name of existing is empty. family Name Matches. Mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = 'zxy';
        myObj.email = null;
        myObj.tel = null;
        myObj.givenName = contact.givenName;

        contact.givenName = null;

        testMismatch(myObj, 'active', function() {
          contact.givenName = myObj.givenName;
          done();
        });
    });

    test('Both familyNames are empty. Given names match. Mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = 'zxy';
        myObj.email = null;
        myObj.tel = null;
        var saveFN = contact.familyName;
        myObj.familyName = contact.familyName = [null];

        testMismatch(myObj, 'active', function() {
          contact.familyName = saveFN;
          done();
        });
    });

    test('Both givenNames are empty. Family names match. Mismatch',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = 'zxy';
        myObj.email = null;
        myObj.tel = null;
        var saveGN = contact.givenName;
        myObj.givenName = contact.givenName = [''];

        testMismatch(myObj, 'active', function() {
          contact.givenName = saveGN;
          done();
        });
    });

    test('Incoming SIM Contact matches with a normal contact', function(done) {
      var simObj = {
        id: '678',
        category: ['sim'],
        name: ['Juan Ramón del SIM'],
        givenName: ['Juan Ramón del SIM']
      };

      var existingContact = {
        id: '1B',
        givenName: ['Juan Ramon'],
        familyName: ['del SIM'],
        name: ['Juan Ramón del SIM'],
        tel: [{
          type: ['home'],
          value: '676767671'
        }],
        email: [{
          type: ['personal'],
          value: 'jj@jj.com'
        }]
      };

      MockFindMatcher.setData(existingContact);

      testMatch(simObj, 'active', function() {
        MockFindMatcher.setData(contact);
        done();
      });
    });

    test('Incoming Contact matches with an existing SIM contact',
      function(done) {
        var existingSimContact = {
          id: '1B',
          category: ['sim'],
          name: ['Juan Ramón del SIM'],
          givenName: ['Juan Ramón del SIM'],
          tel: [{
            type: ['home'],
            value: '676767671'
          }],
          email: [{
            type: ['personal'],
            value: 'jj@jj.com'
          }]
        };

        var incomingContact = {
          id: '678',
          givenName: ['Juan Ramon'],
          familyName: ['del SIM'],
          name: ['Juan Ramón del SIM']
        };

        MockFindMatcher.setData(existingSimContact);

        testMatch(incomingContact, 'active', function() {
          MockFindMatcher.setData(contact);
          done();
        });
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
