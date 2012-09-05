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

//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/test/unit/mock_details_dom.js.html');

requireApp('communications/contacts/js/contacts_details.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contact_all_fields.js');
requireApp('communications/contacts/test/unit/mock_fb.js');

var subject,
    container,
    realL10n,
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
    Contacts;

function clone(object) {
  var newObj = {};
  for (var key in object) {
    newObj[key] = object[key];
  }
  return newObj;
}

suite('Render contact', function() {

  suiteSetup(function() {
    dom = document.createElement('section');
    dom.id = 'view-contact-details';
    dom.innerHTML = MockDetailsDom;
    container = dom.querySelector('#details-list');
    subject = contacts.Details;
    subject.setFb(fb);
    subject.init(dom);
    subject.setContactsObject(MockContacts);
    realL10n = navigator.mozL10n;
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
  });

  suiteTeardown(function() {
  });

  setup(function() {
    subject.setContact(MockContactAllFields);
  });

  teardown(function() {
    container.innerHTML = '';
  });

  suite('Render name', function() {
    test('with name', function() {
      subject.render();
      assert.equal(detailsName.textContent, MockContactAllFields.name[0]);
    });

    test('without name', function() {
      var contactWoName = clone(MockContactAllFields);
      contactWoName.name = null;
      subject.setContact(contactWoName);
      subject.render();
      assert.equal(detailsName.textContent, '');
    });
  });

  suite('Render favorite', function() {
    test('with favorite contact', function() {
      subject.render();
      assert.equal(false, star.classList.contains('hide'));
    });
    test('without favorite contact', function() {
      var contactWoFav = clone(MockContactAllFields);
      contactWoFav.category = [];
      subject.setContact(contactWoFav);
      subject.render();
      assert.equal(true, star.classList.contains('hide'));
    });
  });

  suite('Render org', function() {
    test('with org', function() {
      subject.render();
      assert.equal(MockContactAllFields.org[0], orgTitle.textContent);
      assert.equal(false, orgTitle.classList.contains('hide'));
    });
    test('without org', function() {
      var contactWoOrg = clone(MockContactAllFields);
      contactWoOrg.org = [];
      subject.setContact(contactWoOrg);
      subject.render();
      assert.equal('', orgTitle.textContent);
      assert.equal(true, orgTitle.classList.contains('hide'));
    });
  });

  suite('Render bday', function() {
    test('with bday', function() {
      subject.render();
      assert.include(container.innerHTML, MockContactAllFields.bday);
    });
    test('without bday', function() {
      var contactWoBday = clone(MockContactAllFields);
      contactWoBday.bday = null;
      subject.setContact(contactWoBday);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('birthday'));
    });
  });

  suite('Render social', function() {
    test('!isFbContact', function() {
      subject.render();
      assert.include(container.innerHTML, 'social-template');
      var toCheck = 'Contacts.extFb.startLink(" 1","true")';
      assert.include(container.innerHTML, toCheck);
    });
  });

  suite('Render phones', function() {
    test('with 1 phone', function() {
      subject.render();
      assert.include(container.innerHTML, 'phone-details-template-0');
      assert.include(container.innerHTML, MockContactAllFields.tel[0].value);
      assert.include(container.innerHTML, MockContactAllFields.tel[0].carrier);
      assert.include(container.innerHTML, MockContactAllFields.tel[0].type);
    });

    test('with no phones', function() {
      var contactWoTel = clone(MockContactAllFields);
      contactWoTel.tel = [];
      subject.setContact(contactWoTel);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template'));
    });

    test('with null phones', function() {
      var contactWoTel = clone(MockContactAllFields);
      contactWoTel.tel = null;
      subject.setContact(contactWoTel);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template'));
    });

    test('with more than 1 phone', function() {
      var contactMultTel = clone(MockContactAllFields);
      contactMultTel.tel[1] = contactMultTel.tel[0];
      for (var elem in contactMultTel.tel[1]) {
        var currentElem = contactMultTel.tel[1][elem] + 'dup';
        contactMultTel.tel[1][elem] = currentElem;
      }
      subject.setContact(contactMultTel);
      subject.render();
      assert.include(container.innerHTML, 'phone-details-template-0');
      assert.include(container.innerHTML, 'phone-details-template-1');
      assert.include(container.innerHTML, MockContactAllFields.tel[0].value);
      assert.include(container.innerHTML, MockContactAllFields.tel[0].carrier);
      assert.include(container.innerHTML, MockContactAllFields.tel[0].type);
      assert.include(container.innerHTML, MockContactAllFields.tel[1].value);
      assert.include(container.innerHTML, MockContactAllFields.tel[1].carrier);
      assert.include(container.innerHTML, MockContactAllFields.tel[1].type);
      assert.equal(-1, container.innerHTML.indexOf('phone-details-template-2'));
    });
  });

  suite('Render emails', function() {
    test('with 1 email', function() {
      subject.render();
      assert.include(container.innerHTML, 'email-details-template-0');
      assert.include(container.innerHTML, MockContactAllFields.email[0].value);
      assert.include(container.innerHTML, MockContactAllFields.email[0].type);
    });

    test('with no emails', function() {
      var contactWoEmail = clone(MockContactAllFields);
      contactWoEmail.email = [];
      subject.setContact(contactWoEmail);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('email-details-template'));
    });

    test('with null emails', function() {
      var contactWoEmail = clone(MockContactAllFields);
      contactWoEmail.email = null;
      subject.setContact(contactWoEmail);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('email-details-template'));
    });

    test('with more than 1 email', function() {
      var contactMultEmail = clone(MockContactAllFields);
      contactMultEmail.email[1] = contactMultEmail.email[0];
      for (var elem in contactMultEmail.email[1]) {
        var currentElem = contactMultEmail.email[1][elem] + 'dup';
        contactMultEmail.email[1][elem] = currentElem;
      }
      subject.setContact(contactMultEmail);
      subject.render();
      assert.include(container.innerHTML, 'email-details-template-0');
      assert.include(container.innerHTML, 'email-details-template-1');
      var email0 = MockContactAllFields.email[0];
      var email1 = MockContactAllFields.email[1];
      assert.include(container.innerHTML, email0.value);
      assert.include(container.innerHTML, email0.type);
      assert.include(container.innerHTML, email1.value);
      assert.include(container.innerHTML, email1.type);
      assert.equal(-1, container.innerHTML.indexOf('email-details-template-2'));
    });
  });
  suite('Render addresses', function() {
    test('with 1 address', function() {
      subject.render();
      assert.include(container.innerHTML, 'address-details-template-0');
      var address0 = MockContactAllFields.adr[0];
      assert.include(container.innerHTML, address0.countryName);
      assert.include(container.innerHTML, address0.locality);
      assert.include(container.innerHTML, address0.postalCode);
      assert.include(container.innerHTML, address0.streetAddress);
    });

    test('with no addresses', function() {
      var contactWoAddress = clone(MockContactAllFields);
      contactWoAddress.adr = [];
      subject.setContact(contactWoAddress);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('address-details-template'));
    });

    test('with null addresses', function() {
      var contactWoAddress = clone(MockContactAllFields);
      contactWoAddress.adr = null;
      subject.setContact(contactWoAddress);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('address-details-template'));
    });

    test('with more than 1 address', function() {
      var contactMultAddress = clone(MockContactAllFields);
      contactMultAddress.adr[1] = contactMultAddress.adr[0];
      for (var elem in contactMultAddress.adr[1]) {
        var currentElem = contactMultAddress.adr[1][elem] + 'dup';
        contactMultAddress.adr[1][elem] = currentElem;
      }
      subject.setContact(contactMultAddress);
      subject.render();
      assert.include(container.innerHTML, 'address-details-template-0');
      assert.include(container.innerHTML, 'address-details-template-1');
      var address0 = MockContactAllFields.adr[0];
      var address1 = MockContactAllFields.adr[1];
      assert.include(container.innerHTML, address0.countryName);
      assert.include(container.innerHTML, address0.locality);
      assert.include(container.innerHTML, address0.postalCode);
      assert.include(container.innerHTML, address0.streetAddress);
      assert.include(container.innerHTML, address1.countryName);
      assert.include(container.innerHTML, address1.locality);
      assert.include(container.innerHTML, address1.postalCode);
      assert.include(container.innerHTML, address1.streetAddress);
      var toCheck = container.innerHTML;
      assert.equal(-1, toCheck.indexOf('address-details-template-2'));
    });
  });
  suite('Render notes', function() {
    test('with 1 note', function() {
      subject.render();
      assert.include(container.innerHTML, 'note-details-template-0');
      assert.include(container.innerHTML, MockContactAllFields.note[0]);
    });

    test('with no notes', function() {
      var contactWoNote = clone(MockContactAllFields);
      contactWoNote.note = [];
      subject.setContact(contactWoNote);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('note-details-template'));
    });

    test('with null notes', function() {
      var contactWoNote = clone(MockContactAllFields);
      contactWoNote.note = null;
      subject.setContact(contactWoNote);
      subject.render();
      assert.equal(-1, container.innerHTML.indexOf('note-details-template'));
    });

    test('with more than 1 note', function() {
      var contactMultNote = clone(MockContactAllFields);
      contactMultNote.note[1] = contactMultNote.note[0];
      for (var elem in contactMultNote.note[1]) {
        var currentElem = contactMultNote.note[1][elem] + 'dup';
        contactMultNote.note[1][elem] = currentElem;
      }
      subject.setContact(contactMultNote);
      subject.render();
      assert.include(container.innerHTML, 'note-details-template-0');
      assert.include(container.innerHTML, 'note-details-template-1');
      assert.include(container.innerHTML, MockContactAllFields.note[0]);
      assert.include(container.innerHTML, MockContactAllFields.note[1]);
      assert.equal(-1, container.innerHTML.indexOf('note-details-template-2'));
    });
  });
  suite('Render photo', function() {
    test('with photo', function() {
      subject.render();
      assert.isTrue(contactDetails.classList.contains('up'));
      assert.include(dom.innerHTML, MockContactAllFields.photo[0]);
    });
    test('without photo', function() {
      var contactWoPhoto = clone(MockContactAllFields);
      contactWoPhoto.photo = [];
      subject.setContact(contactWoPhoto);
      subject.render();
      assert.equal(cover.style.backgroundImage, '');
      assert.equal(cover.style.overflow, 'visible');
      assert.equal(contactDetails.style.transform, '');
      assert.isTrue(contactDetails.classList.contains('no-photo'));
      assert.isFalse(contactDetails.classList.contains('up'));
    });
    test('with null photo', function() {
      var contactWoPhoto = clone(MockContactAllFields);
      contactWoPhoto.photo = null;
      subject.setContact(contactWoPhoto);
      subject.render();
      assert.equal(cover.style.backgroundImage, '');
      assert.equal(cover.style.overflow, 'visible');
      assert.equal(contactDetails.style.transform, '');
      assert.isTrue(contactDetails.classList.contains('no-photo'));
      assert.isFalse(contactDetails.classList.contains('up'));
    });
  });

});
