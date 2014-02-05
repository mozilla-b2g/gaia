require('/shared/js/lazy_loader.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/tag_visibility_monitor.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
requireApp('communications/contacts/js/views/search.js');
requireApp('communications/contacts/js/views/list.js');
requireApp('communications/contacts/js/utilities/dom.js');
requireApp('communications/contacts/js/utilities/event_listeners.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/js/utilities/cookie.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_extfb.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp(
        'communications/contacts/test/unit/mock_performance_testing_helper.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.Contacts) {
  this.Contacts = null;
}

if (!navigator.mozContacts) {
  navigator.mozContacts = null;
}

if (!this.contacts) {
  this.contacts = null;
}

if (!this.fb) {
  this.fb = null;
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

if (!window.asyncScriptsLoaded) {
  window.asyncScriptsLoaded = null;
}

var mocksForListView = new MocksHelper([
  'ContactPhotoHelper'
]).init();

suite('Render contacts list', function() {
  mocksForListView.attachTestHelpers();

  var subject,
      container,
      containerSection,
      selectSection,
      searchList,
      realL10n,
      realContacts,
      realFb,
      realImageLoader,
      realPerformanceTestingHelper,
      realAsyncStorage,
      Contacts,
      fb,
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
      groupGreek,
      groupCyrillic,
      groupFav,
      groupUnd,
      containerA,
      containerB,
      containerC,
      containerD,
      containerT,
      containerGreek,
      containerCyrillic,
      containerFav,
      containerUnd,
      list,
      loading,
      searchBox,
      noResults,
      settings,
      searchSection,
      noContacts,
      asyncStorage,
      realMozContacts;

  function doLoad(list, values, callback) {
    var handler = function() {
      window.removeEventListener('listRendered', handler);

      // Loading a new list removes some DOM nodes.  Update our references.
      updateDomReferences();

      // Issue the callback via setTimeout() to appease the mocha gods.
      // Exceptions and errors are properly reported from setTimeout() async
      // context, but seem to be ignored from other DOM callbacks like
      // we are using here.
      window.setTimeout(callback);
    };
    window.addEventListener('listRendered', handler);
    list.load(values);
  }

  function doRefreshContact(list, contact) {
    list.refresh(contact);
    // If a contact is added to a new list, then the list might be dynamically
    // created.  Therefore, refresh our DOM references each time contacts are
    // changed.
    updateDomReferences();
  }

  // Poor man's way of delaying until an element is onscreen as determined
  // by the visibility monitor.
  function doOnscreen(list, element, callback) {
    element.scrollIntoView(true);
    // XXX Replace this with a true callback from monitor or list
    window.setTimeout(callback);
  }

  function assertNoGroup(title, container) {
    assert.isTrue(!title || title.classList.contains('hide'));
    assert.isTrue(!container || container.querySelectorAll('li').length === 0);
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
      return Normalizer.toAscii(ret.join('')).toUpperCase().trim();
    ret.push(contact.org);
    ret.push(contact.tel && contact.tel.length > 0 ?
      contact.tel[0].value : '');
    ret.push(contact.email && contact.email.length > 0 ?
      contact.email[0].value : '');
    ret.push('#');

    return Normalizer.toAscii(ret.join('')).toUpperCase().trim();
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

    if (selectSection) {
      document.body.removeChild(selectSection);
    }

    containerSection = document.createElement('section');
    containerSection.id = 'view-contacts-list';
    containerSection.innerHTML = '<a id="cancel_activity" class="hide"></a>';
    containerSection.innerHTML += '<menu id="standard-menu" type="toolbar">' +
      '<button id="add-contact-button"><span></span></button>' +
      '<button id="settings-button"><span></span></button>' +
      '<button id="select-action" class="hide"><span></span></button>' +
      '</menu>' + '<menu id="select-menu" type="toolbar" class="hide">' +
      '<button role="menuitem" id="select-action"></button>' +
      '</menu>';
    document.body.appendChild(containerSection);

    container = document.createElement('div');
    containerSection.appendChild(container);

    var groupsContainer = document.createElement('div');
    groupsContainer.id = 'groups-container';
    groupsContainer.innerHTML += '<section data-type="list" ' +
      'id="groups-list"></section>';
    groupsContainer.innerHTML += '<nav data-type="scrollbar">';
    groupsContainer.innerHTML += '<p></p></nav>';

    // We need this minimal amount of style for scrolling and the visibility
    // monitor to work correctly.
    groupsContainer.style.height = '100%';
    groupsContainer.style.overflow = 'scroll';

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

    selectSection = document.createElement('form');
    selectSection.id = 'selectable-form';
    selectSection.innerHTML = '<menu id="select-all-wrapper">' +
      '<button id="deselect-all" disabled="disabled"></button>' +
      '<button id="select-all"></button>' +
      '</menu>';

    document.body.appendChild(selectSection);


    searchBox = document.getElementById('search-contact');
    searchList = document.getElementById('search-list');
    noResults = document.getElementById('no-result');
    noContacts = document.getElementById('no-contacts');

    updateDomReferences();

    window.asyncScriptsLoaded = true;
  }

  function updateDomReferences() {
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
    groupGreek = container.querySelector('#group-Π');    // U+03A0
    containerGreek = container.querySelector('#contacts-list-Π');
    groupCyrillic = container.querySelector('#group-П'); // U+041F
    containerCyrillic = container.querySelector('#contacts-list-П');
    groupUnd = container.querySelector('#group-und');
    containerUnd = container.querySelector('#contacts-list-und');
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
    window.Contacts = MockContacts;
    realFb = window.fb;
    window.fb = Mockfb;
    window.Contacts.extServices = MockExtFb;
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
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;
    subject = contacts.List;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    resetDom(window.document);

    subject.setOrderByLastName(true);
    subject.init(list);

    contacts.Search.init(list);
    subject.initSearch();
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
    navigator.mozContacts = realMozContacts;
  });

  suite('Render contacts with cursors', function() {
    suiteSetup(function() {
      window.fb.isEnabled = false;
    });

    test('get less than 1 chunk contacts', function() {
      var limit = subject.chunkSize - 1;
      MockMozContacts.limit = limit;
      subject.getAllContacts();
      assert.isTrue(noContacts.classList.contains('hide'));
      for (var i = 0; i <= limit; i++) {
        var toCheck = container.innerHTML.contains('GIVENNAME ' + i);
        assert.isTrue(toCheck, 'contains ' + i);
      }
    });

    test('get exactly 1 chunk contacts', function() {
      var limit = subject.chunkSize;
      MockMozContacts.limit = limit;
      subject.getAllContacts();
      assert.isTrue(noContacts.classList.contains('hide'));
      for (var i = 0; i <= limit; i++) {
        var toCheck = container.innerHTML.contains('GIVENNAME ' + i);
        assert.isTrue(toCheck, 'contains ' + i);
      }
    });

    test('get more than 1 chunk contacts', function() {
      var limit = subject.chunkSize + 1;
      MockMozContacts.limit = limit;
      subject.getAllContacts();
      assert.isTrue(noContacts.classList.contains('hide'));
      for (var i = 0; i <= limit; i++) {
        var toCheck = container.innerHTML.contains('GIVENNAME ' + i);
        assert.isTrue(toCheck, 'contains ' + i);
      }
    });
  });

  suite('Render list', function() {
    suiteSetup(function() {
      window.fb.isEnabled = false;
    });

    test('first time', function() {
      mockContacts = new MockContactsList();
      subject.load(mockContacts);

      updateDomReferences();

      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      assertGroup(groupA, containerA, 1);
      assertGroup(groupB, containerB, 1);
      assertGroup(groupC, containerC, 1);
      assertNoGroup(groupD, containerD);
      assertNoGroup(groupGreek, containerGreek);
      assertNoGroup(groupCyrillic, containerCyrillic);
    });

    test('adding one at the beginning', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['AA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(subject, newContact);

      assertNoGroup(groupFav, containerFav);
      var aContacts = assertGroup(groupA, containerA, 2);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(aContacts[0].querySelector('p').innerHTML.indexOf('AA') >
                    -1);
      assert.isTrue(aContacts[1].querySelector('p').innerHTML.indexOf('AD') >
                    -1);
      assertTotal(3, 4);
    });

    test('adding one at the end', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['CZ'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(subject, newContact);
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 2);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(cContacts[0].querySelector('p').innerHTML.indexOf('CC') >
                    -1);
      assert.isTrue(cContacts[1].querySelector('p').innerHTML.indexOf('CZ') >
                    -1);
      assertTotal(3, 4);
    });

    test('rendering one with no name nor phone and company', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = null;
      newContact.org = ['AD'];
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.isTrue(cContacts[0].querySelector('p').innerHTML.indexOf('CC') >
                    -1);
      var aContacts = assertGroup(groupA, containerA, 2);
      assert.isTrue(aContacts[0].querySelector('p').innerHTML.indexOf('AD') >
                    -1);
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
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.isTrue(cContacts[0].querySelector('p').innerHTML.indexOf('CC') >
                    -1);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      var isUnd = undContacts[0].querySelector('p').innerHTML.indexOf(
                                                      newContact.tel[0].value);
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
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 2);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC'),
                      -1);
      assert.notEqual(cContacts[1].querySelector('p').innerHTML.indexOf('CZ@'),
                      -1);
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
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 2);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC'),
                      -1);
      assert.notEqual(cContacts[1].querySelector('p').innerHTML.indexOf('CZ@'),
                      -1);
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
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC') >
                      -1);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      assert.notEqual(undContacts[0].querySelector('p').innerHTML.
                      indexOf('noName') > -1);
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
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      var favContacts = assertGroup(groupFav, containerFav, 1);
      assert.notEqual(favContacts[0].querySelector('p').innerHTML.
                      indexOf('noName'), -1);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.
                      indexOf('CC'), -1);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      assert.notEqual(undContacts[0].querySelector('p').innerHTML.
                      indexOf('noName'), -1);
      assertTotal(5, 5);
    });

    test('adding one with a name in Greek', function() {
      var name = ['πέτρος']; // 'Π' is an uppercase 'π'
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = name;
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(subject, newContact);
      assertNoGroup(groupFav, containerFav);
      var _Contacts = assertGroup(groupGreek, containerGreek, 1);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(_Contacts[0].querySelector('p').innerHTML.indexOf(name) >
                    -1);
      assertTotal(4, 4);
    });

    test('adding one with a name in Cyrillic', function() {
      var name = ['пётр']; // 'П' is an uppercase 'п'
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = name;
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(subject, newContact);
      assertNoGroup(groupFav, containerFav);
      assert.isTrue(noContacts.classList.contains('hide'));
      var _Contacts = assertGroup(groupCyrillic, containerCyrillic, 1);
      assert.isTrue(_Contacts[0].querySelector('p').innerHTML.indexOf(name) >
                    -1);
      assertTotal(4, 4);
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
      doRefreshContact(subject, newContact);
      doRefreshContact(subject, newContact2);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 3);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CC'),
                      -1);
      assert.notEqual(cContacts[1].querySelector('p').innerHTML.indexOf('CV'),
                      -1);
      assert.notEqual(cContacts[2].querySelector('p').innerHTML.indexOf('CZ'),
                      -1);
      assertTotal(3, 5);
    });

    test('changing contact familyName', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['BV'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(subject, newContact);
      subject.remove(5); // We are removing the element from previous test
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      var bContacts = assertGroup(groupB, containerB, 2);
      assert.notEqual(bContacts[0].querySelector('p').innerHTML.indexOf('BA'),
                      -1);
      assert.notEqual(bContacts[1].querySelector('p').innerHTML.indexOf('BV'),
                      -1);
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
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var dContacts = assertGroup(groupD, containerD, 1);
      assert.notEqual(dContacts[0].querySelector('p').innerHTML.indexOf('DD'),
                      -1);
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
      doRefreshContact(subject, mockContacts[0]);
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      assertNoGroup(groupFav, containerFav);
      assertNoGroup(groupD, containerD);
      doRefreshContact(subject, newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      var dContacts = assertGroup(groupD, containerD, 1);
      assertGroup(groupFav, containerFav, 1);
      assert.notEqual(dContacts[0].querySelector('p').innerHTML.indexOf('DD'),
                      -1);
      assertTotal(5, 5);
    });

    test('check more than one favorite', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '5';
      newContact.familyName = ['DA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      doRefreshContact(subject, newContact);
      var dContacts = assertGroup(groupD, containerD, 2);
      var fContacts = assertGroup(groupFav, containerFav, 2);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertGroup(groupFav, containerFav, 2);
      assert.notEqual(dContacts[0].querySelector('p').innerHTML.indexOf('DA'),
                      -1);
      assert.notEqual(dContacts[1].querySelector('p').innerHTML.indexOf('DD'),
                      -1);

      assert.notEqual(fContacts[0].querySelector('p').innerHTML.indexOf('DA'),
                      -1);
      assert.notEqual(fContacts[1].querySelector('p').innerHTML.indexOf('DD'),
                      -1);
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
      assertNoGroup(groupFav, containerFav);
    });

    test('adding empty one to middle of favorites', function(done) {
      var c1 = new MockContactAllFields();
      c1.id = '1';
      c1.familyName = ['mm'];
      c1.category = ['favorite'];
      var c2 = new MockContactAllFields();
      c2.id = '2';
      c2.familyName = ['oo'];
      c2.category = ['favorite'];
      var empty = new MockContactAllFields();
      empty.id = '3';
      empty.familyName = null;
      empty.givenName = null;
      empty.name = null;
      empty.category = ['favorite'];
      empty.tel = null;
      empty.org = null;
      empty.email = null;
      doRefreshContact(subject, c1);
      doRefreshContact(subject, c2);
      doRefreshContact(subject, empty);
      var favs = assertGroup(groupFav, containerFav, 3);
      assert.notEqual(favs[0].querySelector('p').innerHTML.indexOf('mm'),
                      -1);
      assert.notEqual(favs[1].querySelector('p').innerHTML.indexOf('noName'),
                      -1);
      assert.notEqual(favs[2].querySelector('p').innerHTML.indexOf('oo'),
                      -1);
      done();
    });

    // Setup contacts with names that expose sort case sensitivity issues.
    // Contacts should be ordered like:
    //
    //    Aa, AB, Ac
    //
    // If the sorting is case-sensitive (bug 895149) then we will see:
    //
    //    AB, Aa, Ac
    //
    // NOTE: This test depends on the language settings in use.  It will
    //       incorrectly pass for legacty code if LANG=en_US.UTF-8, but fail
    //       with LANG=en_US.  The fix in bug 895149 should allow it to pass
    //       in either case.
    test('sorting should be case-insensitive', function(done) {
      var names = ['Ac', 'AB', 'Aa'];
      for (var i = 0; i < names.length; ++i) {
        var c = new MockContactAllFields();
        c.id = i + 1;
        c.familyName = [names[i]];
        doRefreshContact(subject, c);
      }
      var list = assertGroup(groupA, containerA, 3);
      assert.isTrue(list[0].innerHTML.contains('Aa'), 'order of Aa');
      assert.isTrue(list[1].innerHTML.contains('AB'), 'order of AB');
      assert.isTrue(list[2].innerHTML.contains('Ac'), 'order of Ac');
      done();
    });

    // This test verifies that we properly render contact list elements
    // for both its main group and favorites group.  This requires the
    // visibility monitor to fire an onscreen event for each group element
    // separately.  See bug 891984 for a previous error in this logic.
    test('load and render many favorites', function(done) {
      var names = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI'];
      var list = [];
      for (var i = 0; i < names.length; ++i) {
        var name = names[i];
        var c = new MockContactAllFields();
        c.id = 'mock-' + i;
        c.familyName = [name];
        c.category = ['favorite'];
        list.push(c);
      }
      doLoad(subject, list, function() {
        var favList = assertGroup(groupFav, containerFav, names.length);
        var lastFav = favList[favList.length - 1];
        doOnscreen(subject, lastFav, function() {
          assert.equal(lastFav.dataset.rendered, 'true',
                       'contact should be rendered in "favorites" list');

          var aList = assertGroup(groupA, containerA, names.length);
          var lastA = aList[aList.length - 1];
          doOnscreen(subject, lastA, function() {
            assert.equal(lastA.dataset.rendered, 'true',
                         'contact should be rendered in "A" list');
            done();
          });
        });
      });
    });

    test('reseting the dom of the contacts list', function(done) {
      var newList = new MockContactsList();
      doLoad(subject, newList, function() {
        doLoad(subject, null, function() {
          assertNoGroup(groupA, containerA);
          assertNoGroup(groupB, containerB);
          assertNoGroup(groupC, containerC);
          assertNoGroup(groupD, containerD);
          assertNoGroup(groupFav, containerFav);
          assertNoGroup(groupUnd, containerUnd);
          done();
        });
      });
    });

    test('removing one contact', function(done) {
      var newList = new MockContactsList();
      doLoad(subject, newList, function() {
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

        done();
      });
    });

    test('checking no contacts when coming from activity', function(done) {
      MockActivities.currentlyHandling = true;
      doLoad(subject, [], function() {
        assert.isTrue(noContacts.classList.contains('hide'));
        assertNoGroup(groupFav, containerFav);
        assertTotal(0, 0);
        MockActivities.currentlyHandling = false;
        done();
      });
    });

    test('updating photo for a contact already rendered', function(done) {
      mockContacts = new MockContactsList();
      doLoad(subject, mockContacts, function() {
        assertTotal(3, 3);
        var selectorContact1 = 'li[data-uuid = "1"]';
        var contact = container.querySelector(selectorContact1);

        doOnscreen(subject, contact, function() {
          var img = contact.querySelector('span[data-type=img]');

          assert.equal(img.dataset.src, 'test.png',
                        'At the begining contact 1 img === "test.png"');
          var prevUpdated = contact.dataset.updated;

          mockContacts[0].updated = new Date(); // This is the key!
          mockContacts[0].photo = ['one.png'];
          doLoad(subject, mockContacts, function() {
            assertTotal(3, 3);

            contact = container.querySelector(selectorContact1);

            doOnscreen(subject, contact, function() {
              img = contact.querySelector('span[data-type=img]');

              assert.equal(img.dataset.src, 'one.png',
                            'After updating contact 1 img === "one.png"');

              assert.isTrue(prevUpdated < contact.dataset.updated,
                            'Updated date is wrong. It should be changed!');
              done();
            });
          });
        });
      });
    });

    test('reloading list of contacts without updating', function(done) {
      mockContacts = new MockContactsList();
      doLoad(subject, mockContacts, function() {
        assertTotal(3, 3);

        var selectorContact1 = 'li[data-uuid = "1"]';
        var contact = container.querySelector(selectorContact1);

        doOnscreen(subject, contact, function() {
          var img = contact.querySelector('span[data-type=img]');
          assert.equal(img.dataset.src, 'test.png',
                        'At the begining contact 1 img === "test.png"');

          doLoad(subject, mockContacts, function() {
            assertTotal(3, 3);

            contact = container.querySelector(selectorContact1);

            doOnscreen(subject, contact, function() {
              img = contact.querySelector('span[data-type=img]');
              assert.equal(img.dataset.src, 'test.png',
                            'At the begining contact 1 img === "test.png"');
              done();
            });
          });
        });
      });
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

      doLoad(subject, [deviceContact], function() {
        groupT = container.querySelector('#group-T');
        containerT = container.querySelector('#contacts-list-T');
        var tContacts = assertGroup(groupT, containerT, 1);
        assert.isTrue(tContacts[0].querySelector('p').innerHTML.
                      indexOf('Taylor') > -1);

        // Two instances as this contact is a favorite one also
        assertTotal(2, 2);
        done();
      });
    }); // test ends

    test('check search', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      doLoad(subject, mockContacts, function() {
        contacts.Search.init(mockContacts);
        contacts.List.initSearch(function onInit() {
          searchBox.value = contact.familyName[0];
          contacts.Search.enterSearchMode({preventDefault: function() {}});
          done();
        });
      });
    });

    test('check empty search', function(done) {
      mockContacts = new MockContactsList();

      doLoad(subject, mockContacts, function() {
        searchBox.value = 'YYY';
        contacts.Search.search(function search_finished() {
          var selectorStr = 'li.contact-item';
          var contacts = searchList.querySelectorAll(selectorStr);

          assert.length(contacts, 0);
          assert.isFalse(noResults.classList.contains('hide'));

          done();
        });
      });
    });

    test('Search  by name and surname with trailing whitespaces',
        function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      doLoad(subject, mockContacts, function() {
        searchBox.value = contact.givenName[0] + ' ' +
                          contact.familyName[0] + '  ';
        contacts.Search.search(function search_finished() {
          assertContactFound(contact);
          contacts.Search.invalidateCache();
          done();
        });
      });
    });

    test('Search non-alphabetical characters', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      doLoad(subject, mockContacts, function() {
        searchBox.value = '(';
        contacts.Search.search(function search_finished() {
          assert.isFalse(noResults.classList.contains('hide'));
          contacts.Search.invalidateCache();
          done();
        });
      });
    });

    test('Search non-alphabetical characters with results', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];
      mockContacts[contactIndex].givenName[0] =
        '(' + contact.givenName[0] + ')';

      doLoad(subject, mockContacts, function() {
        contacts.List.initSearch(function onInit() {
          searchBox.value = '(';
          contacts.Search.search(function search_finished() {
            assert.isTrue(noResults.classList.contains('hide'));
            assertContactFound(contact);
            contacts.Search.invalidateCache();
            done();
          });
        });
      });
    });

    test('Search non-ASCII (accented characters) with ASCII results',
        function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      var accentedCharName = '';
      var givenName = contact.givenName[0];
      var inChars = 'äçêìñõșțüÿÀÇÊÎÑÒȘȚÚÝ';
      var outChars = 'aceinostuyACEINOSTUY';
      for (var i = 0, len = givenName.length; i < len; i++)
        accentedCharName +=
          inChars[outChars.indexOf(givenName[i])] || givenName[i];

      doLoad(subject, mockContacts, function() {
        contacts.List.initSearch(function onInit() {
          searchBox.value = accentedCharName + ' ' + contact.familyName[0];
          contacts.Search.search(function search_finished() {
            assert.isTrue(noResults.classList.contains('hide'));
            assertContactFound(contact);
            contacts.Search.invalidateCache();
            done();
          });
        });
      });
    });

    test('Search ASCII (non-accented characters) with non-ASCII results',
        function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      var accentedCharName = '';
      var givenName = contact.givenName[0];
      var familyName = contact.familyName[0];
      var inChars = 'äçêìñõșțüÿÀÇÊÎÑÒȘȚÚÝ';
      var outChars = 'aceinostuyACEINOSTUY';
      for (var i = 0, len = givenName.length; i < len; i++)
        accentedCharName +=
          inChars[outChars.indexOf(givenName[i])] || givenName[i];

      mockContacts[contactIndex].givenName[0] = accentedCharName;

      doLoad(subject, mockContacts, function() {
        contacts.List.initSearch(function onInit() {
          searchBox.value = givenName + ' ' + familyName;
          contacts.Search.search(function search_finished() {
            assert.isTrue(noResults.classList.contains('hide'));
            assertContactFound(contact);
            contacts.Search.invalidateCache();
            done();
          });
        });
      });
    });

    test('Search phone number', function(done) {
      mockContacts = new MockContactsList();
      var contactIndex = Math.floor(Math.random() * mockContacts.length);
      var contact = mockContacts[contactIndex];

      doLoad(subject, mockContacts, function() {
        contacts.List.initSearch(function onInit() {
          searchBox.value = contact.tel[0].value;
          contacts.Search.search(function search_finished() {
            assert.isTrue(noResults.classList.contains('hide'));
            assertContactFound(contact);
            contacts.Search.invalidateCache();
            done();
          });
        });
      });
    });

    test('Search for empty contact', function(done) {
      mockContacts = new MockContactsList();

      doLoad(subject, mockContacts, function() {
        var empty = new MockContactAllFields();
        empty.id = '99';
        empty.familyName = null;
        empty.givenName = null;
        empty.name = null;
        empty.category = ['favorite'];
        empty.tel = null;
        empty.org = null;
        empty.email = null;
        doRefreshContact(subject, empty);
        contacts.List.initSearch(function onInit() {
          searchBox.value = 'noName';
          contacts.Search.search(function search_finished() {
            assert.isTrue(noResults.classList.contains('hide'));
            assertContactFound(empty);
            contacts.Search.invalidateCache();
            done();
          });
        });
      });
    });

    test('Order string lazy calculated', function(done) {
      mockContacts = new MockContactsList();
      doLoad(subject, mockContacts, function() {
        // The nodes are there
        var nodes = list.querySelectorAll('li');
        assert.length(nodes, 3);

        // But no order strings are rendered initially.  This work is deferred
        nodes = list.querySelectorAll('li[data-order]');
        assert.length(nodes, 0);

        // Adding a contact via refresh() should result in the order string
        // being calculated.
        var c = new MockContactAllFields();
        c.id = 99;
        c.familyName = ['AZ'];
        c.category = [];
        doRefreshContact(subject, c);

        nodes = list.querySelectorAll('li');
        assert.length(nodes, 4);

        nodes = list.querySelectorAll('li[data-order]');
        assert.length(nodes, 2);

        done();
      });
    });

    test('Order by lastname', function(done) {
      resetDom(document);
      subject.init(list, true);

      mockContacts = new MockContactsList();

      // Use refresh() to load list since it forces order strings to be
      // calculated and used for sorting.
      for (var i = 0; i < mockContacts.length; ++i) {
        doRefreshContact(subject, mockContacts[i]);
      }

      var nodes = document.querySelectorAll('li[data-order]');

      assert.length(nodes, mockContacts.length);
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var mockContact = mockContacts[i];
        var expected = getStringToBeOrdered(mockContact, true);
        assert.equal(node.dataset['order'],
          Normalizer.escapeHTML(expected, true));

        var printed = node.querySelector('p');

        // Check as well the correct highlight
        // familyName to be in bold
        var highlight =
          Normalizer.escapeHTML(mockContact.givenName[0], true) +
          ' <strong>' +
            Normalizer.escapeHTML(mockContact.familyName[0], true) +
          '</strong>';
        assert.isTrue(printed.innerHTML.indexOf(highlight) == 0);
      }
      done();
    });

    test('NOT order by lastname', function(done) {
      subject.setOrderByLastName(false);

      // Use refresh() to load list since it forces order strings to be
      // calculated and used for sorting.
      for (var i = 0; i < mockContacts.length; ++i) {
        doRefreshContact(subject, mockContacts[i]);
      }

      // First one should be the last one from the list,
      // with the current names
      var node = document.querySelector('[data-order]');
      var mockContact = mockContacts[mockContacts.length - 1];
      var expected = getStringToBeOrdered(mockContact, false);

      assert.equal(
        node.dataset['order'], Normalizer.escapeHTML(expected, true));

      var name = node.querySelector('p');

      // Check highlight
      // Given name to be in bold
      var highlight = '<strong>' +
             Normalizer.escapeHTML(mockContact.givenName[0], true) +
           '</strong> ' +
           Normalizer.escapeHTML(mockContact.familyName[0], true);
      assert.equal(name.innerHTML.indexOf(highlight), 0);

      subject.setOrderByLastName(true);
      done();
    });
  });

  suite('Select mode', function() {
    var elements = {
      'standardMenu': {
        'id': 'standard-menu',
        'selectMode': 'hide',
        'normalMode': 'show'
      },
      'selectMenu': {
        'id': 'select-menu',
        'selectMode': 'show',
        'normalMode': 'hide'
      },
      'closeButton': {
        'id': 'cancel_activity',
        'selectMode': 'show',
        'normalMode': 'hide'
      },
      'selectAllButton': {
        'id': 'select-all',
        'selectMode': 'show',
        'normalMode': 'show' // We don't care, the form will be hide
      },
      'deselectAllButton': {
        'id': 'deselect-all',
        'selectMode': 'show',
        'normalMode': 'show' // We don't care, the form will be hide
      }
    };

    suiteSetup(function(done) {
      window.fb.isEnabled = false;
      //resetDom(document);
      mockContacts = new MockContactsList();
      doLoad(subject, mockContacts, function() {
        done();
      });
    });

    test('enter select mode', function(done) {
      var selectActionTitle = 'title';
      subject.selectFromList(selectActionTitle, null, function onSelectMode() {
        // Check visibility

        for (var i in elements) {
          var element = elements[i];

          if (typeof element != 'object') {
            return;
          }
          var node = document.getElementById(element.id);
          if (element.selectMode == 'show') {
            assert.isFalse(node.classList.contains('hide'));
          } else {
            assert.isTrue(node.classList.contains('hide'));
          }
        }

        assert.isTrue(list.classList.contains('selecting'));
        assert.isTrue(searchList.classList.contains('selecting'));

        var selectActionButton = document.getElementById('select-action');
        assert.equal(selectActionTitle, selectActionButton.textContent);
        assert.isTrue(selectActionButton.disabled);

        done();
      }, MockNavigation, 'transition');
    });

    suite('Selection checks', function() {
      suiteSetup(function(done) {
        mockContacts = new MockContactsList();
        doLoad(subject, mockContacts, function() {
          subject.selectFromList('', null, function() {
            done();
          }, MockNavigation, 'transition');
        });
      });

      function setCheck(contactCheck, value, callback) {
        contactCheck.checked = value;
        contactCheck.addEventListener('click', function doCallback(evt) {
          contactCheck.removeEventListener('click', doCallback);
          setTimeout(callback);
        });
        contactCheck.click();
      }

      function uncheck(contactCheck, callback) {
        setCheck(contactCheck, false, callback);
      }

      function check(contactCheck, callback) {
        setCheck(contactCheck, true, callback);
      }

      test('all rows have input for selecting with correct id', function() {
        var contactsRows = list.querySelectorAll('li');
        var uuids = [];
        for (var contact of contactsRows) {
          uuids.push(contact.dataset.uuid);
        }
        var checks = list.querySelectorAll('input[type="checkbox"]');
        assert.equal(contactsRows.length, checks.length);
        for (var check of checks) {
          assert.include(uuids, check.value);
        }
      });

      test('if no contact is selected, action button is disabled',
                                                                function(done) {
        var selectActionButton =
          document.getElementById('select-action');

        var contactCheck = list.querySelector('input[type="checkbox"]');
        contactCheck.dataset.uuid = contactCheck.value;
        check(contactCheck, doUncheck);

        function doUncheck() {
          uncheck(contactCheck, assertActionButtonDisabled);
        }

        function assertActionButtonDisabled() {
          assert.isTrue(selectActionButton.disabled);
          done();
        };
      });

      test('if some contact is selected, action button is enabled',
                                                                function(done) {
        var selectActionButton = document.getElementById('select-action');

        var contactCheck = list.querySelector('input[type="checkbox"]');
        contactCheck.dataset.uuid = contactCheck.value;
        check(contactCheck, assertActionButtonEnabled);

        function assertActionButtonEnabled() {
          assert.isFalse(selectActionButton.disabled);
          done();
        };

      });
    });

    suite('Exit select mode', function() {
      function checkVisibilityExit() {
        // Buttons visibility
        for (var i in elements) {
          var element = elements[i];

          if (typeof element != 'object') {
            return;
          }
          var node = document.getElementById(element.id);
          if (element.normalMode == 'show') {
            assert.isFalse(node.classList.contains('hide'));
          } else {
            assert.isTrue(node.classList.contains('hide'));
          }
        }

        // We still have the check boxes, but they are hidden
        assert.isFalse(list.classList.contains('selecting'));
        assert.isFalse(searchList.classList.contains('selecting'));
      }
      setup(function(done) {
        mockContacts = new MockContactsList();
        doLoad(subject, mockContacts, function() {
          subject.selectFromList('', null, function() {
            // Simulate the click to close
            done();
          }, MockNavigation, 'transition');
        });
      });

      test('Exit select mode by dismissing', function() {
        var close = document.querySelector('#cancel_activity');
        close.click();

        checkVisibilityExit();
      });

      test('check visibility of components', function() {
        contacts.List.exitSelectMode();
        checkVisibilityExit();
      });
    });

    suite('Multiple select mode', function() {
      suiteSetup(function(done) {
        mockContacts = new MockContactsList();
        subject.load(mockContacts);
        doLoad(subject, mockContacts, function() {
          subject.selectFromList('', null, function() {
            var close = document.querySelector('#cancel_activity');
            close.click();
            done();
          }, MockNavigation, 'transition');
        });

      });
      test('check elements after 2nd enter in select mode', function(done) {
        subject.selectFromList('title', null, function onSelectMode() {
          // Check we have the correct amount of checkboxes (or labels)
          var contactsRows = list.querySelectorAll('li');
          var checks = list.querySelectorAll('input[type="checkbox"]');
          assert.equal(contactsRows.length, checks.length);
          done();
        }, MockNavigation, 'transition');
      });
    });
  });
});
