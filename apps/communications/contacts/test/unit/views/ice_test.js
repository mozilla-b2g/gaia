/* global MockImageLoader */
/* global MocksHelper */
/* global loadBodyHTML */
/* global ICEData */
/* global ICEView */

'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/contacts/utilities/ice_store.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/test/unit/mock_ice_data.js');

var mocksForICe = new MocksHelper([
  'Contacts', 'ICEData', 'LazyLoader'
]).init();

suite('ICE contacts view', function() {
  mocksForICe.attachTestHelpers();

  function dummyRowBuilder(id, node) {
    return node.cloneNode(true);
  }

  var realImageLoader;
  var fakeContacts = [
    {
      id: 1,
      displayName: 'Mark Botellas'
    },
    {
      id: 2,
      displayName: 'Tom Wislow'
    },
    {
      id: 3,
      displayName: 'Alex Kid'
    }
  ];

  suiteSetup(function(done) {
    realImageLoader = window.ImageLoader;
    window.ImageLoader = MockImageLoader;
    requireApp('communications/contacts/js/views/ice.js', done);
  });

  setup(function() {
    cleanHTML();
  });

  suiteTeardown(function() {
    window.ImageLoader = realImageLoader;
  });

  function cleanHTML() {
    loadBodyHTML('/contacts/elements/ice.html');
    // We loaded a template, expand it and leave the desired dom
    var template = document.getElementsByTagName('template')[0].innerHTML;
    var section = document.createElement('section');
    section.id = 'ice-view';
    section.innerHTML = template;
    document.body.innerHTML = '';
    document.body.appendChild(section);
  }

  // Helper function to create fake contacts list
  // elements to be used in the ice list.
  function createContactsListRows(contacts) {
    var section = document.createElement('section');
    section.id = 'contacts-list';
    contacts.forEach(function(contact) {
      var li = document.createElement('li');
      li.dataset.uuid = contact.id;
      li.innerHTML = '<p>' + contact.displayName + '</p>';
      section.appendChild(li);
    });
    document.body.appendChild(section);
  }

  function defaultContacts() {
    createContactsListRows(fakeContacts);
  }

  suite('> initialization', function() {
    setup(function() {
      defaultContacts();
    });

    test('> init with ids', function() {
      ICEView.init([1,2], dummyRowBuilder);
      var ice1 = document.querySelector('#ice-list [data-uuid="1"]');
      var ice2 = document.querySelector('#ice-list [data-uuid="2"]');

      assert.isNotNull(ice1);
      assert.isNotNull(ice2);
    });

    test('> init with invalid ice contacts', function() {
      ICEView.init([1,2], dummyRowBuilder);

      var ice3 = document.querySelector('#ice-list [data-uuid="3"]');
      assert.isNull(ice3);

    });
  });

  suite('> Contacts changed', function() {
    setup(function() {
      defaultContacts();
      ICEView.init([1,2], dummyRowBuilder);
      this.clock = sinon.useFakeTimers();
    });

    teardown(function() {
      this.clock.restore();
    });

    test('> ICE contact changed', function() {
      // Change an element in the 'list', and trigger custom
      // contact change
      var ice1 = document.querySelector('#ice-list [data-uuid="1"]');
      assert.isTrue(ice1.innerHTML.indexOf(fakeContacts[0].displayName) !== -1);

      // Change the contact
      var contact1 = document.querySelector('#contacts-list [data-uuid="1"]');
      contact1.firstChild.textContent = 'Peter Pan';

      // Simulate a contact change
      ICEData.iceContacts = [ {
        id: 1,
        active: true
      }];
      ICEData._mTriggerChange();

      this.clock.tick(500);
      ice1 = document.querySelector('#ice-list [data-uuid="1"]');
      assert.equal(contact1.innerHTML, ice1.innerHTML);
    });
  });
});
