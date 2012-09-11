
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
    groupFav,
    containerA,
    containerB,
    containerC,
    containerD,
    containerFav;

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
      groupFav = container.querySelector('#group-favorites');
      containerFav = container.querySelector('#contacts-list-favorites');
      assert.isTrue(subject.loaded);
      assert.isNotNull(groupFav);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
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
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['AA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = [newContact].concat(mockContacts);
      subject.load(newList);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      var aContacts = containerA.querySelectorAll('li');
      assert.equal(aContacts.length, 2);
      assert.isTrue(aContacts[0].innerHTML.indexOf('AA') > 1);
      assert.isTrue(aContacts[1].innerHTML.indexOf('AD') > 1);
    });

    test('adding one at the end', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['CZ'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = mockContacts.concat([newContact]);
      subject.load(newList);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      var cContacts = containerC.querySelectorAll('li');
      assert.equal(cContacts.length, 2);
      assert.isTrue(cContacts[0].innerHTML.indexOf('CC') > 1);
      assert.isTrue(cContacts[1].innerHTML.indexOf('CZ') > 1);
    });

    test('adding one in the middle of a group', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['CV'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newContact2 = new MockContactAllFields();
      newContact2.id = '5';
      newContact2.familyName = ['CZ'];
      newContact2.name = [newContact2.givenName + ' ' + newContact2.familyName];
      newContact2.category = null;
      var newList = mockContacts.concat([newContact, newContact2]);
      subject.load(newList);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      var cContacts = containerC.querySelectorAll('li');
      assert.equal(cContacts.length, 3);
      assert.isTrue(cContacts[0].innerHTML.indexOf('CC') > 1);
      assert.isTrue(cContacts[1].innerHTML.indexOf('CV') > 1);
      assert.isTrue(cContacts[2].innerHTML.indexOf('CZ') > 1);
    });

    test('changing contact familyName', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['BV'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = mockContacts.concat([newContact]);
      subject.load(newList);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      var cContacts = containerC.querySelectorAll('li');
      var bContacts = containerB.querySelectorAll('li');
      assert.equal(cContacts.length, 1);
      assert.isTrue(cContacts[0].innerHTML.indexOf('CC') > 1);
      assert.equal(bContacts.length, 2);
      assert.isTrue(bContacts[0].innerHTML.indexOf('BA') > 1);
      assert.isTrue(bContacts[1].innerHTML.indexOf('BV') > 1);
    });

    test('adding first element of a group', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = mockContacts.concat([newContact]);
      assert.isTrue(groupD.classList.contains('hide'));
      subject.load(newList);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      assert.isFalse(groupD.classList.contains('hide'));
      var dContacts = containerD.querySelectorAll('li');
      assert.equal(dContacts.length, 1);
      assert.isTrue(dContacts[0].innerHTML.indexOf('DD') > 1);
    });

    test('removing last element of a group', function() {
      var newList = mockContacts.slice(1);
      assert.isFalse(groupA.classList.contains('hide'));
      subject.load(newList);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      assert.isTrue(groupA.classList.contains('hide'));
      var aContacts = containerA.querySelectorAll('li');
      assert.equal(aContacts.length, 0);
    });

    test('with favorites', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      var newList = mockContacts.concat([newContact]);
      assert.isTrue(groupD.classList.contains('hide'));
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      subject.load(newList);
      assert.isFalse(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 1);
      assert.isFalse(groupD.classList.contains('hide'));
      var dContacts = containerD.querySelectorAll('li');
      assert.equal(dContacts.length, 1);
      assert.isTrue(dContacts[0].innerHTML.indexOf('DD') > 1);
    });

    test('adding one favorite', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      var newList = mockContacts.concat([newContact]);
      newList[0].category = ['favorite'];
      assert.isFalse(groupD.classList.contains('hide'));
      assert.isFalse(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 1);
      subject.load(newList);
      var dContacts = containerD.querySelectorAll('li');
      assert.isFalse(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 2);
      assert.equal(dContacts.length, 1);
      assert.isFalse(groupD.classList.contains('hide'));
      assert.isTrue(dContacts[0].innerHTML.indexOf('DD') > 1);
      var aContacts = containerA.querySelectorAll('li');
      assert.equal(aContacts.length, 1);
      assert.isTrue(aContacts[0].innerHTML.indexOf('AD') > 1);
    });

    test('removing all favorites', function() {
      assert.isFalse(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 2);
      mockContacts[0].category = null;
      subject.load(mockContacts);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      var aContacts = containerA.querySelectorAll('li');
      var bContacts = containerB.querySelectorAll('li');
      var cContacts = containerC.querySelectorAll('li');
      assert.equal(aContacts.length, 1);
      assert.equal(bContacts.length, 1);
      assert.equal(cContacts.length, 1);
      var total = container.querySelectorAll('ol li:not(.hide)').length;
      assert.equal(total, 3);
    });

    test('removing all contacts', function() {
      subject.load([]);
      assert.isTrue(groupFav.classList.contains('hide'));
      assert.equal(containerFav.querySelectorAll('li').length, 0);
      var total = container.querySelectorAll('ol li:not(.hide)').length;
      assert.equal(total, 0);
    });
  });
});
