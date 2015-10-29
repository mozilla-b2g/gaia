/* global ContactsService, ListUI, MockL10n, MockCookie,
utils, MockAlphaScroll, MockActivityHandler, MockCache, Search, MockMozContacts,
MockContactsSearch, HeaderUI, MockContactPhotoHelper, MockContactAllFields */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');
require('/shared/elements/config.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia_subheader/script.js');
require('/shared/js/text_normalizer.js');
require('/shared/elements/gaia-header/dist/gaia-header.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
require('/shared/js/contacts/utilities/dom.js');
requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/js/utilities/performance_helper.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
requireApp('communications/contacts/test/unit/mock_contacts_search.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
require('/shared/js/l10n.js');

require('/shared/test/unit/mocks/mock_contact_all_fields.js');
requireApp('communications/contacts/views/list/js/list_ui.js');
requireApp('communications/contacts/views/list/js/select_mode.js');
requireApp('communications/contacts/views/list/js/list_utils.js');

suite('ListUI', function() {

  var realMozL10n, realCookie, realAlphaScroll, realActivityHandler, realCache,
    realSearch, realPhotoHelper, realMozContacts;
  var container,
    groupA,
    groupB,
    groupC,
    groupD,
    groupGreek,
    groupCyrillic,
    groupFav,
    groupUnd,
    containerA,
    containerB,
    containerC,
    containerD,
    containerGreek,
    containerCyrillic,
    containerFav,
    containerUnd,
    list,
    noContacts;

  function doRefreshContact(contact) {
    ListUI.refresh(contact);
    // If a contact is added to a new list, then the list might be dynamically
    // created. Therefore, refresh our DOM references each time contacts are
    // changed.
    updateDomReferences();
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

  function updateDomReferences() {
    container = document.querySelector('#groups-container');
    noContacts = document.querySelector('#no-contacts');
    list = container.querySelector('#groups-list');
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

  suiteSetup(function(done) {

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realCookie = window.utils.cookie;
    window.utils.cookie = MockCookie;

    realAlphaScroll = utils.alphaScroll;
    utils.alphaScroll = MockAlphaScroll;

    realActivityHandler = window.ActivityHandler;
    window.ActivityHandler = MockActivityHandler;

    realCache = window.Cache;
    window.Cache = MockCache;

    realSearch = window.Search;
    window.Search = MockContactsSearch;

    realPhotoHelper = window.ContactPhotoHelper;
    window.ContactPhotoHelper = MockContactPhotoHelper;

    // Load HTML
    loadBodyHTML('/contacts/views/list/list.html');
    requireApp('communications/contacts/js/header_ui.js', function() {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
    window.utils.cookie = realCookie;
    realCookie = null;
    window.utils.alphaScroll = realAlphaScroll;
    realAlphaScroll = null;
    window.ActivityHandler = realActivityHandler;
    realActivityHandler = null;
    window.Cache = realCache;
    realCache = null;
    window.Search = realSearch;
    realSearch = null;
    window.ContactPhotoHelper = realPhotoHelper;
    realPhotoHelper = null;
    window.ListUI = null;
  });

  suite('ListUI init', function() {
    setup(function() {
      this.sinon.spy(window.utils.alphaScroll, 'init');
      ListUI.init();
    });

    test('alphaScroll initialized', function() {
      assert.isTrue(window.utils.alphaScroll.init.calledOnce);
    });
  });

  suite('on contacts change', function() {
    var mozContact = null;

    setup(function() {
      mozContact = new MockContactAllFields();
      this.sinon.stub(
        ContactsService,
        'get',
        function(id, cb) {
          cb(
            mozContact
          );
        }
      );

      sessionStorage.setItem('contactChanges', JSON.stringify([{
        'reason': 'update',
        'contactID': mozContact.id
      }]));

      this.sinon.stub(Search, 'updateSearchList', function(cb) {
        cb();
      });
    });

    teardown(function() {
      Search.updateSearchList.restore();
    });

    test('> Refresh contact UI', function(done) {
      window.addEventListener('pageshow', function onpageshow() {
        window.removeEventListener('pageshow', onpageshow);
        assert.isTrue(Search.updateSearchList.called);
        assert.isTrue(ContactsService.get.called);
        done();
      });

      window.dispatchEvent(new CustomEvent('pageshow'));
    });
  });

  suite('Select a contact from the list', function() {
    var mozContact = null;

    setup(function() {
      mozContact = new MockContactAllFields();
      this.sinon.stub(
        ContactsService,
        'get',
        function(id, cb) {
          cb(
            mozContact
          );
        }
      );
    });

    test('> Must send a custom event when clicked', function(done) {
      ListUI.init();
      window.addEventListener('itemClicked', function onitemclicked(evt) {
        window.removeEventListener('itemClicked', onitemclicked);
        assert.equal(evt.detail.uuid, mozContact.id);
        done();
      });

      var groupsList = document.getElementById('groups-list');
      assert.isNotNull(groupsList.querySelector('li'));
      groupsList.querySelector('li').click();
    });

    test('> Action pick', function(done) {
      ListUI.init('pick');
      window.addEventListener('pickAction', function onpick(evt) {
        window.removeEventListener('pickAction', onpick);
        assert.equal(evt.detail.uuid, mozContact.id);
        done();
      });

      var groupsList = document.getElementById('groups-list');
      assert.isNotNull(groupsList.querySelector('li'));
      groupsList.querySelector('li').click();
    });

    test('> Action update', function(done) {
      ListUI.init('update');
      this.sinon.spy(HeaderUI, 'hideAddButton');
      window.addEventListener('updateAction', function onpick(evt) {
        window.removeEventListener('updateAction', onpick);
        assert.equal(evt.detail.uuid, mozContact.id);
        assert.isTrue(HeaderUI.hideAddButton.calledOnce);
        done();
      });

      var groupsList = document.getElementById('groups-list');
      assert.isNotNull(groupsList.querySelector('li'));
      groupsList.querySelector('li').click();
    });
  });

  suite('Render contacts with cursors', function() {
    var groupsList;
    setup(function() {
      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = MockMozContacts;
      groupsList = document.querySelector('#groups-list');
      noContacts = document.querySelector('#no-contacts');

      sinon.stub(window.utils.cookie, 'load', function() {
        return {
          order: true,
          defaultImage: true,
          viewHeight: 0x7fffffff
        };
      });
    });

    teardown(function() {
      navigator.mozContacts = realMozContacts;
      realMozContacts = null;
      window.utils.cookie.load.restore();
    });

    test('get less than 1 chunk contacts', function() {
      var limit = ListUI.chunkSize - 1;
      MockMozContacts.limit = limit;
      ListUI.init();
      assert.isTrue(noContacts.classList.contains('hide'));
      for (var i = 0; i <= limit; i++) {
        var toCheck = groupsList.innerHTML.includes('givenName ' + i);
        assert.isTrue(toCheck, 'contains ' + i);
      }
    });

    test('get exactly 1 chunk contacts', function() {
      var limit = ListUI.chunkSize;
      MockMozContacts.limit = limit;
      ListUI.init();
      assert.isTrue(noContacts.classList.contains('hide'));
      for (var i = 0; i <= limit; i++) {
        var toCheck = groupsList.innerHTML.includes('givenName ' + i);
        assert.isTrue(toCheck, 'contains ' + i);
      }
    });

    test('get more than 1 chunk contacts', function() {
      var limit = ListUI.chunkSize + 1;
      MockMozContacts.limit = limit;
      ListUI.init();
      assert.isTrue(noContacts.classList.contains('hide'));
      for (var i = 0; i <= limit; i++) {
        var toCheck = groupsList.innerHTML.includes('givenName ' + i);
        assert.isTrue(toCheck, 'contains ' + i);
      }
    });
  });

  suite('Render list', function() {
    suiteSetup(function() {
      ListUI.init(null, true);
    });

    setup(function() {
      this.sinon.spy(window.utils.PerformanceHelper, 'contentInteractive');
      this.sinon.spy(window.utils.PerformanceHelper, 'loadEnd');
    });

    test('adding one at the beginning', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['AA'];
      newContact.givenName = ['AAA'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(newContact);

      assertNoGroup(groupFav, containerFav);
      var aContacts = assertGroup(groupA, containerA, 1);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(aContacts[0].querySelector('p').innerHTML.indexOf('AA') >
                    -1);
    });

    test('adding one at the end', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = ['CZ'];
      newContact.givenName = ['CC'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(newContact);
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(cContacts[0].querySelector('p').innerHTML.indexOf('CC') >
                    -1);
    });

    test('rendering one with no name nor phone and company', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = null;
      newContact.org = ['AD'];
      doRefreshContact(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var aContacts = assertGroup(groupA, containerA, 1);
      assert.isTrue(aContacts[0].querySelector('p').innerHTML.indexOf('AD') >
                    -1);
    });

    test('rendering one with no name nor company and phone', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.familyName = null;
      newContact.givenName = null;
      newContact.name = null;
      newContact.category = null;
      newContact.org = null;
      doRefreshContact(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      var isUnd = undContacts[0].querySelector('p').innerHTML.indexOf(
                                                      newContact.tel[0].value);
      assert.isTrue(isUnd > -1);
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
      doRefreshContact(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CZ@'),
                      -1);
      assertNoGroup(groupUnd, containerUnd);
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
      doRefreshContact(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var cContacts = assertGroup(groupC, containerC, 1);
      assert.notEqual(cContacts[0].querySelector('p').innerHTML.indexOf('CZ@'),
                      -1);
      assertNoGroup(groupUnd, containerUnd);
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
      doRefreshContact(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      assertNoGroup(groupFav, containerFav);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      assert.notEqual(undContacts[0].querySelector('p').innerHTML.
                      indexOf('noName') > -1);
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
      doRefreshContact(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      var favContacts = assertGroup(groupFav, containerFav, 1);
      assert.notEqual(favContacts[0].querySelector('p').innerHTML.
                      indexOf('noName'), -1);
      var undContacts = assertGroup(groupUnd, containerUnd, 1);
      assert.notEqual(undContacts[0].querySelector('p').innerHTML.
                      indexOf('noName'), -1);
    });

    test('adding one with a name in Greek', function() {
      var name = ['πέτρος']; // 'Π' is an uppercase 'π'
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.givenName = name;
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact( newContact);
      assertNoGroup(groupFav, containerFav);
      var _Contacts = assertGroup(groupGreek, containerGreek, 1);
      assert.isTrue(noContacts.classList.contains('hide'));
      assert.isTrue(_Contacts[0].querySelector('p').innerHTML.indexOf(name) >
                    -1);
    });

    test('adding one with a name in Cyrillic', function() {
      var name = ['пётр']; // 'П' is an uppercase 'п'
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.givenName = name;
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = null;
      doRefreshContact(newContact);
      assertNoGroup(groupFav, containerFav);
      assert.isTrue(noContacts.classList.contains('hide'));
      var _Contacts = assertGroup(groupCyrillic, containerCyrillic, 1);
      assert.isTrue(_Contacts[0].querySelector('p').innerHTML.indexOf(name) >
                    -1);
    });

    test('with favorites', function() {
      var newContact = new MockContactAllFields();
      newContact.id = '4';
      newContact.givenName = ['DD'];
      newContact.name = [newContact.givenName + ' ' + newContact.familyName];
      newContact.category = ['favorite'];
      assertNoGroup(groupFav, containerFav);
      assertNoGroup(groupD, containerD);
      doRefreshContact(newContact);
      assert.isTrue(noContacts.classList.contains('hide'));
      var dContacts = assertGroup(groupD, containerD, 1);
      assertGroup(groupFav, containerFav, 1);
      assert.notEqual(dContacts[0].querySelector('p').innerHTML.indexOf('DD'),
                      -1);
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
        c.givenName = [names[i]];
        doRefreshContact(c);
      }
      var list = assertGroup(groupA, containerA, 3);
      assert.isTrue(list[0].innerHTML.includes('Aa'), 'order of Aa');
      assert.isTrue(list[1].innerHTML.includes('AB'), 'order of AB');
      assert.isTrue(list[2].innerHTML.includes('Ac'), 'order of Ac');
      done();
    });
  });  // suite ends

});
