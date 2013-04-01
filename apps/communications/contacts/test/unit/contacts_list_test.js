requireApp('/shared/lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/js/search.js');
requireApp('communications/contacts/js/contacts_list.js');
requireApp('communications/contacts/js/utilities/normalizer.js');
requireApp('communications/contacts/js/utilities/dom.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contact_all_fields.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_fixed_header.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_extfb.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/test/unit/mock_performance_testing_helper.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.Contacts) {
  this.Contacts = null;
}

if (!this.contacts) {
  this.contacts = null;
}

if (!this.fb) {
  this.fb = null;
}
if (!this.FixedHeader) {
  this.FixedHeader = null;
}

if (!this.mozL10n) {
  this.mozL10n = null;
}

if (!this.ActivityHandler) {
  this.ActivityHandler = null;
}

if (!this.ImageLoader) {
  this.ImageLoader = null;
}

if (!this.PerformanceTestingHelper) {
  this.PerformanceTestingHelper = null;
}

if (!this.asyncStorage) {
  this.asyncStorage = null;
}

var URL = null;


suite('Render contacts list', function() {
  var subject,
      container,
      containerSection,
      searchList,
      realL10n,
      realContacts,
      realFb,
      realImageLoader,
      realPerformanceTestingHelper,
      realAsyncStorage,
      Contacts,
      fb,
      FixedHeader,
      realFixedHeader,
      utils,
      mockContacts,
      mozL10n,
      mockActivities,
      mockImageLoader,
      mockURL,
      realActivities,
      realURL,
      groupA,
      groupB,
      groupC,
      groupD,
      groupT,
      groupFav,
      groupUnd,
      containerA,
      containerB,
      containerC,
      containerD,
      containerT,
      containerFav,
      containerUnd,
      list,
      loading,
      searchBox,
      noResults,
      settings,
      searchSection,
      noContacts,
      asyncStorage;

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
    var total = list.querySelectorAll('header:not(.hide)').length;
    var totalC = list.querySelectorAll('li[data-uuid]').length;

    assert.equal(total, lengthTitles);
    assert.equal(totalC, lengthContacts);
  }

  function assertFbMark(container) {
    var content = container.innerHTML;
    var markPosition = content.indexOf('icon-fb');

    assert.isTrue(markPosition > -1);
  }

  function assertContactFound(contact) {
    var selectorStr = 'li';
    selectorStr = 'li.contact-item';

    var showContact = searchList.querySelectorAll(selectorStr);
    assert.length(showContact, 1);
    assert.equal(showContact[0].dataset.uuid, contact.id);
    assert.isTrue(noResults.classList.contains('hide'));
  }

  function getSearchStringFromContact(contact) {
    var expected = [];
    if (contact.givenName) {
      expected.push(contact.givenName[0]);
    }
    if (contact.familyName) {
      expected.push(contact.familyName[0]);
    }
    if (contact.org) {
      expected.push(contact.org[0]);
    }

    return expected.join(' ');
  }

  function getStringToBeOrdered(contact, orderByLastName) {
    var ret = [];

    var familyName, givenName;

    familyName = contact.familyName && contact.familyName.length > 0 ?
      contact.familyName[0] : '';
    givenName = contact.givenName && contact.givenName.length > 0 ?
      contact.givenName[0] : '';

    var first = givenName, second = familyName;
    if (orderByLastName) {
      first = familyName;
      second = givenName;
    }

    ret.push(first);
    ret.push(second);

    if (first != '' || second != '')
      return window.utils.text.normalize(ret.join('')).trim();
    ret.push(contact.org);
    ret.push(contact.tel && contact.tel.length > 0 ?
      contact.tel[0].value : '');
    ret.push(contact.email && contact.email.length > 0 ?
      contact.email[0].value : '');
    ret.push('#');

    return window.utils.text.normalize(ret.join('')).trim();
  }

  function resetDom(document) {
    if (containerSection) {
      document.body.removeChild(containerSection);
    }

    if (loading) {
      document.body.removeChild(loading);
    }

    if (searchSection) {
      document.body.removeChild(searchSection);
    }

    containerSection = document.createElement('section');
    containerSection.id = 'view-contacts-list';
    document.body.appendChild(containerSection);

    container = document.createElement('div');
    containerSection.appendChild(container);

    var groupsContainer = document.createElement('div');
    groupsContainer.id = 'groups-container';
    groupsContainer.innerHTML += '<section data-type="list" ' +
      'id="groups-list"></section>';
    groupsContainer.innerHTML += '<div id="fixed-container" ';
    groupsContainer.innerHTML += 'class="fixed-title"> </div>';
    groupsContainer.innerHTML += '<nav data-type="scrollbar">';
    groupsContainer.innerHTML += '<p></p></nav>';
    container.appendChild(groupsContainer);
    loading = document.createElement('div');
    loading.id = 'loading-overlay';
    settings = document.createElement('div');
    settings.id = 'view-settings';
    settings.innerHTML = '<div class="view-body-inner"></div>';
    noContacts = document.createElement('div');
    noContacts.id = 'no-contacts';
    list = container.querySelector('#groups-list');

    document.body.appendChild(loading);
    document.body.appendChild(settings);
    document.body.appendChild(noContacts);

    searchSection = document.createElement('section');
    searchSection.id = 'search-view';
    searchSection.innerHTML =
        '<form id="searchview-container" class="search" role="search">' +
          '<button id="cancel-search" data-l10n-id="cancel" type="submit">' +
            'Cancel</button>' +
          '<p>' +
            '<label for="search-contact">' +
              '<input type="search" name="search" class="textfield"' +
                ' placeholder="Search" id="search-contact"' +
                ' data-l10n-id="search-contact">' +
              '<button type="reset">Clear</button>' +
            '</label>' +
          '</p>' +
        '</form>';
    searchSection.innerHTML += '<section id="groups-list-search">';
    searchSection.innerHTML += '<ol id="search-list" data-type="list"></ol>';
    searchSection.innerHTML += '</section>';
    searchSection.innerHTML += '<section>';
    searchSection.innerHTML +=
      '<p id="no-result" class="hide" data-l10n-id="noResults">' +
        'No contacts found</p>';
    searchSection.innerHTML +=
      '<p id="search-progress" class="hidden" role="status">';
    searchSection.innerHTML += '<progress class="small"></progress></p>';
    searchSection.innerHTML += '</section>';

    document.body.appendChild(searchSection);

    searchBox = document.getElementById('search-contact');
    searchList = document.getElementById('search-list');
    noResults = document.getElementById('no-result');
    noContacts = document.getElementById('no-contacts');

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
  }

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      },
      DateTimeFormat: function() {
        this.localeFormat = function(date, format) {
          return date;
        };
      }
    };


    realContacts = window.Contacts;
    window.Contacts = MockContactsApp;
    realFb = window.fb;
    window.fb = MockFb;
    window.Contacts.extServices = MockExtFb;
    realFixedHeader = window.FixedHeader;
    window.FixedHeader = MockFixedHeader;
    realActivities = window.ActivityHandler;
    window.ActivityHandler = MockActivities;
    realImageLoader = window.ImageLoader;
    window.ImageLoader = MockImageLoader;
    realURL = window.URL || {};
    realPerformanceTestingHelper = window.PerformanceTestingHelper;
    window.PerformanceTestingHelper = MockPerformanceTestingHelper;
    window.URL = MockURL;
    window.utils = window.utils || {};
    window.utils.alphaScroll = MockAlphaScroll;
    subject = contacts.List;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockAsyncStorage;

    resetDom(window.document);

    subject.init(list);
    subject.setOrderByLastName(true);

    contacts.Search.init(document.getElementById('view-contacts-list'));
  });

  suiteTeardown(function() {
    window.URL = realURL;
    window.Contacts = realContacts;
    window.fb = realFb;
    window.mozL10n = realL10n;
    window.ActivityHandler = realActivities;
    window.ImageLoader = realActivities;
    window.PerformanceTestingHelper = realPerformanceTestingHelper;
    window.asyncStorage = realAsyncStorage;
  });

  suite('Render list', function() {
    suiteSetup(function() {
      window.fb.isEnabled = false;
    });

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

      groupUnd = container.querySelector('#group-und');
      containerUnd = container.querySelector('#contacts-list-und');

      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      assertGroup(groupA, containerA, 1);
      assertGroup(groupB, containerB, 1);
      assertGroup(groupC, containerC, 1);
      assertNoGroup(groupD, containerD);

    });

    test('adding one at the beginning', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['AA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      subject.refresh(newContact);

      assertNoGroup(groupFav, containerFav);
      var aContacts = assertGroup(groupA, containerA, 2);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(aContacts[0].querySelector('p').innerHTML.indexOf('AA') > -1);
      assert.isTrue(aContacts[1].querySelector('p').innerHTML.indexOf('AD') > -1);
      assertTotal(3, 4);
    });

    test('adding one at the end', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['CZ'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      subject.refresh(newContact);
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 2);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(cContacts[0].querySelector('p').innerHTML.indexOf('CC') > -1);
      assert.isTrue(cContacts[1].querySelector('p').innerHTML.indexOf('CZ') > -1);
      assertTotal(3, 4);
    });

    test('rendering one with no name nor phone and company', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = null;
      newContact.org = 'AD';
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.isTrue(cContacts[0].querySelector('p').innerHTML.indexOf('CC') > -1);
      var aContacts = assertGroup(groupA, containerA, 2);
      assert.isTrue(aContacts[0].querySelector('p').innerHTML.indexOf('AD') > -1);
      assertTotal(3, 4);
    });

    test('rendering one with no name nor company and phone', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = null;
      newContact.org = null;
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.isTrue(cContacts[0].querySelector('p').innerHTML.indexOf('CC') > -1);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      var isUnd = undContacts[0].querySelector('p').innerHTML.indexOf(newContact.tel[0].value);
      assert.isTrue(isUnd > -1);
      assertTotal(4, 4);
    });

    test('rendering one with no name nor company and email', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = null;
      newContact.tel = null;
      newContact.org = null;
      newContact.email[0].value = 'CZ@CZ.com';
      var newList = mockContacts.concat([newContact]);
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 2);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC'), -1);
      assert.notEqual(cContacts[1].querySelector('p').innerHTML.indexOf('CZ@'), -1);
      assertNoGroup(groupUnd, containerUnd);
      assertTotal(3, 4);
    });

    test('rendering one with empty name and email', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = [' '];
      newContact.givenName = [' '];
      newContact.name = [' '];
      newContact.category = null;
      newContact.tel = null;
      newContact.org = null;
      newContact.email[0].value = 'CZ@CZ.com';
      var newList = mockContacts.concat([newContact]);
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 2);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC'), -1);
      assert.notEqual(cContacts[1].querySelector('p').innerHTML.indexOf('CZ@'), -1);
      assertNoGroup(groupUnd, containerUnd);
      assertTotal(3, 4);
    });

    test('rendering one with no name nor email nor company', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = null;
      newContact.tel = null;
      newContact.org = null;
      newContact.email = null;
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC') > -1);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      assert.notEqual(undContacts[0].querySelector('p').innerHTML.indexOf('noName') > -1);
      assertTotal(4, 4);
    });

    test('rendering one with no name nor email nor company and favorite',
        function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = ['favorite'];
      newContact.tel = null;
      newContact.org = null;
      newContact.email = null;
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      var favContacts = assertGroup(groupFav, containerFav, 1);
      assert.notEqual(favContacts[0].querySelector('p').innerHTML.indexOf('noName'), -1);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC'), -1);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      assert.notEqual(undContacts[0].querySelector('p').innerHTML.indexOf('noName'), -1);
      assertTotal(5, 5);
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
      subject.refresh(newContact2);
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 3);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC'), -1);
      assert.notEqual(cContacts[1].querySelector('p').innerHTML.indexOf('CV'), -1);
      assert.notEqual(cContacts[2].querySelector('p').innerHTML.indexOf('CZ'), -1);
      assertTotal(3, 5);
    });

    test('changing contact familyName', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['BV'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      subject.refresh(newContact);
      subject.remove(5); // We are removing the element from previous test
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      var bContacts = assertGroup(groupB, containerB, 2);
      assert.notEqual(bContacts[0].querySelector('p').innerHTML.indexOf('BA'), -1);
      assert.notEqual(bContacts[1].querySelector('p').innerHTML.indexOf('BV'), -1);
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
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var dContacts = assertGroup(groupD, containerD, 1);
      assert.notEqual(dContacts[0].querySelector('p').innerHTML.indexOf('DD'), -1);
      assertTotal(4, 4);
    });

    test('removing last element of a group', function() {
      assertGroup(groupA, containerA, 1);
      subject.remove('4'); // Removing previously added contact
      subject.remove('1'); // Removing last 'A' element
      assertNoGroup(groupFav, containerFav);
      assertNoGroup(groupA, containerA);
      assertTotal(2, 2);
    });

    test('with favorites', function() {
      // Restoring expected estate
      subject.refresh(mockContacts[0]);
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      assertNoGroup(groupFav, containerFav);
      assertNoGroup(groupD, containerD);
      subject.refresh(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      var dContacts = assertGroup(groupD, containerD, 1);
      assertGroup(groupFav, containerFav, 1);
      assert.notEqual(dContacts[0].querySelector('p').innerHTML.indexOf('DD'), -1);
      assertTotal(5, 5);
    });

    test('check more than one favorite', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '5';
      newContact.familyName = ['DA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      subject.refresh(newContact);
      var dContacts = assertGroup(groupD, containerD, 2);
      var fContacts = assertGroup(groupFav, containerFav, 2);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertGroup(groupFav, containerFav, 2);
      assert.notEqual(dContacts[0].querySelector('p').innerHTML.indexOf('DA'), -1);
      assert.notEqual(dContacts[1].querySelector('p').innerHTML.indexOf('DD'), -1);

      assert.notEqual(fContacts[0].querySelector('p').innerHTML.indexOf('DA'), -1);
      assert.notEqual(fContacts[1].querySelector('p').innerHTML.indexOf('DD'), -1);
      var aContacts = assertGroup(groupA, containerA, 1);
      assertTotal(5, 7);
    });

    test('removing all favorites', function() {
      assertGroup(groupFav, containerFav, 2);
      mockContacts[0].category = null;
      subject.remove('4');
      subject.remove('5');
      assertNoGroup(groupFav, containerFav);
      assertGroup(groupA, containerA, 1);
      assertGroup(groupB, containerB, 1);
      assertGroup(groupC, containerC, 1);
      assertTotal(3, 3);
    });

    test('removing all contacts', function() {
      subject.remove('1');
      subject.remove('2');
      subject.remove('3');
      assert.isFalse(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      assertTotal(0, 0);
    });

    test('removing one contact', function() {
      var newList = new MockContactsList();
      subject.load(newList);
      var originalNumber = container.querySelectorAll('.contact-item').length;
      assert.isNotNull(container.querySelector('[data-uuid="2"]'));

      subject.remove('2');

      var afterDelNumber = container.querySelectorAll('.contact-item').length;
      assert.equal(originalNumber, afterDelNumber + 1);
      assert.isNotNull(container.querySelector('[data-uuid="1"]'));
      assert.isNull(container.querySelector('[data-uuid="2"]'));
      assert.isNotNull(container.querySelector('[data-uuid="3"]'));

      // There are contacts on the list so no contacts should be hidden
      assert.isTrue(noContacts.classList.contains('hide'));
    });

    test('checking no contacts when coming from activity', function() {
      MockActivities.currentlyHandling = true;
      subject.load([]);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      assertTotal(0, 0);
      MockActivities.currentlyHandling = false;
    });

    test('updating photo for a contact already rendered', function(done) {
      mockContacts = new MockContactsList();
      subject.load(mockContacts);
      assertTotal(3, 3);
      window.setTimeout(function() {
        var selectorContact1 = 'li[data-uuid = "1"]';
        var contact = container.querySelector(selectorContact1);

        var img = contact.querySelector('img');

        assert.equal(img.dataset.src, 'test.png',
                      'At the begining contact 1 img === "test.png"');
        var prevUpdated = contact.dataset.updated;

        mockContacts[0].updated = new Date(); // This is the key!
        mockContacts[0].photo = ['one.png'];
        subject.load(mockContacts);
        window.setTimeout(function() {
          assertTotal(3, 3);

          contact = container.querySelector(selectorContact1);
          img = contact.querySelector('img');

          assert.equal(img.dataset.src, 'one.png',
                        'After updating contact 1 img === "one.png"');

          assert.isTrue(prevUpdated < contact.dataset.updated,
                        'Updated date is wrong. It should be changed!');
          done();
        }, 100);
      }, 100);
    });

    test('reloading list of contacts without updating', function(done) {
      mockContacts = new MockContactsList();
      subject.load(mockContacts);
      window.setTimeout(function() {
        assertTotal(3, 3);

        var selectorContact1 = 'li[data-uuid = "1"]';
        var contact = container.querySelector(selectorContact1);

        var img = contact.querySelector('img');
        assert.equal(img.dataset.src, 'test.png',
                      'At the begining contact 1 img === "test.png"');

        subject.load(mockContacts);
        window.setTimeout(function() {
          assertTotal(3, 3);

          contact = container.querySelector(selectorContact1);
          img = contact.querySelector('img');
          assert.equal(img.dataset.src, 'test.png',
                        'At the begining contact 1 img === "test.png"');
          done();
        }, 100);
      }, 100);
    });
  });  // suite ends

  suite('Facebook Contacts List', function() {
    suiteSetup(function() {
      resetDom(window.document);
      subject.init(list);
    });

    teardown(function() {
      window.fb.setIsFbContact(false);
      window.fb.setIsFbLinked(false);
    });

    test('adding one FB Contact to an empty list', function(done) {
      window.fb.setIsFbContact(true);
      window.fb.isEnabled = true;

      var deviceContact = new MockContactAllFields();
      deviceContact.category.push('facebook');
      deviceContact.familyName = ['Taylor'];
      deviceContact.givenName = ['Bret'];

      assertTotal(0, 0);
      subject.load([deviceContact]);
      window.setTimeout(function() {
        groupT = container.querySelector('#group-T');
        containerT = container.querySelector('#contacts-list-T');
        var tContacts = assertGroup(groupT, containerT, 1);
        assert.isTrue(tContacts[0].querySelector('p').innerHTML.indexOf('Taylor') > -1);

        // Two instances as this contact is a favorite one also
        assertTotal(2, 2);
        done();
      }, 100);
    }); // test ends
  });  // suite ends

  suite('Contact search', function() {
    test('check search', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      subject.load(mockContacts);
      window.setTimeout(function() {
        contacts.List.initSearch(function onInit() {
          searchBox.value = contact.familyName[0];
          contacts.Search.search(function search_finished() {
            assertContactFound(contact);
            done();
          });
        });
      }, 100);
    });

    test('check empty search', function(done) {
      mockContacts = new MockContactsList();
      subject.load(mockContacts);
      searchBox.value = 'YYY';
      contacts.Search.search(function search_finished() {
        var selectorStr = 'li.contact-item';
        var contacts = searchList.querySelectorAll(selectorStr);

        assert.length(contacts, 0);
        assert.isFalse(noResults.classList.contains('hide'));

        done();
      });

    });

    test('Search  by name and surname with trailing whitespaces',
        function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      subject.load(mockContacts);

      searchBox.value = contact.givenName[0] + ' ' +
                                                  contact.familyName[0] + '  ';
      contacts.Search.search(function search_finished() {
        assertContactFound(contact);
        contacts.Search.invalidateCache();
        done();
      });
    });

    test('Search non-alphabetical characters', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      subject.load(mockContacts);

      searchBox.value = '(';
      contacts.Search.search(function search_finished() {
        assert.isFalse(noResults.classList.contains('hide'));
        contacts.Search.invalidateCache();
        done();
      });
    });

    test('Search non-alphabetical characters with results', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];
      mockContacts[contactIndex].givenName[0] =
        '(' + contact.givenName[0] + ')';

      subject.load(mockContacts);

      window.setTimeout(function() {
        contacts.List.initSearch(function onInit() {
          searchBox.value = '(';
          contacts.Search.search(function search_finished() {
            assert.isTrue(noResults.classList.contains('hide'));
            assertContactFound(contact);
            contacts.Search.invalidateCache();
            done();
          });
        });
      }, 100);
    });

    test('Search phone number', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      subject.load(mockContacts);

      window.setTimeout(function() {
        contacts.List.initSearch(function onInit() {
          searchBox.value = contact.tel[0].value;
          contacts.Search.search(function search_finished() {
            assert.isTrue(noResults.classList.contains('hide'));
            assertContactFound(contact);
            contacts.Search.invalidateCache();
            done();
          });
        });
      }, 100);
    });
  });

  suite('Contacts order', function() {
    test('Order by lastname', function(done) {
      resetDom(document);
      subject.init(list);

      mockContacts = new MockContactsList();
      subject.load(mockContacts);
      window.setTimeout(function() {
        var names = document.querySelectorAll('[data-order]');

        assert.length(names, mockContacts.length);
        for (var i = 0; i < names.length; i++) {
          var printed = names[i];
          var mockContact = mockContacts[i];
          var expected = getStringToBeOrdered(mockContact, true);
          assert.equal(printed.dataset['order'],
            window.utils.text.escapeHTML(expected, true));

          // Check as well the correct highlight
          // familyName to be in bold
          var highlight =
            window.utils.text.escapeHTML(mockContact.givenName[0], true) +
            ' <strong>' +
              window.utils.text.escapeHTML(mockContact.familyName[0], true) +
            '</strong>';
          assert.isTrue(printed.innerHTML.indexOf(highlight) == 0);
        }
        done();
      }, 100);
    });
    test('NOT order by lastname', function(done) {
      subject.setOrderByLastName(false);
      subject.load(mockContacts);

      window.setTimeout(function() {
        // First one should be the last one from the list,
        // with the current names
        var name = document.querySelector('[data-order]');
        var mockContact = mockContacts[mockContacts.length - 1];
        var expected = getStringToBeOrdered(mockContact, false);

        assert.equal(
          name.dataset['order'], window.utils.text.escapeHTML(expected, true));

        // Check highlight
        // Given name to be in bold
        var highlight = '<strong>' +
               window.utils.text.escapeHTML(mockContact.givenName[0], true) +
             '</strong> ' +
             window.utils.text.escapeHTML(mockContact.familyName[0], true);
        assert.equal(name.innerHTML.indexOf(highlight), 0);

        subject.setOrderByLastName(true);
        done();
      }, 100);
    });
  });
});
