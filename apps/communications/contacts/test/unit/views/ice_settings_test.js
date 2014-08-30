'use strict';

/* global loadBodyHTML */
/* global MocksHelper */
/* global contacts */
/* global asyncStorage */
/* global MockContactsListObj */
/* global MockICEStore */

requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/js/views/ice_settings.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
require('/shared/test/unit/mocks/mock_ice_store.js');

var mocksHelper = new MocksHelper([
  'asyncStorage', 'ICEStore'
]);
mocksHelper.init();

suite('ICE Settings view', function() {
  var subject;
  var realContactsList;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    subject = contacts.ICE;
    realContactsList = contacts.List;
    contacts.List = MockContactsListObj;
  });

  setup(function() {
    setupHTML();
  });

  teardown(function() {
    subject.reset();
    window.asyncStorage.clear();
  });

  function setupHTML() {
    loadBodyHTML('/contacts/elements/settings.html');
    // We loaded a template, expand it
    var template = document.getElementsByTagName('template')[0].innerHTML;
    var section = document.createElement('section');
    section.id = 'settings-wrapper';
    section.innerHTML = template;
    document.body.innerHTML = '';
    document.body.appendChild(section);
  }

  suiteTeardown(function() {
    contacts.List = realContactsList;
  });

  suite('> Initialization', function() {
    setup(function() {
      this.sinon.spy(asyncStorage, 'getItem');
      this.sinon.stub(contacts.List, 'getContactById', function(id, cb) {
        var contacts = [
        {
          givenName: ['John'],
          familyName: ['Doe']
        },{
          givenName: ['Albert'],
          familyName: ['Pla']
        }];
        // Hoping ide 1 and 2
        cb(contacts[id - 1]);
      });
      
    });

    test('> No ice contacts', function() {
      subject.init();
      sinon.assert.calledOnce(asyncStorage.getItem);
      var ice1 = document.getElementById('select-ice-contact-1');
      assert.equal(ice1.textContent.trim(), 'Select a contact');
      var ice2 = document.getElementById('select-ice-contact-2');
      assert.equal(ice2.textContent.trim(), 'Select a contact');
      assert.isTrue(ice1.disabled);
      assert.isTrue(ice2.disabled);
      var iceCheck1 = document.querySelector('[name="ice-contact-1-enabled"]');
      var iceCheck2 = document.querySelector('[name="ice-contact-2-enabled"]');
      assert.isFalse(iceCheck1.disabled);
      assert.isFalse(iceCheck2.disabled);
    });

    test('> With 1 contact enabled', function() {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: 1,
            active: true
          }
        ]
      };

      subject.init(true);
      sinon.assert.calledOnce(contacts.List.getContactById);
      var ice1 = document.getElementById('select-ice-contact-1');
      assert.equal(ice1.textContent.trim(), 'John Doe');
      var ice2 = document.getElementById('select-ice-contact-2');
      assert.equal(ice2.textContent.trim(), 'Select a contact');
      assert.isFalse(ice1.disabled);
      assert.isTrue(ice2.disabled);
      var iceCheck1 = document.querySelector('[name="ice-contact-1-enabled"]');
      var iceCheck2 = document.querySelector('[name="ice-contact-2-enabled"]');
      assert.isFalse(iceCheck1.disabled);
      assert.isFalse(iceCheck2.disabled);

    });

    test('> With 1 contact disabled', function() {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: 1,
            active: false
          }
        ]
      };

      subject.init(true);
      sinon.assert.calledOnce(contacts.List.getContactById);
      var ice1 = document.getElementById('select-ice-contact-1');
      assert.equal(ice1.textContent.trim(), 'John Doe');
      var ice2 = document.getElementById('select-ice-contact-2');
      assert.equal(ice2.textContent.trim(), 'Select a contact');
      assert.isTrue(ice1.disabled);
      assert.isTrue(ice2.disabled);
    });

    test('> With 2 contacts enabled', function() {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: 1,
            active: true
          }, {
            id: 2,
            active: true
          }
        ]
      };

      subject.init(true);
      sinon.assert.calledTwice(contacts.List.getContactById);
      var ice1 = document.getElementById('select-ice-contact-1');
      assert.equal(ice1.textContent.trim(), 'John Doe');
      var ice2 = document.getElementById('select-ice-contact-2');
      assert.equal(ice2.textContent.trim(), 'Albert Pla');
      assert.isFalse(ice1.disabled);
      assert.isFalse(ice2.disabled);
    });
  });

  suite('> Modify ICE contacts', function() {
    setup(function() {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: 1,
            active: true
          }, {
            id: 2,
            active: true
          }
        ]
      };

      this.sinon.spy(MockICEStore, 'setContacts');
    });

    test('> change state saves ICE Datastore', function() {
      var switch1 = document.getElementById('ice-contacts-1-switch');
      subject.init();
      // Disable 1
      switch1.click();
      sinon.assert.calledOnce(MockICEStore.setContacts);
      sinon.assert.calledWith(MockICEStore.setContacts, [2]);
    });
  });

});