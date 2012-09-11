
requireApp('communications/contacts/js/contacts_list.js');
requireApp('communications/contacts/js/utilities/normalizer.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contact_all_fields.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_fixed_header.js');
requireApp('communications/contacts/test/unit/mock_fb.js');


var subject,
    container,
    realL10n,
    realContacts,
    realFb,
    Contacts,
    fb,
    FixedHeader,
    utils,
    realUtils,
    mockContacts,
    mozL10n,
    groupA,
    groupB,
    groupC,
    groupD,
    containerA,
    containerB,
    containerC,
    containerD;

suite('Render contacts list', function() {

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      },
      DateTimeFormat: function() {
        this.localeFormat = function(date, format) {
          return date;
        }
      }
    };
    realContacts = window.Contacts;
    window.Contacts = MockContactsApp;
    realFb = window.fb;
    window.fb = MockFb;
    FixedHeader = MockFixedHeader;
    window.utils = window.utils || {};
    window.utils.alphaScroll = MockAlphaScroll;
    subject = contacts.List;
    container = document.createElement('div');
    var groupsContainer = document.createElement('div');
    groupsContainer.id = 'groups-container';
    groupsContainer.innerHTML = '<ol class="block-list" id="groups-list"></ol>';
    groupsContainer.innerHTML += '<div id="fixed-container" ';
    groupsContainer.innerHTML += 'class="fixed-title"> </div>';
    groupsContainer.innerHTML += '<div id="current-jumper" ';
    groupsContainer.innerHTML += 'class="view-jumper-current"></div>';
    container.appendChild(groupsContainer);
    document.body.appendChild(container);
    subject.init(container);
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    window.fb = realFb;
    window.mozL10n = realL10n;
  });

  setup(function() {
  });

  teardown(function() {
  });

  suite('Render list', function() {
    test('first time', function() {
      mockContacts = new MockContactsList();
      subject.load(mockContacts);
      assert.isTrue(subject.loaded);
      groupA = container.querySelector('#group-A');
      containerA = container.querySelector('#contacts-list-A');
      assert.isNotNull(groupA);
      assert.isFalse(groupA.classList.contains('hide'));
      assert.equal(containerA.querySelectorAll('li').length, 1);
      groupB = container.querySelector('#group-B');
      containerB = container.querySelector('#contacts-list-B');
      assert.isNotNull(groupB);
      assert.isFalse(groupB.classList.contains('hide'));
      assert.equal(containerB.querySelectorAll('li').length, 1);
      groupC = container.querySelector('#group-C');
      containerC = container.querySelector('#contacts-list-C');
      assert.isNotNull(groupC);
      assert.isFalse(groupC.classList.contains('hide'));
      assert.equal(containerC.querySelectorAll('li').length, 1);
      groupD = container.querySelector('#group-D');
      containerD = container.querySelector('#contacts-list-D');
      assert.isNotNull(groupD);
      assert.isTrue(groupD.classList.contains('hide'));
      assert.equal(containerD.querySelectorAll('li').length, 0);
    });

    test('adding one at the beginning', function() {
      console.log("COMIENZA TEST 2");
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['AA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      var newList = [newContact].concat(mockContacts);
      subject.load(newList);
      var aContacts = containerA.querySelectorAll('li');
      assert.equal(aContacts.length, 2);
      assert.isTrue(aContacts[0].innerHTML.indexOf('AA') > 1);
      assert.isTrue(aContacts[1].innerHTML.indexOf('AD') > 1);

    });

    test('adding one at the end', function() {
    });

    test('adding first element of a group', function() {
    });

    test('removing last element of a group', function() {
    });

    test('with favorites', function() {
    });

    test('adding one favorite', function() {
    });

    test('removing last favorite', function() {
    });
  });
});
