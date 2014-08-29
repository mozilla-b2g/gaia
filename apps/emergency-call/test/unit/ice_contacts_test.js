/* globals ICEContacts, ICEStore, MocksHelper, mozContact, MockMozContacts */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
require('/shared/js/dialer/utils.js');
require('/shared/test/unit/mocks/mock_ice_store.js');
require('/test/unit/mock_call_handler.js');

var mocksHelperForDialer = new MocksHelper([
  'LazyLoader',
  'ICEStore',
  'CallHandler'
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

    loadBodyHTML('/shared/elements/contacts/contact_list_overlay.html');
    var iceContactsOverlayTemplate =
      document.body.querySelector('template').innerHTML;
    iceContactsOverlay = document.createElement('form');
    iceContactsOverlay.id = 'contact-list-overlay';
    iceContactsOverlay.setAttribute('role', 'dialog');
    iceContactsOverlay.setAttribute('data-type', 'action');
    iceContactsOverlay.classList.add('overlay');
    iceContactsOverlay.innerHTML = iceContactsOverlayTemplate;
    container.appendChild(iceContactsOverlay);

    loadBodyHTML('/shared/elements/contacts/contact_in_overlay.html');
    var iceContactsOverlayItemTemplate =
      document.body.querySelector('template').innerHTML;
    var iceContactsOverlayItem = document.createElement('button');
    iceContactsOverlayItem.id = 'contact-in-overlay';
    iceContactsOverlayItem.setAttribute('hidden', '');
    iceContactsOverlayItem.innerHTML = iceContactsOverlayItemTemplate;
    container.appendChild(iceContactsOverlayItem);

    document.body.appendChild(container);
  }

  function shouldNotShowICEContactsBar(done) {
    ICEContacts.updateICEContacts().then(function() {
      assert.ok(iceContactBar.hasAttribute('hidden'));
      done();
    });
  }

  function shouldIncludeICEContacts(done, length) {
    var iceContactList = document.getElementById('contact-list');
    ICEContacts.updateICEContacts().then(function() {
      assert.equal(iceContactList.children.length, length);
      done();
    });
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

  teardown(function() {
    iceContactBar.setAttribute('hidden', '');
    var iceContactsList = document.getElementById('contact-list');
    while(iceContactsList.children.length > 1) {
      iceContactsList.removeChild(iceContactsList.children[0]);
    }
  });

  suite('No ICE contacts', function() {
    setup(function(done) {
      navigator.mozContacts.clear();
      ICEStore.setContacts([]).then(done);
    });

    test('Should not show the ICE contacts bar', shouldNotShowICEContactsBar);
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

    test('Should not show the ICE contacts bar', shouldNotShowICEContactsBar);
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

    test('Should not show the ICE contacts bar', function(done) {
      ICEContacts.updateICEContacts().then(function() {
        assert.ok(iceContactBar.hasAttribute('hidden'));
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

    test('Should show the ICE contacts bar', function(done) {
      ICEContacts.updateICEContacts().then(function() {
        assert.isFalse(
          iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should include the ICE contact in the overlay', function(done) {
      shouldIncludeICEContacts(done, 2);
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

    test('Should show the ICE contacts bar', function(done) {
      ICEContacts.updateICEContacts().then(function() {
        assert.isFalse(iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should include the ICE contact\'s phone numbers in the overlay',
    function(done) {
      shouldIncludeICEContacts(done, 3);
    });
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

    test('Should show the ICE contacts bar', function(done) {
      ICEContacts.updateICEContacts().then(function() {
        assert.isFalse(iceContactBar.hasAttribute('hidden'));
        done();
      });
    });

    test('Should include the ICE contacts\' phone numbers in the overlay',
    function(done) {
      shouldIncludeICEContacts(done, 8);
    });
  });

  suite('Is from ICE contacts', function() {
    var contact1;
    var contact2;

    setup(function(done) {
      navigator.mozContacts.clear();
      contact1 = new mozContact();
      contact1.givenName = ['ICE Contact'];
      contact1.familyName = ['1'];
      contact1.name = [contact1.givenName[0] + ' ' + contact1.familyName[0]];
      contact1.tel = [
        {
          type: ['home'],
          value: '123'
        }
      ];
      contact2 = new mozContact();
      contact2.givenName = ['ICE Contact'];
      contact2.familyName = ['2'];
      contact2.name = [contact2.givenName[0] + ' ' + contact2.familyName[0]];
      contact2.tel = [
        {
          type: ['home'],
          value: '456'
        }
      ];
      var contact1Req = navigator.mozContacts.save(contact1);
      contact1Req.onsuccess = function() {
        ICEStore.setContacts([contact1.id]).then(done);
      };
    });

    test('Should include contact1', function() {
      ICEContacts.updateICEContacts().then(function() {
        assert.isTrue(ICEContacts.isFromICEContact('123'));
      });
    });

    test('Should not include contact2', function() {
      ICEContacts.updateICEContacts().then(function() {
        assert.isFalse(ICEContacts.isFromICEContact('456'));
      });
    });
  });

  suite('Should create correct DOM', function() {
    var contact1;

    setup(function(done) {
      this.sinon.spy(MockL10n, 'get');

      navigator.mozContacts.clear();
      contact1 = new mozContact();
      contact1.givenName = ['ICE Contact'];
      contact1.familyName = ['1'];
      contact1.name = [contact1.givenName[0] + ' ' + contact1.familyName[0]];
      contact1.tel = [
        {
          type: ['home'],
          value: '123'
        }
      ];
      var contact1Req = navigator.mozContacts.save(contact1);
      contact1Req.onsuccess = function() {
        ICEStore.setContacts([contact1.id]).then(function() {
          ICEContacts.updateICEContacts().then(done);
        });
      };
    });

    test('Should include name element', function() {
      assert.equal(iceContactsOverlay.querySelector('.js-name').textContent,
                   contact1.name);
    });

    test('Should include tel-type element', function() {
      assert.equal(iceContactsOverlay.querySelector('.js-tel-type').textContent,
                   contact1.tel[0].type);
      sinon.assert.calledWith(MockL10n.get, contact1.tel[0].type[0]);
    });

    test('Should include time element', function() {
      assert.equal(iceContactsOverlay.querySelector('.js-tel').textContent,
                   contact1.tel[0].value);
    });

    test('Should include cancel button', function() {
      assert.ok(
        iceContactsOverlay.querySelector('#contact-list-overlay-cancel'));
    });

    test('Tapping a contact dials them', function() {
      this.sinon.spy(CallHandler, 'call');
      iceContactsOverlay.querySelector('button').click();
      sinon.assert.calledWith(CallHandler.call, contact1.tel[0].value);
    });
  });
});
