//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/test/unit/mock_details_dom.js.html');

requireApp('communications/contacts/js/contacts_details.js');
requireApp('communications/contacts/js/utilities/normalizer.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contact_all_fields.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_extfb.js');

var subject,
    container,
    realL10n,
    realOnLine,
    dom,
    contact,
    contactDetails,
    listContainer,
    star,
    detailsName,
    orgTitle,
    birthdayTemplate,
    phonesTemplate,
    emailsTemplate,
    addressesTemplate,
    socialTemplate,
    isFbContact,
    editContactButton,
    cover,
    favoriteMessage,
    detailsInner,
    TAG_OPTIONS,
    dom,
    fb,
    Contacts,
    realContacts,
    realFb,
    mozL10n,
    mockContact,
    fbButtons,
    linkButtons;

suite('Render contact', function() {

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

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });

    realContacts = window.Contacts;
    window.Contacts = MockContactsApp;
    realFb = window.fb;
    window.fb = MockFb;
    window.Contacts.extFb = MockExtFb;
    dom = document.createElement('section');
    dom.id = 'view-contact-details';
    dom.innerHTML = MockDetailsDom;
    container = dom.querySelector('#details-list');
    subject = contacts.Details;
    subject.init(dom);
    contactDetails = dom.querySelector('#contact-detail');
    listContainer = dom.querySelector('#details-list');
    star = dom.querySelector('#favorite-star');
    detailsName = dom.querySelector('#contact-name-title');
    orgTitle = dom.querySelector('#org-title');
    birthdayTemplate = dom.querySelector('#birthday-template-\\#i\\#');
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
    window.fb = realFb;
    window.mozL10n = realL10n;
    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
  });

  setup(function() {
    mockContact = new MockContactAllFields();
    subject.setContact(mockContact);
    TAG_OPTIONS = Contacts.getTags();
    window.set;
  });

  teardown(function() {
    container.innerHTML = '';
  });

  suite('Render name', function() {
    test('with name', function() {
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsName.textContent, mockContact.name[0]);
    });

    test('without name', function() {
      var contactWoName = new MockContactAllFields();
      contactWoName.name = null;
      subject.setContact(contactWoName);
      subject.render(null, TAG_OPTIONS);
      assert.equal(detailsName.textContent, '');
    });
  });

  suite('Render favorite', function() {
    test('with favorite contact', function() {
      subject.render(null, TAG_OPTIONS);
      assert.equal(false, star.classList.contains('hide'));
    });
    test('without favorite contact', function() {
      var contactWoFav = new MockContactAllFields();
      contactWoFav.category = [];
      subject.setContact(contactWoFav);
      subject.render(null, TAG_OPTIONS);
      assert.equal(true, star.classList.contains('hide'));
    });
  });

  suite('Render org', function() {
    test('with org', function() {
      subject.render(null, TAG_OPTIONS);
      assert.equal(mockContact.org[0], orgTitle.textContent);
      assert.equal(false, orgTitle.classList.contains('hide'));
    });
    test('without org', function() {
      var contactWoOrg = new MockContactAllFields();
      contactWoOrg.org = [];
      subject.setContact(contactWoOrg);
      subject.render(null, TAG_OPTIONS);
      assert.equal('', orgTitle.textContent);
      assert.equal(true, orgTitle.classList.contains('hide'));
    });
  });

  suite('Render bday', function() {
    test('with bday', function() {
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, mockContact.bday);
    });
    test('without bday', function() {
      var contactWoBday = new MockContactAllFields();
      contactWoBday.bday = null;
      subject.setContact(contactWoBday);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('birthday'));
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
    });

    test('with no phones', function() {
      var contactWoTel = new MockContactAllFields();
      contactWoTel.tel = [];
      subject.setContact(contactWoTel);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template'));
    });

    test('with null phones', function() {
      var contactWoTel = new MockContactAllFields();
      contactWoTel.tel = null;
      subject.setContact(contactWoTel);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template'));
    });

    test('with more than 1 phone', function() {
      var contactMultTel = new MockContactAllFields();
      contactMultTel.tel[1] = contactMultTel.tel[0];
      for (var elem in contactMultTel.tel[1]) {
        var currentElem = contactMultTel.tel[1][elem] + 'dup';
        contactMultTel.tel[1][elem] = currentElem;
      }
      subject.setContact(contactMultTel);
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'phone-details-template-0');
      assert.include(container.innerHTML, 'phone-details-template-1');
      assert.include(container.innerHTML, contactMultTel.tel[0].value);
      assert.include(container.innerHTML, contactMultTel.tel[0].carrier);
      assert.include(container.innerHTML, contactMultTel.tel[0].type);
      assert.include(container.innerHTML, contactMultTel.tel[1].value);
      assert.include(container.innerHTML, contactMultTel.tel[1].carrier);
      assert.include(container.innerHTML, contactMultTel.tel[1].type);
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template-2'));
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
      var contactWoEmail = new MockContactAllFields();
      contactWoEmail.email = [];
      subject.setContact(contactWoEmail);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('email-details-template'));
    });

    test('with null emails', function() {
      var contactWoEmail = new MockContactAllFields();
      contactWoEmail.email = null;
      subject.setContact(contactWoEmail);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('email-details-template'));
    });

    test('with more than 1 email', function() {
      var contactMultEmail = new MockContactAllFields();
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
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.countryName, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.locality, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.postalCode, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.streetAddress, true));
    });

    test('with no addresses', function() {
      var contactWoAddress = new MockContactAllFields();
      contactWoAddress.adr = [];
      subject.setContact(contactWoAddress);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('address-details-template'));
    });

    test('with null addresses', function() {
      var contactWoAddress = new MockContactAllFields();
      contactWoAddress.adr = null;
      subject.setContact(contactWoAddress);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('address-details-template'));
    });

    test('with more than 1 address', function() {
      var contactMultAddress = new MockContactAllFields();
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
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.countryName, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.locality, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.postalCode, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address0.streetAddress, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address1.countryName, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address1.locality, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address1.postalCode, true));
      assert.include(container.innerHTML, utils.text.escapeHTML(address1.streetAddress, true));
      var toCheck = container.innerHTML;
      assert.equal(-1, toCheck.indexOf('address-details-template-2'));
    });
  });
  suite('Render notes', function() {
    test('with 1 note', function() {
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'note-details-template-0');
      assert.include(container.innerHTML, utils.text.escapeHTML(mockContact.note[0], true));
    });

    test('with no notes', function() {
      var contactWoNote = new MockContactAllFields();
      contactWoNote.note = [];
      subject.setContact(contactWoNote);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('note-details-template'));
    });

    test('with null notes', function() {
      var contactWoNote = new MockContactAllFields();
      contactWoNote.note = null;
      subject.setContact(contactWoNote);
      subject.render(null, TAG_OPTIONS);
      assert.equal(-1, container.innerHTML.indexOf('note-details-template'));
    });

    test('with more than 1 note', function() {
      var contactMultNote = new MockContactAllFields();
      contactMultNote.note[1] = contactMultNote.note[0];
      for (var elem in contactMultNote.note[1]) {
        var currentElem = contactMultNote.note[1][elem] + 'dup';
        contactMultNote.note[1][elem] = currentElem;
      }
      subject.setContact(contactMultNote);
      subject.render(null, TAG_OPTIONS);
      assert.include(container.innerHTML, 'note-details-template-0');
      assert.include(container.innerHTML, 'note-details-template-1');
      assert.include(container.innerHTML, utils.text.escapeHTML(contactMultNote.note[0], true));
      assert.include(container.innerHTML, utils.text.escapeHTML(contactMultNote.note[1], true));
      assert.equal(-1, container.innerHTML.indexOf('note-details-template-2'));
    });
  });
  suite('Render photo', function() {
    test('with photo', function() {
      subject.render(null, TAG_OPTIONS);
      assert.isTrue(contactDetails.classList.contains('up'));
      assert.include(dom.innerHTML, mockContact.photo[0]);
    });
    test('without photo', function() {
      var contactWoPhoto = new MockContactAllFields();
      contactWoPhoto.photo = [];
      subject.setContact(contactWoPhoto);
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
  });

});
