require('/shared/js/text_normalizer.js');
require('/shared/js/simple_phone_matcher.js');
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

if (!this.contactFB) {
  this.contactFB = null;
}

if (!this.SimplePhoneMatcher) {
  this.SimplePhoneMatcher = null;
}

suite('Test Contacts Matcher', function() {
  function assertDefaultMatch(results, matchingFields, telValue) {
    assert.equal(Object.keys(results).length, 1);
    assert.equal(Object.keys(results)[0], '1B');
    var matchingContact = results['1B'].matchingContact;
    if (Array.isArray(matchingContact.email) && matchingContact.email[0]) {
      assert.equal(matchingContact.email[0].value, 'jj@jj.com');
    }
    if (Array.isArray(matchingContact.tel) && matchingContact.tel[0]) {
      assert.equal(matchingContact.tel[0].value, telValue || '676767671');
    }

    if (matchingFields) {
      matchingFields.forEach(function(matchingField) {
        if (typeof matchingField === 'string') {
          assert.isDefined(results['1B'].matchings[matchingField]);
        }
        else if (matchingField && typeof matchingField === 'object') {
          var matchArr = results['1B'].matchings[matchingField.field];
          assert.isDefined(matchArr);
          assert.lengthOf(matchArr, matchingField.times);
        }
      });
    }
  }

  function testMatch(myObj, mode, matchingFields, done, telValue) {
    var cbs = {
      onmatch: function(results) {
        assertDefaultMatch(results, matchingFields, telValue);
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

      testMatch(myObj, 'passive', null, done);
    });

    test('Matching by name and phone number. Accents', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.familyName = ['Alvarez delrio'];

      testMatch(myObj, 'passive', null, done);
    });

    test('Matching by name and phone number. International number incoming',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = '1A';
        myObj.tel = [{
          type: contact.tel[0].type,
          value: '+34' + contact.tel[0].value
        }];
        myObj.email = [];
        myObj.familyName = ['Alvarez delrio'];

        testMatch(myObj, 'passive', null, done);
    });

    test('Matching by name and phone number. International number existing',
      function(done) {
        var myObj = Object.create(contact);
        var savedContactTel = contact.tel;
        contact.tel = [{
          type: ['mobile'],
          value: '+34' + savedContactTel[0].value
        }];
        myObj.id = '1A';
        myObj.tel = [{
          type: savedContactTel[0].type,
          value: savedContactTel[0].value
        }];
        myObj.email = [];
        myObj.familyName = ['Alvarez delrio'];

        testMatch(myObj, 'passive', null, function() {
          contact.tel = savedContactTel;
          done();
        }, contact.tel[0].value);
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

        testMatch(myObj, 'passive', null, function() {
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

      testMatch(myObj, 'passive', null, done);
    });

    test('Matching by name, e-mail and phone number', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';

      testMatch(myObj, 'passive', null, done);
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

    test('First name is null only in existing contact. Then mismatch',
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

        testMatch(myObj, 'passive', null, function() {
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

        testMatch(myObj, 'passive', null, function() {
          contact.familyName = saveFN;
          done();
        });
    });

    test('Match by name and phone number when existing contact is FB Linked',
      function(done) {
        var linkedContact = {
          id: '1B',
          category: ['facebook', 'fb_linked', '678910'],
          givenName: ['Jose'],
          familyName: ['Mota'],
          name: ['Jose Mota'],
          tel: [
            {
              type: ['mobile'],
              value: '676767671'
            }
          ]
        };

        var incomingContact = {
          id: 'kjh987',
          category: ['gmail'],
          givenName: linkedContact.givenName,
          familyName: linkedContact.familyName,
          name: linkedContact.name,
          tel: [
            {
              type: ['mobile'],
              value: '676767671'
            },
            {
              type: ['personal'],
              value: '983456789'
            }
          ]
        };

        MockFindMatcher.setData(linkedContact);
        testMatch(incomingContact, 'passive', null, function() {
          MockFindMatcher.setData(contact);
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

      testMatch(simObj, 'passive', null, function() {
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

        testMatch(incomingContact, 'passive', null, function() {
          MockFindMatcher.setData(contact);
          done();
        });
      });
  });

  suite('Test Contacts Matcher. Active Mode', function() {
    suiteSetup(setupSuite);

    test('Matching by name', function(done) {
      var existingContact = {
        id: '1B',
        givenName: ['Jander'],
        familyName: ['Klander'],
        name: ['Jander Klander']
      };

      var updatedContact = {
        id: '1B',
        givenName: ['Jander'],
        familyName: ['Klander'],
        name: ['Jander Klander'],
        org: ['Company']
      };

      MockFindMatcher.setData(existingContact);

      testMismatch(updatedContact, 'active', function() {
        MockFindMatcher.setData(contact);
        done();
      });
    });

    test('Matching by phone', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';

      myObj.givenName = [];
      myObj.familyName = null;

      testMatch(myObj, 'active', ['tel'], done);
    });

    test('Matching by phone internationalized number', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';

      myObj.givenName = [];
      myObj.familyName = null;
      myObj.tel = [];
      myObj.tel[0] = {
        type: ['mobile'],
        value: '+34' + contact.tel[0].value
      };

      testMatch(myObj, 'active', ['tel'], done);
    });

    test('Matching by phone internationalized number existing', function(done) {
      var savedTel = contact.tel;
      var myObj = Object.create(contact);
      myObj.id = '1A';

      myObj.givenName = [];
      myObj.familyName = null;
      myObj.tel = [];
      myObj.tel[0] = {
        type: ['mobile'],
        value: savedTel[0].value
      };
      contact.tel = [{
        type: savedTel[0].type,
        value: '0034' + savedTel[0].value
      }];

      testMatch(myObj, 'active', ['tel'], function() {
        contact.tel = savedTel;
        done();
      }, contact.tel[0].value);
    });


    test('Matching by multiple phones', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      var savedTel = contact.tel;
      contact.tel = [
        savedTel[0],
        {
          type: ['home'],
          value: '67890123'
        }
      ];
      myObj.givenName = [];
      myObj.familyName = null;

      testMatch(myObj, 'active', [{field: 'tel', times: 2}], function() {
        contact.tel = savedTel;
        done();
      });
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

      testMatch(myObj, 'active', ['email'], done);
    });

    test('Matching by multiple emails', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';

      var savedEmail = contact.email;

      contact.email = [
        savedEmail[0],
        {
          type: ['work'],
          value: 'k1zq@example.com'
      }];

      myObj.givenName = [];
      myObj.familyName = null;

      testMatch(myObj, 'active', [{field: 'email', times: 2}], function() {
        contact.email = savedEmail;
        done();
      });
    });

    test('Matching by phone and email', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.givenName = ['  '];
      myObj.familyName = [' '];

      testMatch(myObj, 'active', ['tel', 'email'], done);
    });

    test('Matching by name', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.tel = [{
        type: ['personal'],
        value: '9999999'
      }];

      testMatch(myObj, 'active', ['name'], done);
    });

    test('SIM Contact. Name is totally empty and there is tel. No matches',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = '1A';
        myObj.name = myObj.givenName = myObj.familyName = [];
        myObj.category = ['sim'];
        myObj.tel = [{
          type: ['personal'],
          value: '9999999'
        }];
        myObj.email = null;

        testMismatch(myObj, 'active', done);
    });

    test('Regular Contact. Name is totally empty and there is tel. No matches',
      function(done) {
        var myObj = Object.create(contact);
        myObj.id = '1A';
        myObj.name = myObj.givenName = myObj.familyName = [];
        myObj.category = null;
        myObj.tel = [{
          type: ['personal'],
          value: '9999999'
        }];
        myObj.email = null;

        testMismatch(myObj, 'active', done);
    });


    test('Matching by phone, email and name', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';

      testMatch(myObj, 'active', ['tel', 'email', 'name'], done);
    });

    test('Matching by name. givenName startsWith', function(done) {
      var myObj = Object.create(contact);
      myObj.id = '1A';
      myObj.email = [];
      myObj.tel = null;
      myObj.givenName = ['Carlos Ángel'];

      testMatch(myObj, 'active', ['name'], done);
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

      testMatch(simObj, 'active', ['name'], function() {
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

        testMatch(incomingContact, 'active', ['name'], function() {
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

  suite('Test Contacts Matcher. Active Mode. Facebook Contacts', function() {
    suiteSetup(function() {
      contactFB = {
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
        }],
        category: ['facebook']
    };

      MockFindMatcher.setData(contactFB);

      realmozContacts = navigator.mozContacts;
      navigator.mozContacts = MockFindMatcher;
    });

    test('A Facebook Imported Contact never matches', function(done) {
      var contactObj = Object.create(contact);
      contactObj.id = '9876';
      contactObj.category = null;

      testMismatch(contactObj, 'active', done);
    });

    test('A Facebook linked Contact can match', function(done) {
      var contactObj = Object.create(contactFB);
      contactObj.id = '9876';
      contactFB.category = ['facebook', 'fb_linked', '123456789'];
      contactObj.category = [];

      testMatch(contactObj, 'active', ['tel', 'email'], done);
    });

    test('Two FB linked Contacts can match if they link the same Friend',
      function(done) {
        var contactObj = Object.create(contactFB);
        contactObj.id = '9876';

        testMatch(contactObj, 'active', ['tel', 'email'], done);
    });

    test('A FB linked Contact cannot match with a Contact linked to another',
      function(done) {
        var contactObj = Object.create(contactFB);
        contactObj.id = 'xc9876';
        contactObj.category = ['facebook', 'fb_linked', '987654321'];

        testMismatch(contactObj, 'active', done);
    });
  });
});
