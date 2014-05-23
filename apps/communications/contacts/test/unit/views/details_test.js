'use strict';
/* global contacts */
/* global LazyLoader */
/* global MmiManager */
/* global MockActivities */
/* global MockContactAllFields */
/* global MockContacts */
/* global MockContactsListObj */
/* global MockDetailsDom */
/* global MockExtFb */
/* global Mockfb */
/* global MocksHelper */
/* global MultiSimActionButton */
/* global Normalizer */
/* global TelephonyHelper */
/* global utils */
/* exported SCALE_RATIO */

//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/test/unit/mock_details_dom.js.html');

require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');
require('/shared/js/contacts/utilities/event_listeners.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_multi_sim_action_button.js');
require('/dialer/test/unit/mock_mmi_manager.js');
require('/dialer/test/unit/mock_telephony_helper.js');

requireApp('communications/contacts/js/views/details.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_extfb.js');
requireApp('communications/contacts/test/unit/mock_activities.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');

var subject,
    container,
    realL10n,
    realOnLine,
    realFormatDate,
    realActivityHandler,
    dom,
    contactDetails,
    listContainer,
    detailsName,
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
    dom,
    Contacts,
    realContacts,
    realFb,
    mockContact,
    fbButtons,
    linkButtons,
    realContactsList,
    mozL10nGetSpy;

var SCALE_RATIO = 1;

if (!window.ActivityHandler) {
  window.ActivityHandler = null;
}

var mocksHelperForDetailView = new MocksHelper([
  'ContactPhotoHelper',
  'LazyLoader',
  'MmiManager',
  'MultiSimActionButton',
  'TelephonyHelper'
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
    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    realL10n = navigator.mozL10n;
    realActivityHandler = window.ActivityHandler;
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

    window.ActivityHandler = MockActivities;

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });

    realContactsList = contacts.List;
    contacts.List = MockContactsListObj;
    realContacts = window.Contacts;
    window.Contacts = MockContacts;
    realFb = window.fb;
    window.fb = Mockfb;
    window.Contacts.extServices = MockExtFb;
    dom = document.createElement('section');
    dom.id = 'view-contact-details';
    dom.innerHTML = MockDetailsDom;
    container = dom.querySelector('#details-list');
    subject = contacts.Details;
    subject.init(dom);
    contactDetails = dom.querySelector('#contact-detail');
    listContainer = dom.querySelector('#details-list');
    detailsName = dom.querySelector('#contact-name-title');
    orgTitle = dom.querySelector('#org-title');
    phonesTemplate = dom.querySelector('#phone-details-template-\\#i\\#');
    emailsTemplate = dom.querySelector('#email-details-template-\\#i\\#');
    addressesTemplate = dom.querySelector('#address-details-template-\\#i\\#');
    socialTemplate = dom.querySelector('#social-template-\\#i\\#');
    editContactButton = dom.querySelector('#edit-contact-button');
    cover = dom.querySelector('#cover-img');
    detailsInner = dom.querySelector('#contact-detail-inner');
    favoriteMessage = dom.querySelector('#toggle-favorite').children[0];

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

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
    utils.misc.formatDate = realFormatDate;
    window.ActivityHandler = realActivityHandler;
  });

  setup(function() {
    mockContact = new MockContactAllFields(true);
    subject.setContact(mockContact);
    TAG_OPTIONS = Contacts.getTags();
    window.set;
  });

  teardown(function() {
    container.innerHTML = '';
    mozL10nGetSpy.reset();
  });

  suite('Render name', function() {
    test('with name', function() {
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsName.textContent, mockContact.name[0]);
    });

    test('without name, with phone', function() {
      var contactWoName = new MockContactAllFields(true);
      contactWoName.name = null;
      subject.setContact(contactWoName);
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsName.textContent, contactWoName.tel[0].value);
    });

    test('without name, without phone, with email', function() {
      var contactWoName = new MockContactAllFields(true);
      contactWoName.name = null;
      contactWoName.tel = null;
      subject.setContact(contactWoName);
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsName.textContent, contactWoName.email[0].value);
    });

    test('no name, no phone, no email', function() {
      var contactWoName = new MockContactAllFields(true);
      contactWoName.name = null;
      contactWoName.tel = null;
      contactWoName.email = null;
      subject.setContact(contactWoName);
      subject.render(null, TAG_OPTIONS);
      assert.notEqual(detailsName.textContent, '');
      assert.isTrue(mozL10nGetSpy.calledWith('noName'));
    });

  });

  suite('Render favorite', function() {
    test('with favorite contact', function() {
      subject.render(null, TAG_OPTIONS);
      assert.isTrue(detailsName.classList.contains('favorite'));
    });
    test('without favorite contact', function() {
      var contactWoFav = new MockContactAllFields(true);
      contactWoFav.category = [];
      subject.setContact(contactWoFav);
      subject.render(null, TAG_OPTIONS);
      assert.isFalse(detailsName.classList.contains('favorite'));
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

      assertFbButtons(fbButtons, 'present', 'disabled');
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

  suite('Render phones', function() {
    test('with 1 phone', function() {
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'phone-details-template-0');
      assert.include(container.innerHTML, mockContact.tel[0].value);
      assert.include(container.innerHTML, mockContact.tel[0].carrier);
      assert.include(container.innerHTML, mockContact.tel[0].type);
      assert.include(
        container.querySelector('h2').innerHTML,
        mockContact.tel[0].carrier
      );
      assert.isTrue(mozL10nGetSpy.calledWith('separator'));
    });

    test('with 1 phone and carrier undefined', function() {

      var contactNoCarrier = new MockContactAllFields(true);
      contactNoCarrier.tel = [
        {
          value: '+34678987123',
          type: ['Personal']
        }
      ];
      subject.setContact(contactNoCarrier);
      subject.render(null, TAG_OPTIONS);
      var phoneButton = container.querySelector('#call-or-pick-0');
      assert.equal(phoneButton.querySelector('b').textContent,
                    contactNoCarrier.tel[0].value);
      var carrierContent = container.querySelector('.carrier').textContent;
      assert.lengthOf(carrierContent, 0);

    });

    test('with no phones', function() {
      var contactWoTel = new MockContactAllFields(true);
      contactWoTel.tel = [];
      subject.setContact(contactWoTel);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template'));
    });

    test('with null phones', function() {
      var contactWoTel = new MockContactAllFields(true);
      contactWoTel.tel = null;
      subject.setContact(contactWoTel);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template'));
    });

    test('with more than 1 phone', function() {
      var contactMultTel = new MockContactAllFields(true);
      contactMultTel.tel[1] = contactMultTel.tel[0];
      for (var elem in contactMultTel.tel[1]) {
        var currentElem = contactMultTel.tel[1][elem] + 'dup';
        contactMultTel.tel[1][elem] = currentElem;
      }
      contactMultTel.tel[1].type = '';
      subject.setContact(contactMultTel);
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'phone-details-template-0');
      assert.include(container.innerHTML, 'phone-details-template-1');
      assert.include(container.innerHTML, contactMultTel.tel[0].value);
      assert.include(container.innerHTML, contactMultTel.tel[0].carrier);
      assert.include(container.innerHTML, contactMultTel.tel[0].type);
      assert.include(container.innerHTML, contactMultTel.tel[1].value);
      assert.include(container.innerHTML, contactMultTel.tel[1].carrier);
      assert.include(container.innerHTML, subject.defaultTelType);
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template-2'));
    });

    test('highlight phone number', function() {

      var contact = new MockContactAllFields(true);
      contact.tel = [
        {
          value: '+48225363636',
          type: ['Personal']
        }
      ];
      subject.setContact(contact);
      subject.render(null, TAG_OPTIONS);
      subject.reMark('tel', contact.tel[0].value);
      var phoneButton = container.querySelector('#call-or-pick-0');
      assert.isTrue(phoneButton.classList.contains('remark'));

    });

    test('highlight phone number as missed', function() {

      var contact = new MockContactAllFields(true);
      contact.tel = [
        {
          value: '+48225363636',
          type: ['Personal']
        }
      ];
      subject.setContact(contact);
      subject.render(null, TAG_OPTIONS);
      subject.reMark('tel', contact.tel[0].value, 'remark-missed');
      var phoneButton = container.querySelector('#call-or-pick-0');
      assert.isTrue(phoneButton.classList.contains('remark-missed'));

    });
  });

  suite('Render emails', function() {
    test('with 1 email', function() {
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'email-details-template-0');
      assert.include(container.innerHTML, mockContact.email[0].value);
      assert.include(container.innerHTML, mockContact.email[0].type);
    });

    test('with no emails', function() {
      var contactWoEmail = new MockContactAllFields(true);
      contactWoEmail.email = [];
      subject.setContact(contactWoEmail);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('email-details-template'));
    });

    test('with null emails', function() {
      var contactWoEmail = new MockContactAllFields(true);
      contactWoEmail.email = null;
      subject.setContact(contactWoEmail);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('email-details-template'));
    });

    test('with more than 1 email', function() {
      var contactMultEmail = new MockContactAllFields(true);
      contactMultEmail.email[1] = contactMultEmail.email[0];
      for (var elem in contactMultEmail.email[1]) {
        var currentElem = contactMultEmail.email[1][elem] + 'dup';
        contactMultEmail.email[1][elem] = currentElem;
      }
      subject.setContact(contactMultEmail);
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'email-details-template-0');
      assert.include(container.innerHTML, 'email-details-template-1');
      var email0 = contactMultEmail.email[0];
      var email1 = contactMultEmail.email[1];
      assert.include(container.innerHTML, email0.value);
      assert.include(container.innerHTML, email0.type);
      assert.include(container.innerHTML, email1.value);
      assert.include(container.innerHTML, email1.type);
      assert.equal(-1, container.innerHTML.indexOf('email-details-template-2'));
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
        assert.include(dom.innerHTML, contact.photo[0]);

        observer.disconnect();
        var spy = sinon.spy(Contacts, 'updatePhoto');

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

  suite('> User actions', function() {
    var realMozTelephony;
    var realMozMobileConnection;
    suiteSetup(function() {
      realMozTelephony = navigator.mozTelephony;
      realMozMobileConnection = navigator.mozMobileConnection;
      navigator.mozTelephony = true;
      navigator.mozMobileConnection = true;
      sinon.spy(window, 'MultiSimActionButton');
    });

    suiteTeardown(function() {
      navigator.mozTelephony = realMozTelephony;
      navigator.mozMobileConnection = realMozMobileConnection;
    });

    setup(function() {
      this.sinon.spy(LazyLoader, 'load');
    });

    teardown(function() {
      LazyLoader.load.reset();
    });

    function makeCall(cb) {
      var theContact = new MockContactAllFields(true);
      subject.setContact(theContact);
      subject.render(null, TAG_OPTIONS);

      var stubCall = sinon.stub(TelephonyHelper, 'call', cb);
      MultiSimActionButton.args[0][1]();
      stubCall.restore();
    }

    test(' > Not loading MultiSimActionButton when we are on an activity',
         function() {
      this.sinon.stub(MmiManager, 'isMMI').returns(true);
      MockActivities.currentlyHandling = true;
      subject.render(null, TAG_OPTIONS);

      sinon.assert.notCalled(MmiManager.isMMI);
      sinon.assert.neverCalledWith(LazyLoader.load,
       ['/shared/js/multi_sim_action_button.js']);
      MockActivities.currentlyHandling = false;
    });

    test('> Not loading MultiSimActionButton if we have a MMI code',
         function() {
      this.sinon.stub(MmiManager, 'isMMI').returns(true);

      subject.render(null, TAG_OPTIONS);

      sinon.assert.called(MmiManager.isMMI);
      sinon.assert.neverCalledWith(LazyLoader.load,
       ['/shared/js/multi_sim_action_button.js']);
    });

    test('> Load call button', function() {
      this.sinon.stub(MmiManager, 'isMMI').returns(false);
      subject.render(null, TAG_OPTIONS);

      // We have two buttons, 2 calls per button created
      assert.equal(LazyLoader.load.callCount, 4);
      var spyCall = LazyLoader.load.getCall(1);
      assert.deepEqual(
        ['/shared/js/multi_sim_action_button.js'], spyCall.args[0]);
    });

    test('> Multiple MultiSimActionButtons initialized with correct values',
         function() {
      var theContact = new MockContactAllFields(true);
      subject.setContact(theContact);
      this.sinon.stub(MmiManager, 'isMMI').returns(false);

      subject.render(null, TAG_OPTIONS);

      var phone1 = container.querySelector('#call-or-pick-0');
      var phone2 = container.querySelector('#call-or-pick-1');
      var phoneNumber1 = theContact.tel[0].value;
      var phoneNumber2 = theContact.tel[1].value;

      sinon.assert.calledWith(MultiSimActionButton, phone1,
           sinon.match.func, 'ril.telephony.defaultServiceId',
           sinon.match.func);
      // Check the getter contains the correct phone number
      var getterResult = MultiSimActionButton.args[0][3]();
      assert.equal(phoneNumber1, getterResult);

      sinon.assert.calledWith(MultiSimActionButton, phone2,
           sinon.match.func, 'ril.telephony.defaultServiceId',
           sinon.match.func);
      // Second call getter result
      getterResult = MultiSimActionButton.args[1][3]();
      assert.equal(phoneNumber2, getterResult);

    });

    test('> Calling and oncall ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(contactDetails.classList.contains('calls-disabled'));
        oncall();
        assert.isFalse(contactDetails.classList.contains('calls-disabled'));
      });
    });

    test('> Calling and connected ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(contactDetails.classList.contains('calls-disabled'));
        connected();
        assert.isFalse(contactDetails.classList.contains('calls-disabled'));
      });
    });

    test('> Calling and disconnected ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(contactDetails.classList.contains('calls-disabled'));
        disconnected();
        assert.isFalse(contactDetails.classList.contains('calls-disabled'));
      });
    });

    test('> Calling and error ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(contactDetails.classList.contains('calls-disabled'));
        error();
        assert.isFalse(contactDetails.classList.contains('calls-disabled'));
      });
    });
  });

});
