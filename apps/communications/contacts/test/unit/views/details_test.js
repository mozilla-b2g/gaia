'use strict';

/* global ActivityHandler */
/* global contacts */
/* global ContactsService */
/* global MockContactAllFields */
/* global MockContacts */
/* global MockContactsButtons */
/* global MockContactsListObj */
/* global MockDetailsDom */
/* global MockExtFb */
/* global Mockfb */
/* global MockMozNfc */
/* global MockContactsNfc */
/* global MocksHelper */
/* global MainNavigation */
/* global MockMozContacts */
/* global MockUtils */
/* global MockWebrtcClient */
/* global Normalizer */
/* export TAG_OPTIONS */
/* global triggerEvent */
/* exported SCALE_RATIO */
/* global utils */
/* global NFC */

/* exported _ */

//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_details_dom.js.html');
requireApp(
  'communications/contacts/test/unit/webrtc-client/mock_webrtc_client.js');

require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_event_listeners.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/contacts/mock_contacts_buttons.js');

require('/shared/test/unit/mocks/mock_mozContacts.js');
requireApp('communications/contacts/js/views/details.js');
requireApp('communications/contacts/test/unit/mock_contacts_nfc.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_main_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_extfb.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/helper.js');
requireApp('communications/contacts/js/utilities/mozContact.js');
requireApp('communications/contacts/js/utilities/extract_params.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');

require('/shared/test/unit/mocks/mock_moz_contact.js');
require('/shared/test/unit/mocks/mock_moz_nfc.js');

var _ = function(key) { return key; },
    subject,
    container,
    realL10n,
    realOnLine,
    realFormatDate,
    dom,
    contactDetails,
    listContainer,
    detailsName,
    detailsNameText,
    orgTitle,
    phonesTemplate,
    emailsTemplate,
    addressesTemplate,
    socialTemplate,
    editContactButton,
    cover,
    favoriteMessage,
    detailsInner,
    TAG_OPTIONS,
    realContacts,
    realFb,
    mockContact,
    fbButtons,
    linkButtons,
    realContactsList,
    mozL10nGetSpy,
    header,
    realListeners,
    realNFC,
    realMozNFC;

requireApp('communications/contacts/js/tag_optionsstem.js');

var SCALE_RATIO = 1;

var mocksHelperForDetailView = new MocksHelper([
  'MainNavigation',
  'ActivityHandler',
  'LazyLoader',
  'Cache',
  'ContactsButtons',
  'ContactPhotoHelper',
  'mozContact',
  'WebrtcClient'
]).init();

suite('Render contact', function() {
  mocksHelperForDetailView.attachTestHelpers();

  var isOnLine = true;
  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  suiteSetup(function() {
    navigator.mozContacts = MockMozContacts;
    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    realL10n = navigator.mozL10n;
    realListeners = utils.listeners;
    utils.listeners = MockUtils.listeners;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      },
      DateTimeFormat: function() {
        this.localeFormat = function(date, format) {
          return date;
        };
      },
      translate: function() {

      }
    };

    mozL10nGetSpy = sinon.spy(navigator.mozL10n, 'get');

    realFormatDate = utils.misc.formatDate;
    utils.misc.formatDate = function(date) {
        var offset = date.getTimezoneOffset() * 60 * 1000;
        var normalizedDate = new Date(date.getTime() + offset);
        return normalizedDate.toString();
    };

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });

    realContactsList = contacts.List;
    contacts.List = MockContactsListObj;
    realContacts = window.Contacts;
    window.Contacts = MockContacts;
    realNFC = window.NFC;
    window.NFC = MockContactsNfc;
    realMozNFC = window.navigator.mozNfc;
    window.navigator.mozNfc = MockMozNfc;
    realFb = window.fb;
    window.fb = Mockfb;
    window.ExtServices = MockExtFb;
    dom = document.createElement('section');
    dom.id = 'view-contact-details';
    dom.innerHTML = MockDetailsDom;
    container = dom.querySelector('#details-list');
    subject = contacts.Details;
    utils.listeners.dom = dom;
    subject.init(dom);
    contactDetails = dom.querySelector('#contact-detail');
    listContainer = dom.querySelector('#details-list');
    detailsName = dom.querySelector('#contact-name-title');
    detailsNameText = dom.querySelector('#contact-name-title bdi');
    orgTitle = dom.querySelector('#org-title');
    phonesTemplate = dom.querySelector('#phone-details-template-\\#i\\#');
    emailsTemplate = dom.querySelector('#email-details-template-\\#i\\#');
    addressesTemplate = dom.querySelector('#address-details-template-\\#i\\#');
    socialTemplate = dom.querySelector('#social-template-\\#i\\#');
    editContactButton = dom.querySelector('#edit-contact-button');
    cover = dom.querySelector('#cover-img');
    detailsInner = dom.querySelector('#contact-detail-inner');
    favoriteMessage = dom.querySelector('#toggle-favorite');
    header = dom.querySelector('#details-view-header');

    fbButtons = [
      '#profile_button',
      '#msg_button',
      '#wall_button'
    ];

    linkButtons = [
      '#link_button'
    ];
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    contacts.List = realContactsList;
    window.fb = realFb;

    mozL10nGetSpy.restore();
    window.mozL10n = realL10n;

    window.NFC = realNFC;
    window.navigator.mozNfc = realMozNFC;

    utils.listeners = realListeners;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
    utils.misc.formatDate = realFormatDate;
  });

  setup(function() {
    mockContact = new MockContactAllFields(true);
    subject.setContact(mockContact);
    window.set;
  });

  teardown(function() {
    container.innerHTML = '';
    mozL10nGetSpy.reset();
  });

  suite('Render name', function() {
    test('with name', function() {
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsNameText.textContent, mockContact.name[0]);
    });

    test('without name, with phone', function() {
      var contactWoName = new MockContactAllFields(true);
      contactWoName.name = null;
      subject.setContact(contactWoName);
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsNameText.textContent, contactWoName.tel[0].value);
    });

    test('without name, without phone, with email', function() {
      var contactWoName = new MockContactAllFields(true);
      contactWoName.name = null;
      contactWoName.tel = null;
      subject.setContact(contactWoName);
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsNameText.textContent, contactWoName.email[0].value);
    });

    test('no name, no phone, no email', function() {
      var contactWoName = new MockContactAllFields(true);
      contactWoName.name = null;
      contactWoName.tel = null;
      contactWoName.email = null;
      subject.setContact(contactWoName);
      subject.render(null, TAG_OPTIONS);
      assert.notEqual(detailsNameText.textContent, '');
      assert.isTrue(mozL10nGetSpy.calledWith('noName'));
    });
  });

  suite('Render favorite', function() {
    test('with favorite contact', function() {
      subject.render(null, TAG_OPTIONS);
      assert.isTrue(header.classList.contains('favorite'));
    });
    test('without favorite contact', function() {
      var contactWoFav = new MockContactAllFields(true);
      contactWoFav.category = [];
      subject.setContact(contactWoFav);
      subject.render(null, TAG_OPTIONS);
      assert.isFalse(header.classList.contains('favorite'));
    });
    test('change in favorite not render the window', function(done) {
      var contactWoPhoto = new MockContactAllFields();
      contactWoPhoto.photo = null;
      // Stub so save is working as if it was successful
      this.sinon.stub(ContactsService, 'save', function(contact, cb) {
        cb();
      });
      // Stub find, so request is working
      this.sinon.stub(navigator.mozContacts, 'find', function(options) {
        return {
          onsuccess: function(){},
          onerror: function() {}
        };
      });

      subject.setContact(contactWoPhoto);
      subject.render(null, TAG_OPTIONS);
      var spy = sinon.spy(subject, 'toggleFavorite');
      subject.toggleFavorite();
      spy.lastCall.returnValue.then(function(value) {
        assert.isTrue(value);
      }).then(done, done);
    });
  });

  suite('Render org', function() {
    test('with org', function() {
      subject.render(null, TAG_OPTIONS);
      assert.equal(mockContact.org[0], orgTitle.textContent);
      assert.equal(false, orgTitle.classList.contains('hide'));
    });
    test('without org', function() {
      var contactWoOrg = new MockContactAllFields(true);
      contactWoOrg.org = [];
      subject.setContact(contactWoOrg);
      subject.render(null, TAG_OPTIONS);
      assert.equal('', orgTitle.textContent);
      assert.equal(true, orgTitle.classList.contains('hide'));
    });
  });

  suite('Render social', function() {
     teardown(function() {
      window.fb.setIsFbContact(false);
      window.fb.setIsFbLinked(false);
    });

    function assertFbButtons(buttons, mode, state) {
      buttons.forEach(function(buttonid) {
        var selector = buttonid;
        if (state) {
          selector += '[' + state + ']';
        }
        if (mode === 'present') {
          assert.isNotNull(container.querySelector(selector));
        }
        else {
          assert.isNull(container.querySelector(selector));
        }
      });
    }

    test('It is not a Facebook Contact', function() {
      window.fb.setIsEnabled(true);
      window.fb.setIsFbContact(false);
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'social-template');
      assert.isFalse(container.querySelector('#link_button').
                    classList.contains('hide'));
      assert.isFalse(container.querySelector('#share_button').
                    classList.contains('hide'));
      assert.isTrue(container.
                       querySelector('#profile_button').
                       classList.contains('hide')
      );
    });

    test('It is a Facebook Contact', function() {
      window.fb.setIsFbContact(true);

      // The edit mode should be disabled
      subject.render();
      assert.equal('FB', orgTitle.textContent);

      assert.isFalse(container.
                       querySelector('#profile_button').
                       classList.contains('hide')
      );

      assert.isFalse(container.
                       querySelector('#msg_button').
                       classList.contains('hide')
      );

      assert.isFalse(container.
                       querySelector('#wall_button').
                       classList.contains('hide')
      );

      assert.isTrue(container.
                       querySelector('#share_button').
                       classList.contains('hide')
      );

      window.fb.setIsFbContact(false);
    });

    test('Facebook is not enabled', function() {
      window.fb.setIsEnabled(false);

      subject.render(null, TAG_OPTIONS);
      var incSocial = container.innerHTML.indexOf('social-template');
      assert.isTrue(incSocial === -1);

      assertFbButtons(linkButtons, 'absent');

      window.fb.setIsEnabled(true);
    });

    test('FB Contact. Device is offline', function() {
      navigator.onLine = false;
      window.fb.setIsFbContact(true);

      subject.render(null, TAG_OPTIONS);

      assertFbButtons(fbButtons, 'present');
    });

    test('FB Contact. Device is online', function() {
      navigator.onLine = true;
      window.fb.setIsFbContact(true);

      subject.render(null, TAG_OPTIONS);

      assertFbButtons(fbButtons, 'present');
      assertFbButtons(fbButtons, 'absent', 'disabled');
    });

    test('Not FB Contact. Device is offline', function() {
      navigator.onLine = false;
      window.fb.setIsFbContact(false);

      subject.render(null, TAG_OPTIONS);

      assertFbButtons(linkButtons, 'present', 'disabled');
    });

    test('Not FB Contact. Device is online', function() {
      navigator.onLine = true;
      window.fb.setIsFbContact(false);

      subject.render(null, TAG_OPTIONS);

      assertFbButtons(linkButtons, 'present');
      assertFbButtons(linkButtons, 'absent', 'disabled');
    });
  });

  suite('Render ContactsButtons', function() {
    setup(function() {
      this.sinon.stub(MockContactsButtons, 'renderPhones');
      this.sinon.stub(MockContactsButtons, 'renderEmails');

      subject.render(null, TAG_OPTIONS);
    });

    test('initializes ContactsButtons', function() {
      this.sinon.stub(MockContactsButtons, 'init');
      subject.init(dom);
      sinon.assert.calledWith(MockContactsButtons.init, listContainer,
                              contactDetails, ActivityHandler);
    });

    test('calls renderPhones', function() {
      sinon.assert.calledWith(MockContactsButtons.renderPhones, mockContact);
    });

    test('calls renderEmails', function() {
      sinon.assert.calledWith(MockContactsButtons.renderEmails, mockContact);
    });
  });

  suite('Render addresses', function() {
    test('with 1 address', function() {
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'address-details-template-0');
      var address0 = mockContact.adr[0];
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.countryName, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.locality, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.postalCode, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.streetAddress, true));
    });

    test('with no addresses', function() {
      var contactWoAddress = new MockContactAllFields(true);
      contactWoAddress.adr = [];
      subject.setContact(contactWoAddress);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('address-details-template'));
    });

    test('with null addresses', function() {
      var contactWoAddress = new MockContactAllFields(true);
      contactWoAddress.adr = null;
      subject.setContact(contactWoAddress);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('address-details-template'));
    });

    test('with more than 1 address', function() {
      var contactMultAddress = new MockContactAllFields(true);
      contactMultAddress.adr[1] = contactMultAddress.adr[0];
      for (var elem in contactMultAddress.adr[1]) {
        var currentElem = contactMultAddress.adr[1][elem] + 'dup';
        contactMultAddress.adr[1][elem] = currentElem;
      }
      subject.setContact(contactMultAddress);
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'address-details-template-0');
      assert.include(container.innerHTML, 'address-details-template-1');
      var address0 = contactMultAddress.adr[0];
      var address1 = contactMultAddress.adr[1];
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.countryName, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.locality, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.postalCode, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address0.streetAddress, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address1.countryName, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address1.locality, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address1.postalCode, true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(address1.streetAddress, true));
      var toCheck = container.innerHTML;
      assert.equal(-1, toCheck.indexOf('address-details-template-2'));
    });
  });

  suite('Render dates', function() {

    function assertRenderedDate(date, dateBlock) {
      var offset = date.getTimezoneOffset() * 60 * 1000;
      var targetDate = new Date(date.getTime() + offset);
      assert.equal(dateBlock.querySelector('strong').textContent,
                   targetDate.toString());
    }

    test('with bday', function() {
      subject.render(null, TAG_OPTIONS);
      var bdayBlock = container.querySelector('#dates-template-1');
      assert.isNotNull(bdayBlock);
      // Ensuring timezone correctly treated (Bug 880775)
      assertRenderedDate(mockContact.bday, bdayBlock);
    });

    test('with anniversary', function() {
      var contactWithAnn = new MockContactAllFields(true);
      contactWithAnn.bday = null;
      contactWithAnn.anniversary = new Date(0);
      subject.setContact(contactWithAnn);
      subject.render(null, TAG_OPTIONS);

      var dateBlock = container.querySelector('#dates-template-1');
      assert.isNotNull(dateBlock);
      assertRenderedDate(contactWithAnn.anniversary, dateBlock);
    });

    test('with bday and anniversary', function() {
      var contactWithAll = new MockContactAllFields(true);
      contactWithAll.anniversary = new Date(0);
      subject.setContact(contactWithAll);
      subject.render(null, TAG_OPTIONS);

      var fields = ['bday', 'anniversary'];

      for (var j = 0; j < fields.length; j++) {
        var dateBlock = container.querySelector('#dates-template-' + (j + 1));
        assert.isNotNull(dateBlock);
        assertRenderedDate(contactWithAll[fields[j]], dateBlock);
      }
    });

    test('without dates', function() {
      var contactWoDates = new MockContactAllFields(true);
      contactWoDates.bday = null;
      contactWoDates.anniversary = null;

      subject.setContact(contactWoDates);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('dates'));
    });
  });

  suite('Render notes', function() {
    test('with 1 note', function() {
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'note-details-template-0');
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(mockContact.note[0], true));
    });

    test('with no notes', function() {
      var contactWoNote = new MockContactAllFields(true);
      contactWoNote.note = [];
      subject.setContact(contactWoNote);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('note-details-template'));
    });

    test('with null notes', function() {
      var contactWoNote = new MockContactAllFields(true);
      contactWoNote.note = null;
      subject.setContact(contactWoNote);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('note-details-template'));
    });

    test('with more than 1 note', function() {
      var contactMultNote = new MockContactAllFields(true);
      contactMultNote.note[1] = String(contactMultNote.note[0]);

      subject.setContact(contactMultNote);
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'note-details-template-0');
      assert.include(container.innerHTML, 'note-details-template-1');
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(contactMultNote.note[0], true));
      assert.include(container.innerHTML,
                    Normalizer.escapeHTML(contactMultNote.note[1], true));
      assert.equal(-1, container.innerHTML.indexOf('note-details-template-2'));
    });
  });

  suite('Render duplicate section', function() {
    test('Total contacts = 1 -> Find merge button disabled ', function() {
      MockContactsListObj.total = 1;
      subject.render(null, TAG_OPTIONS);
      assert.isTrue(container.querySelector('#find-merge-button').disabled);
    });

    test('Total contacts > 1 -> Find merge button enabled ', function() {
      MockContactsListObj.total = 2;
      subject.render(null, TAG_OPTIONS);
      assert.isFalse(container.querySelector('#find-merge-button').disabled);
    });

    test('FB Imported Contact -> Find Duplicates does not appear', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(false);

      subject.render(null, TAG_OPTIONS);
      assert.isNull(container.querySelector('#find-merge-button'));
    });

    test('FB Linked Contact -> Find Duplicates appears', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(true);

      subject.render(null, TAG_OPTIONS);
      assert.isNotNull(container.querySelector('#find-merge-button'));

      window.fb.setIsFbContact(false);
      window.fb.setIsFbLinked(false);
    });
  });

  suite('Render in read only mode', function() {
    setup(function() {
      subject.render(null, TAG_OPTIONS, true);
    });

    test('> editing button is disabled if we are in read only', function() {
      assert.isTrue(editContactButton.classList.contains('hide'));
    });

    test('> link and share buttons are disabled in reado only', function() {
      assert.isTrue(socialTemplate.classList.contains('hide'));
    });
  });

  suite('Render photos', function() {
    test('without photo', function() {
      subject.render(null, TAG_OPTIONS);
      assert.equal(cover.style.backgroundImage, '');
      assert.equal(cover.style.overflow, 'auto');
      assert.equal(contactDetails.style.transform, '');
      assert.isTrue(contactDetails.classList.contains('no-photo'));
      assert.isFalse(contactDetails.classList.contains('up'));
    });

    test('with null photo', function() {
      var contactWoPhoto = new MockContactAllFields();
      contactWoPhoto.photo = null;
      subject.setContact(contactWoPhoto);

      subject.render(null, TAG_OPTIONS);

      assert.equal(cover.style.backgroundImage, '');
      assert.equal(cover.style.overflow, 'auto');
      assert.equal(contactDetails.style.transform, '');
      assert.isTrue(contactDetails.classList.contains('no-photo'));
      assert.isFalse(contactDetails.classList.contains('up'));
    });

    // See bug 946064
    test(
    'Adding one with photo and then adding the same (photo is kept as it is)',
    function(done) {
      var contact = new MockContactAllFields();
      subject.setContact(contact);
      var observer = new MutationObserver(function() {
        assert.isTrue(contactDetails.classList.contains('up'));
        // assert.include worked only for string and arrays!!
        // in new version chaijs fail
        //assert.include(dom.innerHTML, contact.photo[0]);

        observer.disconnect();
        var spy = sinon.spy(utils.dom, 'updatePhoto');

        var observer2 = new MutationObserver(function() {
          observer2.disconnect();
          assert.equal(spy.callCount, 0);
          done();
        });
        observer2.observe(cover, {
          attributes: true,
          attributeFilter: ['data-photo-ready']
        });
        subject.render(null, TAG_OPTIONS);
      });

      observer.observe(cover, {
        attributes: true,
        attributeFilter: ['data-img-hash']
      });

      subject.render(null, TAG_OPTIONS);
    });
  });

  suite('NFC activation', function() {
    setup(function() {
      this.sinon.spy(NFC, 'startListening');
      this.sinon.spy(NFC, 'stopListening');
    });

    test('> start listening when render a contact', function() {
      subject.render(null, TAG_OPTIONS);
      sinon.assert.calledOnce(NFC.startListening);
    });

    test('> stop listening when opening edit mode', function() {
      // subject.render(null, TAG_OPTIONS);
      // sinon.assert.calledOnce(NFC.startListening);
      editContactButton.click();
      sinon.assert.calledOnce(NFC.stopListening);
    });

    test('> stop listening when closing details', function() {
      // subject.render(null, TAG_OPTIONS);
      // sinon.assert.calledOnce(NFC.startListening);
      triggerEvent(header, 'action');
      sinon.assert.calledOnce(NFC.stopListening);
    });
  });

  suite('> Handle back button', function() {
    setup(function () {
      this.sinon.spy(MockWebrtcClient, 'stop');
      this.sinon.spy(window.ActivityHandler, 'postCancel');
      this.sinon.spy(MainNavigation, 'back');
    });

    test('> going back from details', function () {
      triggerEvent(header, 'action');

      sinon.assert.calledOnce(MockWebrtcClient.stop);
      sinon.assert.notCalled(ActivityHandler.postCancel);
      sinon.assert.calledOnce(MainNavigation.back);
    });

    test('> going back from details during an activity', function () {
      ActivityHandler.currentlyHandling = true;
      triggerEvent(header, 'action');

      sinon.assert.calledOnce(MockWebrtcClient.stop);
      sinon.assert.calledOnce(ActivityHandler.postCancel);
      sinon.assert.notCalled(MainNavigation.back);

      ActivityHandler.currentlyHandling = false;
    });

    test('> going back from details during an IMPORT activity', function () {
      ActivityHandler.currentlyHandling = true;
      ActivityHandler.activityName = 'import';
      triggerEvent(header, 'action');

      sinon.assert.calledOnce(MockWebrtcClient.stop);
      sinon.assert.notCalled(ActivityHandler.postCancel);
      sinon.assert.calledOnce(MainNavigation.back);

      ActivityHandler.currentlyHandling = false;
      ActivityHandler.activityName = 'view';
    });

    suite('back_to_previous_tab set', function() {
      setup(function() {
        window.location.hash = '#nothing?back_to_previous_tab=1';
      });
      teardown(function() {
        window.location.hash = '';
      });

      test('> should not navigate back', function() {
        triggerEvent(header, 'action');
        sinon.assert.notCalled(MainNavigation.back);
      });
    });
  });

});
