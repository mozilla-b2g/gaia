'use strict';
/* global contacts */
/* global ActivityHandler */
/* global MockAlphaScroll */
/* global MockasyncStorage */
/* global MockCookie */
/* global MockContactAllFields */
/* global MockContactsList */
/* global MockContacts */
/* global MockExtFb */
/* global Mockfb */
/* global MockImageLoader */
/* global MockMozContacts */
/* global MockURL */
/* global MocksHelper */
/* global MockNavigationStack */
/* global Normalizer */
/* global ICEStore */
/* global LazyLoader */

require('/shared/js/lazy_loader.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/tag_visibility_monitor.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');
require('/shared/js/contacts/utilities/event_listeners.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/js/contacts/utilities/ice_store.js');
requireApp('communications/contacts/js/views/list.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_extfb.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
requireApp('communications/contacts/js/utilities/performance_helper.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!window.Contacts) {
  window.Contacts = null;
}

if (!navigator.mozContacts) {
  navigator.mozContacts = null;
}

if (!window.contacts) {
  window.contacts = null;
}

if (!window.fb) {
  window.fb = null;
}

if (!window.mozL10n) {
  window.mozL10n = null;
}

if (!window.ImageLoader) {
  window.ImageLoader = null;
}

if (!window.asyncStorage) {
  window.asyncStorage = null;
}

var mocksForListView = new MocksHelper([
  'ContactPhotoHelper',
  'ActivityHandler',
  'Cache'
]).init();

suite('Render contacts list', function() {
  mocksForListView.attachTestHelpers();

  var subject,
      container,
      containerSection,
      selectSection,
      realL10n,
      realContacts,
      realFb,
      realImageLoader,
      realAsyncStorage,
      mockContacts,
      realURL,
      groupA,
      groupB,
      groupC,
      groupD,
      groupT,
      groupGreek,
      groupCyrillic,
      groupFav,
      groupsContainer,
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
      settings,
      noContacts,
      realMozContacts,
      fastScroll;

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
    // created. Therefore, refresh our DOM references each time contacts are
    // changed.
    updateDomReferences();
  }

  // Poor man's way of delaying until an element is onscreen as determined
  // by the visibility monitor.
  function doOnscreen(list, element, callback) {
    var uuid = element.dataset.uuid;
    list.notifyRowOnScreenByUUID(uuid, callback);
    element.scrollIntoView(true);
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

    if (first !== '' || second !== '') {
      return Normalizer.toAscii(ret.join('')).toUpperCase().trim();
    }

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

    if (selectSection) {
      document.body.removeChild(selectSection);
    }

    containerSection = document.createElement('section');
    containerSection.id = 'view-contacts-list';
    containerSection.innerHTML = '<a id="cancel_activity" class="hide"></a>';
    containerSection.innerHTML += '<menu id="standard-menu" type="toolbar">' +
      '<button id="add-contact-button"><span></span></button>' +
      '<button id="settings-button"><span></span></button>' +
    '</menu>';
    document.body.appendChild(containerSection);

    container = document.createElement('div');
    containerSection.appendChild(container);

    groupsContainer = document.createElement('div');
    groupsContainer.id = 'groups-container';
    groupsContainer.innerHTML += '<section data-type="list" ' +
      'id="groups-list"></section>';

    // We need this minimal amount of style for scrolling and the visibility
    // monitor to work correctly.
    groupsContainer.style.height = '100%';
    groupsContainer.style.overflow = 'scroll';

    container.appendChild(groupsContainer);
    loading = document.createElement('div');
    loading.id = 'loading-overlay';
    settings = document.createElement('div');
    settings.id = 'view-settings';
    settings.innerHTML = '<button id="settings-close"' +
                                          'data-l10n-id="done">Done</button>';
    settings.innerHTML += '<div class="view-body-inner"></div>';
    noContacts = document.createElement('div');
    noContacts.id = 'no-contacts';
    list = container.querySelector('#groups-list');
    fastScroll = document.createElement('nav');
    fastScroll.dataset.type = 'scrollbar';
    fastScroll.innerHTML = '<p></p>';

    document.body.appendChild(loading);
    document.body.appendChild(settings);
    document.body.appendChild(noContacts);
    document.body.appendChild(fastScroll);

    selectSection = document.createElement('form');
    selectSection.id = 'selectable-form';
    selectSection.innerHTML = '<section role="region">' +
    '<gaia-header id="selectable-form-header" action="close">' +
      '<h1 id="edit-title" data-l10n-id="contacts"></h1>' +
      '<button type="button" id="select-action"></button>' +
    '</gaia-header>' +
    '</section>' +
    '<menu id="select-all-wrapper">' +
      '<button id="deselect-all" disabled="disabled"></button>' +
      '<button id="select-all"></button>' +
    '</menu>';

    document.body.appendChild(selectSection);

    noContacts = document.getElementById('no-contacts');

    updateDomReferences();
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
    realImageLoader = window.ImageLoader;
    window.ImageLoader = MockImageLoader;
    realURL = window.URL || {};
    window.URL = MockURL;
    window.utils = window.utils || {};
    window.utils.alphaScroll = MockAlphaScroll;
    window.utils.cookie = MockCookie;
    sinon.stub(window.utils.cookie, 'load', function() {
      return {
        order: true,
        defaultImage: true
      };
    });
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;
    subject = contacts.List;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    resetDom(window.document);

    subject.setOrderByLastName(true);
    subject.init(list);
  });

  suiteTeardown(function() {
    window.URL = realURL;
    window.Contacts = realContacts;
    window.fb = realFb;
    window.mozL10n = realL10n;
    window.ImageLoader = realImageLoader;
    window.asyncStorage = realAsyncStorage;
    navigator.mozContacts = realMozContacts;
    mocksForListView.suiteTeardown();
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

    setup(function() {
      this.sinon.spy(window.utils.PerformanceHelper, 'contentInteractive');
      this.sinon.spy(window.utils.PerformanceHelper, 'loadEnd');
    });

    test('first time', function() {
      mockContacts = new MockContactsList();
      subject.load(mockContacts, false, () => {
        updateDomReferences();

        assert.isTrue(noContacts.classList.contains('hide'));
        assertNoGroup(groupFav, containerFav);
        assertGroup(groupA, containerA, 1);
        assertGroup(groupB, containerB, 1);
        assertGroup(groupC, containerC, 1);
        assertNoGroup(groupD, containerD);
        assertNoGroup(groupGreek, containerGreek);
        assertNoGroup(groupCyrillic, containerCyrillic);
        sinon.assert.calledOnce(
          window.utils.PerformanceHelper.contentInteractive);
        sinon.assert.calledOnce(window.utils.PerformanceHelper.loadEnd);
      });
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
      assertGroup(groupC, containerC, 1);
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
      assertGroup(groupA, containerA, 1);
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
      assert.isTrue(fastScroll.classList.contains('hide'));
      assert.isTrue(groupsContainer.classList.contains('hide'));
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
        subject.loadVisibilityMonitor().then(() => {
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
    });

    test('reseting the dom of the contacts list', function(done) {
      var newList = new MockContactsList();
      doLoad(subject, newList, function() {
        doLoad(subject, null, function() {
          done(function() {
            assertNoGroup(groupA, containerA);
            assertNoGroup(groupB, containerB);
            assertNoGroup(groupC, containerC);
            assertNoGroup(groupD, containerD);
            assertNoGroup(groupFav, containerFav);
            assertNoGroup(groupUnd, containerUnd);
          });
        });
      });
    });

    test('removing one contact', function(done) {
      var newList = new MockContactsList();
      doLoad(subject, newList, function() {
        done(function() {
          var originalNumber =
            container.querySelectorAll('.contact-item').length;
          assert.isNotNull(container.querySelector('[data-uuid="2"]'));

          subject.remove('2');

          var afterDelNumber =
            container.querySelectorAll('.contact-item').length;
          assert.equal(originalNumber, afterDelNumber + 1);
          assert.isNotNull(container.querySelector('[data-uuid="1"]'));
          assert.isNull(container.querySelector('[data-uuid="2"]'));
          assert.isNotNull(container.querySelector('[data-uuid="3"]'));

          // There are contacts on the list so no contacts should be hidden
          assert.isTrue(noContacts.classList.contains('hide'));
          assert.isFalse(fastScroll.classList.contains('hide'));
          assert.isFalse(groupsContainer.classList.contains('hide'));
        });
      });
    });

    test('checking no contacts when coming from activity', function(done) {
      ActivityHandler.currentlyHandling = true;
      doLoad(subject, [], function() {
        done(function() {
          assert.isTrue(noContacts.classList.contains('hide'));
          assertNoGroup(groupFav, containerFav);
          assertTotal(0, 0);
          ActivityHandler.currentlyHandling = false;
        });
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
          assert.equal(img.style.backgroundPosition, '');
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
        done(function() {
          groupT = container.querySelector('#group-T');
          containerT = container.querySelector('#contacts-list-T');
          var tContacts = assertGroup(groupT, containerT, 1);
          assert.isTrue(tContacts[0].querySelector('p').innerHTML.
                        indexOf('Taylor') > -1);

          // Two instances as this contact is a favorite one also
          assertTotal(2, 2);
        });
      });
    }); // test ends

    test('Order string lazy calculated', function(done) {
      mockContacts = new MockContactsList();
      doLoad(subject, mockContacts, function() {
        done(function() {
          // The nodes are there
          var nodes = list.querySelectorAll('li');
          assert.lengthOf(nodes, 3);

          // But no order strings are rendered initially.  This work is deferred
          nodes = list.querySelectorAll('li[data-order]');
          assert.lengthOf(nodes, 0);

          // Adding a contact via refresh() should result in the order string
          // being calculated.
          var c = new MockContactAllFields();
          c.id = 99;
          c.familyName = ['AZ'];
          c.category = [];
          doRefreshContact(subject, c);

          nodes = list.querySelectorAll('li');
          assert.lengthOf(nodes, 4);

          nodes = list.querySelectorAll('li[data-order]');
          assert.lengthOf(nodes, 2);
        });
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

      assert.lengthOf(nodes, mockContacts.length);
      for (i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var mockContact = mockContacts[i];
        var expected = getStringToBeOrdered(mockContact, true);
        assert.equal(node.dataset.order,
          Normalizer.escapeHTML(expected, true));

        var printed = node.querySelector('bdi');

        // Check as well the correct highlight
        // familyName to be in bold
        var highlight =
          Normalizer.escapeHTML(mockContact.givenName[0], true) +
          ' <strong>' +
            Normalizer.escapeHTML(mockContact.familyName[0], true) +
          '</strong>';
        assert.isTrue(printed.innerHTML.indexOf(highlight) === 0);
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
        node.dataset.order, Normalizer.escapeHTML(expected, true));

      var name = node.querySelector('bdi');

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
    var searchList;

    var elements = {
      'selectForm': {
        'id': 'selectable-form',
        'selectMode': 'show',
        'normalMode': 'hide'
      }
    };
    var mockNavigationStack;

    suiteSetup(function(done) {
      searchList = document.createElement('ol');
      searchList.id = 'search-list';
      document.body.appendChild(searchList);

      window.fb.isEnabled = false;
      //resetDom(document);
      mockContacts = new MockContactsList();
      doLoad(subject, mockContacts, function() {
        done();
      });
    });

    setup(function() {
      mockNavigationStack = new MockNavigationStack();
    });

    suiteTeardown(function() {
      searchList.remove();
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

        var settingsButton = containerSection.querySelector('#settings-button');
        var addButton = containerSection.querySelector('#add-contact-button');
        var doneSettings = document.querySelector('#settings-close');

        assert.isTrue(settingsButton.classList.contains('hide'));
        assert.isTrue(addButton.classList.contains('hide'));
        assert.isTrue(doneSettings.disabled);

        done();
      }, mockNavigationStack);
    });

    test('filter out facebook contacts', function(done) {
      subject.selectFromList('', null, function onSelectMode() {
        var node = document.getElementById('groups-list');
        assert.isTrue(node.classList.contains('disable-fb-items'));
        done();
      }, mockNavigationStack,
      {
        filterList: [
          {
            'containerClass' : 'disable-fb-items',
            'numFilteredContacts' : 0
          }
        ]
      });
    });

    test('when selecting all, number of contacts selected excludes fb contacts',
        function(done) {
      var numFilteredContacts = 3;

      subject.selectFromList('', null, function onSelectMode() {
        var stub = sinon.stub(window.Contacts, 'updateSelectCountTitle',
         function(count) {
            stub.restore();
            subject.exitSelectMode();
            done(function() {
              assert.equal(subject.total - numFilteredContacts, count);
            });
          }
        );
        document.getElementById('select-all').click();
      }, mockNavigationStack,
      {
        filterList: [
          {
            'containerClass': 'disable-fb-items',
            'numFilteredContacts': numFilteredContacts
          }
        ]
      });
    });

    test('if every contact is a fb contact, disable "select all" button',
        function(done) {
      subject.selectFromList('', null, function onSelectMode() {
        done(function() {
          assert.isTrue(document.getElementById('select-all').disabled);
        });
      }, mockNavigationStack,
      {
        filterList: [
          {
            'containerClass': 'disable-fb-items',
            'numFilteredContacts': subject.total
          }
        ]
      });
    });

    suite('Selection checks', function() {
      suiteSetup(function(done) {
        mockContacts = new MockContactsList();
        doLoad(subject, mockContacts, function() {
          subject.selectFromList('', null, function() {
            done();
          }, new MockNavigationStack());
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

      test('danger class is not present in checks', function() {
        var checks = list.querySelectorAll('input[type="checkbox"]');
        for (var check of checks) {
          assert.isFalse(check.parentNode.classList.contains('danger'));
        }
      });

      test('danger class is present if options.isDanger is true',
        function(done) {
          subject.selectFromList('', null, function() {
            var checks = list.querySelectorAll('input[type="checkbox"]');
            for (var check of checks) {
              assert.isTrue(check.parentNode.classList.contains('danger'));
            }
            done();
          }, new MockNavigationStack(), { isDanger: true });
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
        }
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
        }

      });
    });

    suite('Exit select mode', function() {
      function checkVisibilityExit() {
        // We still have the check boxes, but they are hidden
        assert.isFalse(list.classList.contains('selecting'));
        assert.isFalse(searchList.classList.contains('selecting'));

        var settingsButton = containerSection.querySelector('#settings-button');
        var addButton = containerSection.querySelector('#add-contact-button');
        var doneSettings = document.querySelector('#settings-close');

        assert.isFalse(settingsButton.classList.contains('hide'));
        assert.isFalse(addButton.classList.contains('hide'));
        assert.isFalse(doneSettings.disabled);
      }

      setup(function(done) {
        mockContacts = new MockContactsList();
        doLoad(subject, mockContacts, function() {
          subject.selectFromList('', null, function() {
            done();
          }, new MockNavigationStack());
        });
      });

      test('check visibility of components', function() {
        contacts.List.exitSelectMode();

        checkVisibilityExit();
        assert.isFalse(selectSection.classList.contains('in-edit-mode'));
        assert.isFalse(selectSection.classList.contains('contacts-select'));
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
          }, new MockNavigationStack(), { isDanger: true });
        });

      });
      test('check elements after 2nd enter in select mode', function(done) {
        subject.selectFromList('title', null, function onSelectMode() {
          // Check we have the correct amount of checkboxes (or labels)
          var contactsRows = list.querySelectorAll('li');
          var checks = list.querySelectorAll('input[type="checkbox"]');
          assert.equal(contactsRows.length, checks.length);
          for (var check of checks) {
            assert.isFalse(check.parentNode.classList.contains('danger'));
          }
          done();
        }, new MockNavigationStack(), { isDanger: false });
      });
    });
  });

  suite('Row on screen notification', function() {
    var names = [];
    var elements = [];
    setup(function (done) {
      names = ['AA', 'AB', 'AC', 'AD', 'AE',
       'AF', 'AG', 'AH', 'AI', 'AJ', 'AK'];
      var list = [];
      for (var i = 0; i < names.length; ++i) {
        var name = names[i];
        var c = new MockContactAllFields();
        c.id = 'mock-' + i;
        c.familyName = [name];
        list.push(c);
      }

      doLoad(subject, list, function () {
        elements = assertGroup(groupA, containerA, names.length);
        done();
      });
    });

    test('Scroll to a deep row', function (done) {
      var element = elements[names.length -1];
      doOnscreen(subject, element, function (row) {
        assert.isNotNull(row);
        assert.equal(row, element);
        done();
      });
    });

    test('Notify a row that is on the screen', function(done) {
      var element = elements[0];
      doOnscreen(subject, element, function (r) {
        subject.notifyRowOnScreenByUUID(element.dataset.uuid, function(row) {
          assert.isNotNull(row);
          assert.equal(row, element);
          done();
        });
      });
    });
  });

  suite('ICE Contacts', function() {
    var dispatchChange;

    setup(function() {
      this.sinon.stub(ICEStore, 'onChange', function(cb) {
        dispatchChange = cb;
      });
      this.sinon.stub(ICEStore, 'getContacts', function() {
        return {
          then: function(cb) {
            cb([1,2]);
          }
        };
      });
      this.sinon.stub(LazyLoader, 'load', function(files, cb) {
        cb();
      });

      this.sinon.spy(MockAlphaScroll, 'showGroup');
      this.sinon.spy(MockAlphaScroll, 'hideGroup');
    });

    teardown(function() {
      ICEStore.onChange.restore();
    });

    test('> ICE group is always built but is hidden', function() {
      var stub = ICEStore.getContacts;
      ICEStore.getContacts = function() {
        return {
          then: function(cb) {
            cb();
          }
        };
      };

      mockContacts = new MockContactsList();
      subject.load(mockContacts, false, () => {
        // ICE group created, even if we don't have contacts
        var iceGroup = document.getElementById('section-group-ice');
        assert.isNotNull(iceGroup);
        // ICE group not visible
        assert.isTrue(iceGroup.classList.contains('hide'));
        ICEStore.getContacts = stub;
      });
    });

    test('Display the ICE group if ICE contacts present', function(done) {
      mockContacts = new MockContactsList();
      subject.ICELoaded = false;
      subject.load(mockContacts, false, callback);

      function callback() {
        // Check ice group present
        var iceGroup = document.getElementById('section-group-ice');
        done(function() {
          assert.isNotNull(iceGroup);
          assert.isFalse(iceGroup.classList.contains('hide'));
          // Check that we are displaying the extra item in the alphascroll
          sinon.assert.calledOnce(MockAlphaScroll.showGroup);
          sinon.assert.calledWith(MockAlphaScroll.showGroup, 'ice');
        });
      }
    });

    test('> after a list reload, the ice group appears', function() {
      subject.ICELoaded = false;
      subject.load(null, true, () => {
        var iceGroup = document.getElementById('section-group-ice');
        assert.isNotNull(iceGroup);
      });
    });

    test('toggleICEGroup hides group', function(done) {
      mockContacts = new MockContactsList();
      subject.ICELoaded = false;
      subject.load(mockContacts, false, () => {
        var iceGroup = document.getElementById('section-group-ice');
        assert.isFalse(iceGroup.classList.contains('hide'));
        subject.toggleICEGroup(false);
        assert.isTrue(iceGroup.classList.contains('hide'));
        dispatchChange();
        // The group was updated and it calls to showICEGroup but it remains
        // hidden because it was forced by toggleICEGroup.
        assert.isTrue(iceGroup.classList.contains('hide'));
        done();
      });
    });
  });

  suite('Default images', function() {
    suiteSetup(function(done) {
      mockContacts = new MockContactsList();
      // Remove photo field from those contacts
      mockContacts.forEach(function(ct) {
        delete ct.photo;
      });

      // Make contact[0] favourite
      mockContacts[0].category.push('favorite');
      // Make contact[2] just a phone number
      mockContacts[2] = {
        'id': '3',
        'updated': new Date(),
        'tel': [
          {
            'value': '+346578888883',
            'type': 'mobile',
            'carrier': 'TEF'
          }
        ]
      };

      MockCookie.data = {
        defaultImage: true
      };

      // Forces the cookie data to be reloaded
      subject.setOrderByLastName(null);
      // From now on we will have order by lastname
      subject.init();
      // Wait till the rows are being displayed on the screen
      subject.notifyRowOnScreenByUUID('1', function() {
        done();
      });
      doLoad(subject, mockContacts);
    });

    suiteTeardown(function() {
      MockCookie.data = {};
      subject.setOrderByLastName(true);
    });

    test('Check default image appears', function() {
      var contact = document.querySelector('[data-uuid="2"]');
      assert.isTrue(contact.innerHTML.indexOf('aside') !== -1);
    });

    test('Check default image saves the backgroundPosition properly',
          function() {
      var img = document.querySelector('[data-uuid="2"] aside span');
      assert.equal(img.dataset.backgroundPosition, '');
    });

    test('Check favorites with default image have proper group',
      function() {
        var favorite =
          document.querySelector('#section-group-favorites [data-uuid="1"]');
        assert.isNotNull(favorite);
        var img = favorite.querySelector('aside span');
        assert.equal(img.dataset.group, 'A');
      }
    );

    test('Check contacts under # has # in the default image',
      function() {
        var justPhone = document.querySelector('[data-uuid="3"]');
        assert.isNotNull(justPhone);
        var img = justPhone.querySelector('aside span');
        assert.equal(img.dataset.group, '#');
      }
    );
  });
});
