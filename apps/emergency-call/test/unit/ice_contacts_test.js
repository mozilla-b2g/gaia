/* globals ICEContacts, ICEStore, MocksHelper, mozContact, MockMozContacts */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
require('/shared/js/dialer/utils.js');
require('/shared/test/unit/mocks/mock_ice_store.js');

var mocksHelperForDialer = new MocksHelper([
  'LazyLoader',
  'ICEStore'
]).init();

suite('ICE contacts bar', function() {
  var container, iceContactBar, iceContactsOverlay, realL10n, realMozContacts;

  mocksHelperForDialer.attachTestHelpers();

  function createDOM() {
    container = document.createElement('div');
    iceContactBar = document.createElement('section');
    iceContactBar.id = 'ice-contacts-bar';
    iceContactBar.class = 'ice-contacts-bar';
    iceContactBar.setAttribute('hidden', '');
    iceContactBar.textContent = 'ICE Contacts - In Case of Emergency';
    container.appendChild(iceContactBar);

    loadBodyHTML('/elements/ice_contacts_overlay.html');
    var iceContactsOverlayTemplate =
      document.body.querySelector('template').innerHTML;
    iceContactsOverlay = document.createElement('form');
    iceContactsOverlay.id = 'ice-contacts-overlay';
    iceContactsOverlay.setAttribute('role', 'dialog');
    iceContactsOverlay.setAttribute('data-type', 'action');
    iceContactsOverlay.classList.add('overlay');
    iceContactsOverlay.innerHTML = iceContactsOverlayTemplate;
    container.appendChild(iceContactsOverlay);

    loadBodyHTML('/elements/ice_contacts_overlay_item.html');
    var iceContactsOverlayItemTemplate =
      document.body.querySelector('template').innerHTML;
    var iceContactsOverlayItem = document.createElement('button');
    iceContactsOverlayItem.id = 'ice-contact-overlay-item-template';
    iceContactsOverlayItem.setAttribute('hidden', '');
    iceContactsOverlayItem.innerHTML = iceContactsOverlayItemTemplate;
    container.appendChild(iceContactsOverlayItem);

    document.body.appendChild(container);
  }

  function resetDOM() {
    iceContactBar.setAttribute('hidden', '');
    var iceContactsList = document.getElementById('ice-contacts-list');
    while(iceContactsList.children.length > 1) {
      iceContactsList.removeChild(iceContactsList.children[0]);
    }
  }

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;

    createDOM();

    require('/js/ice_contacts.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozContacts = realMozContacts;
    document.body.removeChild(container);
  });

  suite('No ICE contacts', function() {
    setup(function(done) {
      navigator.mozContacts.clear();
      ICEStore.setContacts([]).then(done);
    });

    teardown(function() {
      resetDOM();
    });

    test('Should hide the ICE contacts bar', function(done) {
      iceContactBar.removeAttribute('hidden');
      ICEContacts.updateICEContacts().then(function() {
        assert.ok(iceContactBar.hasAttribute('hidden'));
        done();
      });
    });
  });

  suite('1 ICE contact with no telephone numbers', function() {
    var contact1;

    setup(function(done) {
      navigator.mozContacts.clear();
      contact1 = new mozContact();
      contact1.givenName = ['ICE Contact'];
      contact1.familyName = ['1'];
      contact1.name = [contact1.givenName[0] + ' ' + contact1.familyName[0]];
      var contact1Req = navigator.mozContacts.save(contact1);
      contact1Req.onsuccess = function() {
        ICEStore.setContacts([contact1.id]).then(done);
      };
    });

    teardown(function() {
      resetDOM();
    });

    test('Should hide the ICE contacts bar', function(done) {
      iceContactBar.removeAttribute('hidden');
      ICEContacts.updateICEContacts().then(function() {
        assert.ok(iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should not include any ICE contacts in the overlay', function(done) {
      iceContactBar.removeAttribute('hidden');
      ICEContacts.updateICEContacts().then(function() {
        assert.equal(
          document.getElementById('ice-contacts-list').children.length, 1);
        done();
      });
    });
  });

  suite('2 ICE contact with no telephone numbers', function() {
    var contact1, contact2;

    setup(function(done) {
      navigator.mozContacts.clear();
      var iceContacts = [];
      contact1 = new mozContact();
      contact1.givenName = ['ICE Contact'];
      contact1.familyName = ['1'];
      contact1.name = [contact1.givenName[0] + ' ' + contact1.familyName[0]];
      var contact1Req = navigator.mozContacts.save(contact1);
      contact1Req.onsuccess = function() {
        iceContacts.push(contact1.id);
        if (iceContacts.length === 2) {
          ICEStore.setContacts(iceContacts).then(done);
        }
      };
      contact2 = new mozContact();
      contact2.givenName = ['ICE Contact'];
      contact2.familyName = ['2'];
      contact2.name = [contact2.givenName[0] + ' ' + contact2.familyName[0]];
      var contact2Req = navigator.mozContacts.save(contact2);
      contact2Req.onsuccess = function() {
        iceContacts.push(contact2.id);
        if (iceContacts.length === 2) {
          ICEStore.setContacts(iceContacts).then(done);
        }
      };
    });

    teardown(function() {
      resetDOM();
    });

    test('Should hide the ICE contacts bar', function(done) {
      iceContactBar.removeAttribute('hidden');
      ICEContacts.updateICEContacts().then(function() {
        assert.ok(iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should not include any ICE contacts in the overlay', function(done) {
      iceContactBar.removeAttribute('hidden');
      ICEContacts.updateICEContacts().then(function() {
        assert.equal(
          document.getElementById('ice-contacts-list').children.length, 1);
        done();
      });
    });
  });

  suite('1 ICE contact with 1 telephone number', function() {
    var contact1;

    setup(function(done) {
      navigator.mozContacts.clear();
      contact1 = new mozContact();
      contact1.givenName = ['ICE Contact'];
      contact1.familyName = ['1'];
      contact1.name = [contact1.givenName[0] + ' ' + contact1.familyName[0]];
      contact1.tel = [
        {
          type: ['home'],
          value: '111111111'
        }
      ];
      var contact1Req = navigator.mozContacts.save(contact1);
      contact1Req.onsuccess = function() {
        ICEStore.setContacts([contact1.id]).then(done);
      };
    });

    teardown(function() {
      resetDOM();
    });

    test('Should show the ICE contacts bar', function(done) {
      ICEContacts.updateICEContacts().then(function() {
        assert.isFalse(
          iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should include the ICE contact in the overlay', function(done) {
      var iceContactList = document.getElementById('ice-contacts-list');
      ICEContacts.updateICEContacts().then(function() {
        assert.equal(iceContactList.children.length, 2);
        done();
      });
    });
  });

  suite('1 ICE contact with 2 telephone number', function() {
    var contact1;

    setup(function(done) {
      navigator.mozContacts.clear();
      contact1 = new mozContact();
      contact1.givenName = ['ICE Contact'];
      contact1.familyName = ['1'];
      contact1.name = [contact1.givenName[0] + ' ' + contact1.familyName[0]];
      contact1.tel = [
        {
          type: ['home'],
          value: '111111111'
        },
        {
          type: ['mobile'],
          value: '222222222'
        }
      ];
      var contact1Req = navigator.mozContacts.save(contact1);
      contact1Req.onsuccess = function() {
        ICEStore.setContacts([contact1.id]).then(done);
      };
    });

    teardown(function() {
      resetDOM();
    });

    test('Should show the ICE contacts bar', function(done) {
      ICEContacts.updateICEContacts().then(function() {
        assert.isFalse(iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should include the ICE contact\'s phone numbers in the overlay',
      function(done) {
        var iceContactList = document.getElementById('ice-contacts-list');
        ICEContacts.updateICEContacts().then(function() {
          assert.equal(iceContactList.children.length, 3);
          done();
        });
      }
    );
  });

  suite('2 ICE contact with 3 telephone numbers the first one and 4 the ' +
        'second one', function() {
    var contact1, contact2;

    setup(function(done) {
      navigator.mozContacts.clear();
      var iceContacts = [];
      contact1 = new mozContact();
      contact1.givenName = ['ICE Contact'];
      contact1.familyName = ['1'];
      contact1.name = [contact1.givenName[0] + ' ' + contact1.familyName[0]];
      contact1.tel = [
        {
          type: ['home'],
          value: '111111111'
        },
        {
          type: ['mobile'],
          value: '222222222'
        },
        {
          type: ['work'],
          value: '333333333'
        }
      ];
      var contact1Req = navigator.mozContacts.save(contact1);
      contact1Req.onsuccess = function() {
        iceContacts.push(contact1.id);
        if (iceContacts.length === 2) {
          ICEStore.setContacts(iceContacts).then(done);
        }
      };
      contact2 = new mozContact();
      contact2.givenName = ['ICE Contact'];
      contact2.familyName = ['2'];
      contact2.name = [contact2.givenName[0] + ' ' + contact2.familyName[0]];
      contact2.tel = [
        {
          type: ['home'],
          value: '444444444'
        },
        {
          type: ['mobile'],
          value: '555555555'
        },
        {
          type: ['work'],
          value: '666666666'
        },
        {
          type: ['other'],
          value: '777777777'
        }
      ];
      var contact2Req = navigator.mozContacts.save(contact2);
      contact2Req.onsuccess = function() {
        iceContacts.push(contact2.id);
        if (iceContacts.length === 2) {
          ICEStore.setContacts(iceContacts).then(done);
        }
      };
    });

    teardown(function() {
      resetDOM();
    });

    test('Should show the ICE contacts bar', function(done) {
      ICEContacts.updateICEContacts().then(function() {
        assert.isFalse(iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should include the ICE contacts\' phone numbers in the overlay',
      function(done) {
        var iceContactList = document.getElementById('ice-contacts-list');
        ICEContacts.updateICEContacts().then(function() {
          assert.equal(iceContactList.children.length, 8);
          done();
        });
      }
    );
  });
});
