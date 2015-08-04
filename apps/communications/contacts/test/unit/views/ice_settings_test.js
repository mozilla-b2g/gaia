'use strict';

/* global loadBodyHTML */
/* global MocksHelper */
/* global contacts */
/* global asyncStorage */
/* global MockContactsListObj */
/* global ContactsService */
/* global ConfirmDialog */
/* global ICEData, MockContactsSettings, ICE */

requireApp('communications/contacts/test/unit/mock_header_ui.js');
requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
requireApp('communications/contacts/js/utilities/ice_data.js');
requireApp('communications/contacts/js/views/ice_settings.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_contacts_settings.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia_switch/script.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_ice_store.js');

var mocksHelper = new MocksHelper([
  'asyncStorage',
  'Cache',
  'ConfirmDialog',
  'Contacts',
  'ICEStore',
  'HeaderUI'
]);
mocksHelper.init();

suite('ICE Settings view', function() {
  var subject;
  var realContactsList;
  var realContactsSettings;
  var defaultLabel = 'ICESelectContact';

  var cid1 = '1', cid2 = '2', fbcid3 = '3';

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    subject = ICE;
    realContactsSettings = contacts.Settings;
    contacts.Settings = MockContactsSettings;
    realContactsList = contacts.List;
    contacts.List = MockContactsListObj;
  });

  suiteTeardown(function() {
    contacts.List = realContactsList;
    contacts.Settings = realContactsSettings;
  });

  setup(function() {
    setupHTML();
    this.sinon.stub(
      ContactsService,
      'get',
      function(id, successCB, errorCB) {
        if (!id) {
          successCB();
          return;
        }

        var contacts = [];
        contacts.push({
          id: cid1,
          givenName: ['John'],
          familyName: ['Doe']
        });
        contacts.push({
          id: cid2,
          givenName: ['Albert'],
          familyName: ['Pla']
        });
        contacts.push({
          id: fbcid3,
          givenName: ['Cristian'],
          familyName: ['Martin'],
          isFB: true
        });

        var contact = contacts[id - 1];
        successCB(contact, contact.isFB);
      }
    );

  });

  teardown(function() {
    subject.reset();
    window.asyncStorage.clear();
    ContactsService.get.restore();
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

  function assertIceContacts(iceStates) {
    var ice1 = document.getElementById('select-ice-contact-1');
    assert.equal(ice1.dataset.contactId, iceStates[0].contactId);

    if (iceStates[0].label) {
      assert.equal(ice1.textContent.trim(), iceStates[0].label);
    }
    else {
      assert.equal(ice1.dataset.l10nId, defaultLabel);
    }

    var ice2 = document.getElementById('select-ice-contact-2');
    assert.equal(ice2.dataset.contactId, iceStates[1].contactId);

    if (iceStates[1].label) {
      assert.equal(ice2.textContent.trim(), iceStates[1].label);
    }
    else {
      assert.equal(ice2.dataset.l10nId, defaultLabel);
    }

    assert.equal(ice1.disabled, !iceStates[0].active);
    assert.equal(ice2.disabled, !iceStates[1].active);

    var iceCheck1 = document.querySelector('[name="ice-contact-1-enabled"]');
    var iceCheck2 = document.querySelector('[name="ice-contact-2-enabled"]');
    assert.ok(!iceCheck1.disabled);
    assert.ok(!iceCheck2.disabled);
  }

  suite('> Initialization', function() {
    setup(function() {
      this.sinon.spy(asyncStorage, 'getItem');
    });

    test('> No ice contacts', function(done) {
      window.asyncStorage.keys = {
        'ice-contacts': []
      };

      subject.refresh(function() {
        // On init and when we do the listening
        sinon.assert.calledOnce(asyncStorage.getItem);

        assertIceContacts([{ contactId: '', active: false},
                         { contactId: '', active: false}]);
        done();
      });
    });

    test('> With 1 contact enabled. ICE Contact 1', function(done) {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: cid1,
            active: true
          }
        ]
      };

      subject.refresh(function() {
        sinon.assert.calledTwice(ContactsService.get);

        assertIceContacts([{ contactId: cid1, label: 'John Doe', active: true},
                         { contactId: '', active: false}]);
        done();
      });
    });

    test('> With 1 contact enabled. ICE Contact 2', function(done) {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {},
          {
            id: cid2,
            active: true
          }
        ]
      };

      subject.refresh(function() {
        sinon.assert.calledTwice(ContactsService.get);

        assertIceContacts([{ contactId: '', active: false},
                      { contactId: cid2, label: 'Albert Pla', active: true}]);
        done();
      });
    });

    test('> With 1 contact enabled. No name. Only has tel number',
      function(done) {
        window.asyncStorage.keys = {
          'ice-contacts': [
            {
              id: cid1,
              active: true
            }
          ]
        };

        var targetTelNumber = '678987654';

        ContactsService.get.restore();

        this.sinon.stub(
          ContactsService,
          'get',
          function(id, successCB, errorCB) {
            if (!id) {
              successCB();
              return;
            }

            var contacts = [];
            contacts.push({
              id: cid1,
              givenName: [],
              familyName: null,
              tel: [
                {
                  type: ['other'],
                  value: targetTelNumber
                }
              ]
            });
            var contact = contacts[id - 1];
            successCB(contact);
          }
        );


        subject.refresh(function() {
          sinon.assert.calledTwice(ContactsService.get);

          assertIceContacts([{
            label: targetTelNumber, contactId: cid1, active: true
          },{
              contactId: '', active: false
          }]);

          done();
        });
    });

    test('> With ICE contact 1 disabled', function(done) {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: null,
            active: false
          }
        ]
      };

      subject.refresh(function() {
        sinon.assert.calledTwice(ContactsService.get);

        assertIceContacts([{ contactId: '', active: false},
                         { contactId: '', active: false}]);

        done();
      });
    });

    test('> With ICE contact 2 disabled', function(done) {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {},
          {
            id: null,
            active: false
          }
        ]
      };

      subject.refresh(function() {
        sinon.assert.calledTwice(ContactsService.get);

        assertIceContacts([{ contactId: '', active: false},
                            { contactId: '', active: false}]);

        done();
      });
    });

    test('> With 2 contacts enabled', function(done) {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: cid1,
            active: true
          }, {
            id: cid2,
            active: true
          }
        ]
      };

      subject.refresh(function() {
        sinon.assert.calledTwice(ContactsService.get);

        assertIceContacts([{ contactId: cid1, label: 'John Doe', active: true},
                      { contactId: cid2, label: 'Albert Pla', active: true}]);

        done();
      });
    });
  });

  suite('> Modify ICE contacts', function() {
    suiteSetup(function() {
      sinon.spy(ICEData, 'setICEContact');
    });

    suiteTeardown(function() {
      ICEData.setICEContact.restore();
    });

    setup(function() {
      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: cid1,
            active: true
          }, {
            id: cid2,
            active: true
          }
        ]
      };
    });

    test('> change state saves ICE Datastore', function(done) {
      subject.refresh(function() {
        var switch1 = document.querySelector('[name=ice-contact-1-enabled]');
        // Disable 1
        switch1.click();

        sinon.assert.calledOnce(ICEData.setICEContact);
        sinon.assert.calledWith(ICEData.setICEContact, null, 0, false);

        done();
      });
    });

    test('> remove ICE Contact 1 and ICE Contact 2 remains', function(done) {
      subject.refresh(function() {
        assertIceContacts([{ contactId: cid1, label: 'John Doe', active: true},
                      { contactId: cid2, label: 'Albert Pla', active: true}]);

        ICEData.removeICEContact(cid1).then(function() {
          subject.refresh(function() {
            assertIceContacts([{ contactId: '', active: false},
                      { contactId: cid2, label: 'Albert Pla', active: true}]);
            done();
          });
        });
      });
    });

  });

  suite('> Error handling ', function() {

    var handleClick;

    setup(function() {

      this.sinon.stub(contacts.List, 'handleClick', function(cb) {
        handleClick = cb;
      });

      window.asyncStorage.keys = {
        'ice-contacts': [
          {
            id: cid1,
            active: true
          }
        ]
      };


    });

    teardown(function() {
      handleClick = null;
    });

    function clickOnList(id) {
      document.getElementById('select-ice-contact-1').click();
      handleClick(id);
    }

    function assertErrorMessage(code, expectedCode, cb) {
      assert.equal(code, expectedCode);
      ConfirmDialog.show.restore();
      cb();
    }

    test(' repeated contact', function(done) {
      subject.refresh(function() {
        clickOnList(cid1);
        sinon.stub(ConfirmDialog, 'show', function(param1, code) {
          assertErrorMessage(code, 'ICERepeatedContact', done);
        });
      });
    });

    test(' facebook contact', function(done) {
      subject.refresh(function() {
        clickOnList(fbcid3);
        sinon.stub(ConfirmDialog, 'show', function(param1, code) {
          assertErrorMessage(code, 'ICEFacebookContactNotAllowed', done);
        });
      });
    });

  });
});
