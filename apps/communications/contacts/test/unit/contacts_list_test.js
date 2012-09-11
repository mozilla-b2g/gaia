
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
    containerFav,
    list;

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
    list = container.querySelector('#groups-list');
    document.body.appendChild(container);
    subject.init(list);
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
      groupA = container.querySelector('#group-A');
      containerA = container.querySelector('#contacts-list-A');
      groupB = container.querySelector('#group-B');
      containerB = container.querySelector('#contacts-list-B');
      groupC = container.querySelector('#group-C');
      containerC = container.querySelector('#contacts-list-C');
      groupD = container.querySelector('#group-D');
      containerD = container.querySelector('#contacts-list-D');

      assert.isTrue(subject.loaded);
      assertNoGroup(groupFav, containerFav);
      assertGroup(groupA, containerA, 1);
      assertGroup(groupB, containerB, 1);
      assertGroup(groupB, containerC, 1);
      assertNoGroup(groupD, containerD);

      var importButton = container.querySelectorAll('#sim_import_button');
      assert.equal(importButton.length, 0);
    });

    test('adding one at the beginning', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['AA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = [newContact].concat(mockContacts);
      subject.load(newList);
      assertNoGroup(groupFav, containerFav);
      var aContacts = assertGroup(groupA, containerA, 2);
      assert.isTrue(aContacts[0].innerHTML.indexOf('AA') > 1);
      assert.isTrue(aContacts[1].innerHTML.indexOf('AD') > 1);
      assertTotal(3, 4);
    });

    test('adding one at the end', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['CZ'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = mockContacts.concat([newContact]);
      subject.load(newList);
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 2);
      assert.isTrue(cContacts[0].innerHTML.indexOf('CC') > 1);
      assert.isTrue(cContacts[1].innerHTML.indexOf('CZ') > 1);
      assertTotal(3, 4);
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
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 3);
      assert.isTrue(cContacts[0].innerHTML.indexOf('CC') > 1);
      assert.isTrue(cContacts[1].innerHTML.indexOf('CV') > 1);
      assert.isTrue(cContacts[2].innerHTML.indexOf('CZ') > 1);
      assertTotal(3, 5);
    });

    test('changing contact familyName', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['BV'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = mockContacts.concat([newContact]);
      subject.load(newList);
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      var bContacts = assertGroup(groupB, containerB, 2);
      assert.isTrue(bContacts[0].innerHTML.indexOf('BA') > 1);
      assert.isTrue(bContacts[1].innerHTML.indexOf('BV') > 1);
      assertTotal(3, 4);
    });

    test('adding first element of a group', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      var newList = mockContacts.concat([newContact]);
      assertNoGroup(groupD, containerD);
      subject.load(newList);
      assertNoGroup(groupFav, containerFav);
      var dContacts = assertGroup(groupD, containerD, 1);
      assert.isTrue(dContacts[0].innerHTML.indexOf('DD') > 1);
      assertTotal(4, 4);
    });

    test('removing last element of a group', function() {
      var newList = mockContacts.slice(1);
      assertGroup(groupA, containerA, 1);
      subject.load(newList);
      assertNoGroup(groupFav, containerFav);
      assertNoGroup(groupA, containerA);
      assertTotal(2, 2);
    });

    test('with favorites', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      var newList = mockContacts.concat([newContact]);
      assertNoGroup(groupFav, containerFav);
      assertNoGroup(groupD, containerD);
      subject.load(newList);
      var dContacts = assertGroup(groupD, containerD, 1);
      assertGroup(groupFav, containerFav, 1);
      assert.isTrue(dContacts[0].innerHTML.indexOf('DD') > 1);
      assertTotal(5, 5);
    });

    test('adding one favorite', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      var newList = mockContacts.concat([newContact]);
      newList[0].category = ['favorite'];
      assertGroup(groupD, containerD, 1);
      assertGroup(groupFav, containerFav, 1);
      subject.load(newList);
      var dContacts = assertGroup(groupD, containerD, 1);
      assertGroup(groupFav, containerFav, 2);
      assert.isTrue(dContacts[0].innerHTML.indexOf('DD') > 1);
      var aContacts = assertGroup(groupA, containerA, 1);
      assert.isTrue(aContacts[0].innerHTML.indexOf('AD') > 1);
      assertTotal(5, 6);
    });

    test('removing all favorites', function() {
      assertGroup(groupFav, containerFav, 2);
      mockContacts[0].category = null;
      subject.load(mockContacts);
      assertNoGroup(groupFav, containerFav);
      assertGroup(groupA, containerA, 1);
      assertGroup(groupB, containerB, 1);
      assertGroup(groupC, containerC, 1);
      assertTotal(3, 3);
    });

    test('removing all contacts', function() {
      subject.load([]);
      assertNoGroup(groupFav, containerFav);
      var importButton = container.querySelectorAll('#sim_import_button');
      assert.equal(importButton.length, 1);
      var total = list.querySelectorAll('h2:not(.hide)').length;
      var totalC = list.querySelectorAll('li[data-uuid]').length;
      assert.equal(total, 0);
      assert.equal(totalC, 0);
    });
  });
});

function assertNoGroup(title, container) {
  assert.isTrue(title.classList.contains('hide'));
  assert.equal(container.querySelectorAll('li').length, 0);
}

function assertGroup(title, container, num) {
  assert.isFalse(title.classList.contains('hide'));
  assert.equal(container.querySelectorAll('li').length, num);
  return container.querySelectorAll('li');
}

function assertTotal(lengthTitles, lengthContacts) {
  var total = list.querySelectorAll('h2:not(.hide)').length;
  var totalC = list.querySelectorAll('li[data-uuid]').length;
  assert.equal(total, lengthTitles);
  assert.equal(totalC, lengthContacts);
}
