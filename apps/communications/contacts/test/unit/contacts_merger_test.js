requireApp('communications/contacts/test/unit/mock_find_matcher.js');
requireApp('communications/contacts/js/contacts_merger.js');

if (!this.toMergeContacts) {
  this.toMergeContacts = null;
}

if (!this.toMergeContact) {
  this.toMergeContact = null;
}

if (!this.realmozContacts) {
  this.realmozContacts = null;
}

suite('Contacts Merging Tests', function() {

  function MasterContact() {
    this.id = '1A';
    this.givenName = ['Alfred'];
    this.familyName = ['Müller'];
    this.tel = [{
      type: ['work'],
      value: '67676767'
    }];
    this.email = [{
      type: ['work'],
      value: 'jj@jj.com'
    }];
    this.org = ['Müller & Co'];
    this.adr = [{
      type: ['work'],
      streetAddress: 'Friedrich',
      locality: 'Madrid',
      region: 'Madrid',
      postalCode: '28009',
      countryName: 'Spanien'
    }];
    this.note = [
      'Ingenieur'
    ];
  }

  suiteSetup(function() {
    toMergeContacts = [{
        matchingContact: null,
        matchings: {}
      }
    ];

    toMergeContact = toMergeContacts[0];

    realmozContacts = navigator.mozContacts;
    navigator.mozContacts = MockFindMatcher;
  });

  suiteTeardown(function() {
    navigator.mozContacts = realmozContacts;
  });

  function assertFieldValues(field, values, property) {
    values.forEach(function(aValue) {
      var val = field.filter(function(x) {
        var testVal = x.value || x;
        if (property) {
          testVal = x[property][0];
        }
        return testVal === aValue;
      });
      assert.lengthOf(val, 1);
    });
  }

  test('Merge first name and last name. First name prefix', function(done) {
    toMergeContact.matchingContact = {
      givenName: ['Alfred Albert'],
      familyName: ['Müller']
    };

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assert.equal(result.givenName[0], 'Alfred');
        assert.equal(result.givenName[1], 'Alfred Albert');
        assert.equal(result.familyName[0], 'Müller');

        done();
      }});
  });

  test('Merge accepts matching results without the `matchings` field',
                                                                function(done) {
    toMergeContact.matchingContact = {
      givenName: ['Alfred Albert'],
      familyName: ['Müller']
    };
    delete toMergeContact.matchings;

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assert.equal(result.givenName[0], 'Alfred');
        assert.equal(result.givenName[1], 'Alfred Albert');
        assert.equal(result.familyName[0], 'Müller');

        done();
    }});
  });

  test('Merge first name and last name. incoming names empty', function(done) {
    toMergeContact.matchingContact = {
      givenName: [],
      familyName: [],
       tel: [{
        type: ['work'],
        value: '67676767'
      }]
    };

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assert.equal(result.givenName[0], 'Alfred');
        assert.equal(result.familyName[0], 'Müller');

        done();
    }});
  });

  test('Merge first name and last name. existing names empty', function(done) {
    toMergeContact.matchingContact = {
      givenName: ['Alfred'],
      familyName: ['Müller von Bismarck'],
       tel: [{
        type: ['work'],
        value: '67676767'
      }]
    };

    var masterContact = new MasterContact();

    masterContact.givenName = null;
    masterContact.familyName = null;

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.equal(result.givenName[0], 'Alfred');
        assert.equal(result.familyName[0], 'Müller von Bismarck');

        done();
    }});
  });

  test('Merge telephone numbers. Adding a new one', function(done) {
    toMergeContact.matchingContact = {
      tel: [{
        type: ['work'],
        value: '67676767'
      },
      {
        type: null,
        value: '0987654'
      }]
    };

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.tel, 2);
        // email is left untouched
        assert.lengthOf(result.email, 1);

        assertFieldValues(result.tel, ['67676767', '0987654']);
        assertFieldValues(result.tel, ['work', 'another'], 'type');

        done();
    }});
  });

  test('Merge telephone numbers. Leaving as they are', function(done) {
    toMergeContact.matchingContact = {
      tel: [{
        type: ['work'],
        value: '67676767'
      }]
    };

    var masterContact = new MasterContact();

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.tel, 1);

        assertFieldValues(result.tel, [masterContact.tel[0].value]);

        done();
    }});
  });

  test('Merge international telephone numbers with local ones', function(done) {
    toMergeContacts[0] = {
      matchingContact: {
        tel: [{
          type: ['work'],
          value: '+3467676767'
        }]
      },
      matchings: {
        'tel': [
          {
            target: '67676767',
            matchedValue: '+3467676767'
          }
        ]
      }
    };

    var masterContact = new MasterContact();

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.tel, 1);
        assertFieldValues(result.tel, [masterContact.tel[0].value]);

        // Restoring
        toMergeContacts[0] = toMergeContact;

        done();
    }});
  });


  test('Merge tel numbers with extra characters and without', function(done) {
    toMergeContacts[0] = {
      matchingContact: {
        tel: [{
          type: ['work'],
          value: '(67)-67. 67 67-()'
        }]
      },
      matchings: {
        'tel': [
          {
            target: '67676767',
            matchedValue: '(67)-67. 67 67-()'
          }
        ]
      }
    };

    var masterContact = new MasterContact();

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.tel, 1);
        assertFieldValues(result.tel, [masterContact.tel[0].value]);

        // Restoring
        toMergeContacts[0] = toMergeContact;

        done();
    }});
  });


  test('Merge emails. Adding a new one', function(done) {
    toMergeContact.matchingContact = {
      email: [{
        type: [],
        value: 'home@sweet.home'
      }]
    };

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.email, 2);
        // tel is left untouched
        assert.lengthOf(result.tel, 1);

        assertFieldValues(result.email, ['jj@jj.com', 'home@sweet.home']);

        assertFieldValues(result.email, ['work', 'personal'], 'type');

        done();
    }});
  });

  test('Merge emails. Leaving as they are', function(done) {
    toMergeContact.matchingContact = {
      email: [{
        type: ['work'],
        value: 'jj@jj.com'
      }]
    };

    var masterContact = new MasterContact();

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.email, 1);

        assertFieldValues(result.email, [masterContact.email[0].value]);

        done();
    }});
  });

  test('Merge comments', function(done) {
    toMergeContact.matchingContact = {
      tel: [{
        type: ['work'],
        value: '67676767'
      }],
      note: ['Another comment for him']
    };

    var masterContact = new MasterContact();

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.note, 2);

        assertFieldValues(result.note, [toMergeContact.matchingContact.note[0],
                                      masterContact.note[0]]);

        done();
    }});
  });

  test('Merge addresses', function(done) {
    toMergeContact.matchingContact = {
       tel: [{
        type: ['work'],
        value: '67676767'
      }],
      adr: [{
        type: null,
        streetAddress: 'Gran Via',
        locality: 'Madrid',
        region: 'Madrid',
        postalCode: '28100',
        countryName: 'España'
      }]
    };

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.adr, 2);
        assertFieldValues(result.adr, ['work', 'home'], 'type');

        done();
    }});
  });

  test('Merge companies. Existing has company', function(done) {
    toMergeContact.matchingContact = {
      tel: [{
        type: ['work'],
        value: '67676767'
      }],
      org: ['ONG and Assoc.']
    };

    var masterContact = new MasterContact();

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.org, 1);
        assertFieldValues(result.org, [masterContact.org[0]]);

        done();
    }});
  });

  test('Merge companies. Existing has no company', function(done) {
    toMergeContact.matchingContact = {
      tel: [{
        type: ['work'],
        value: '67676767'
      }],
      org: ['ONG and Assoc.']
    };

    var masterContact = new MasterContact();
    masterContact.org = null;

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.org, 1);
        assertFieldValues(result.org, [toMergeContact.matchingContact.org[0]]);

        done();
    }});
  });

  test('Merge photo. Existing has no photo', function(done) {
   toMergeContact.matchingContact = {
      tel: [{
        type: ['work'],
        value: '67676767'
      }],
      photo: ['aphoto.jpg']
    };

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.photo, 1);
        assertFieldValues(result.photo,
                          [toMergeContact.matchingContact.photo[0]]);

        done();
    }});
  });

  test('Merge photo. Existing has photo', function(done) {
    toMergeContact.matchingContact = {
      tel: [{
        type: ['work'],
        value: '67676767'
      }],
      photo: ['aphoto.jpg']
    };

    var masterContact = new MasterContact();

    masterContact.photo = ['bphoto.jpg'];

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.photo, 1);
        assertFieldValues(result.photo, [masterContact.photo[0]]);

        done();
    }});
  });

  test('Merge Categories', function(done) {
   toMergeContact.matchingContact = {
      category: ['category1']
    };

    var masterContact = new MasterContact();

    masterContact.category = ['category1', 'category2'];

    contacts.Merger.merge(masterContact, toMergeContacts, {
      success: function(result) {
        assert.lengthOf(result.category, 2);
        assertFieldValues(result.category, masterContact.category);

      done();
    }});
  });

  test('Multiple merges', function(done) {
   toMergeContacts.push({
      matchingContact: {
        id: '1B',
        givenName: ['Alfred'],
        familyName: ['Müller'],
        tel: [{
          type: ['mobile'],
          value: '3456789'
        },
        {
          type: ['mobile'],
          value: '777777'
        }],
        email: [{
          type: ['personal'],
          value: 'personal@example.com'
        },
        {
          type: ['personal'],
          value: 'jj@jj.com'
        }],
        note: [
          'Another note'
        ],
        photo: ['cool.jpg']
      },
      matchings: {}
    });

   toMergeContact.matchingContact = {
      givenName: ['Alfred'],
      familyName: ['Müller'],
      tel: [{
          type: ['mobile'],
          value: '3456789'
      }]
    };

    contacts.Merger.merge(new MasterContact(), toMergeContacts, {
      success: function(result) {
        assertFieldValues(result.givenName, ['Alfred']);
        assertFieldValues(result.familyName, ['Müller']);

        assert.lengthOf(result.tel, 3);
        assertFieldValues(result.tel, ['3456789', '777777', '67676767']);

        assert.lengthOf(result.email, 2);
        assertFieldValues(result.email, ['jj@jj.com', 'personal@example.com']);

        assert.lengthOf(result.adr, 1);
        assert.lengthOf(result.note, 2);

        assert.lengthOf(result.photo, 1);
        assertFieldValues(result.photo, ['cool.jpg']);

        assert.lengthOf(result.org, 1);
        assertFieldValues(result.org, ['Müller & Co']);

      done();
    }});
  });
});
