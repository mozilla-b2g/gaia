require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/lazy_loader.js');
//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/test/unit/mock_form_dom.js.html');

requireApp('communications/contacts/js/views/form.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/js/utilities/dom.js');
requireApp('communications/contacts/js/utilities/event_listeners.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_contacts_search.js');
requireApp('communications/contacts/test/unit/mock_confirm_dialog.js');

var subject,
    realL10n,
    dom,
    fb,
    Contacts,
    realContacts,
    realFb,
    mozL10n,
    mockContact,
    footer,
    SimplePhoneMatcher,
    ActivityHandler;

var mocksForm = new MocksHelper([
  'ConfirmDialog'
]).init();

suite('Render contact form', function() {

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

    mocksForm.suiteSetup();

    realContacts = window.Contacts;
    window.Contacts = MockContacts;
    realFb = window.fb;
    window.fb = Mockfb;
    document.body.innerHTML = MockFormDom;
    footer = document.querySelector('footer');
    subject = contacts.Form;

    ActivityHandler = {
      currentlyHandling: false
    };


    subject.init(Contacts.getTags());
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    window.fb = realFb;
    window.mozL10n = realL10n;

    mocksForm.suiteTeardown();

    document.body.innerHTML = '';
  });

  setup(function() {
    mockContact = new MockContactAllFields();
  });

  teardown(function() {
    window.fb.setIsFbContact(false);
    window.fb.setIsFbLinked(false);
  });

  function assertSaveState(value) {
    var element = document.body.querySelector('#save-button');
    assert.equal(element.getAttribute('disabled'), value);
  }

  function assertCarrierState(ele, value) {
    var carrierField = ele.querySelector('input[data-field="carrier"]');
    var state = carrierField.getAttribute('disabled');
    assert.isTrue(value === state);
  }


  suite('Render add form', function() {
    test('without params', function() {
      subject.render();
      var toCheck = ['phone', 'address', 'email', 'note'];
      for (var i = 0; i < toCheck.length; i++) {
        var element = 'add-' + toCheck[i];
        var cont = document.body.innerHTML;
        assert.isTrue(cont.indexOf(element + '-0') > -1);
        assertEmpty(element + '-0');
        assert.isTrue(cont.indexOf(element + '-1') == -1);
        assert.isTrue(footer.classList.contains('hide'));
      }
      assertSaveState('disabled');
    });

    test('with tel params', function() {
      var params = {
        tel: '123'
      };
      subject.render(params);
      var toCheck = ['phone', 'address', 'email', 'note'];
      var cont = document.body.innerHTML;
      for (var i = 0; i < toCheck.length; i++) {
        var element = 'add-' + toCheck[i];
        assert.isTrue(cont.indexOf(element + '-0') > -1);
        assert.isTrue(cont.indexOf(element + '-1') == -1);
      }
      var value = document.querySelector('#number_0').value;
      assert.equal(value, params.tel);
      var valueEmail = document.querySelector('#email_0').value;
      assert.isFalse(valueEmail === params.tel);
      assert.equal(valueEmail, '');
      assert.isTrue(footer.classList.contains('hide'));

      assertSaveState(null);
    });

    test('with email params', function() {
      var params = {
        email: '123'
      };
      subject.render(params);
      var toCheck = ['phone', 'address', 'email', 'note'];
      var cont = document.body.innerHTML;
      for (var i = 0; i < toCheck.length; i++) {
        var element = 'add-' + toCheck[i];
        assert.isTrue(cont.indexOf(element + '-0') > -1);
        assert.isTrue(cont.indexOf(element + '-1') == -1);
      }
      var value = document.querySelector('#number_0').value;
      var valueEmail = document.querySelector('#email_0').value;
      assert.isTrue(valueEmail === params.email);
      assert.equal(value, '');
      assert.isTrue(footer.classList.contains('hide'));

      assertSaveState(null);
    });

    test('with email and tel params', function() {
      var params = {
        tel: '234',
        email: '123'
      };
      subject.render(params);
      var toCheck = ['phone', 'address', 'email', 'note'];
      var cont = document.body.innerHTML;
      for (var i = 0; i < toCheck.length; i++) {
        var element = 'add-' + toCheck[i];
        assert.isTrue(cont.indexOf(element + '-0') > -1);
        assert.isTrue(cont.indexOf(element + '-1') == -1);
      }
      var value = document.querySelector('#number_0').value;
      assert.isTrue(value === params.tel);
      var valueEmail = document.querySelector('#email_0').value;
      assert.isTrue(valueEmail === params.email);
      assert.isTrue(footer.classList.contains('hide'));

      assertSaveState(null);
    });

    test('Initially the carrier field must be in disabled state', function() {
      subject.render();
      var element = document.body.querySelector('#add-phone-0');
      assertCarrierState(element, 'disabled');
    });

    test('If email is a blank string then done button must be disabled',
      function() {
        var params = {
          email: '    '
        };

        subject.render(params);
        assertSaveState('disabled');
      }
    );

    test('If tel is filled and carrier empty done button must be enabled',
      function() {
        var params = {
          tel: [{
            carrier: '',
            value: '123456'
          }]
        };

        subject.render(params);
        assertSaveState(null);
      }
    );

  });

  suite('Render edit form', function() {
    test('with no name', function() {
      mockContact.givenName.pop();
      subject.render(mockContact);
      var nameField = document.querySelector('#givenName');
      assert.equal(nameField.value, '');
    });

    test('with no last name', function() {
      mockContact.familyName.pop();
      subject.render(mockContact);
      var nameField = document.querySelector('#familyName');
      assert.equal(nameField.value, '');
    });

    test('with all fields', function() {
      // For this test we need a contact with the same number of items
      // on the used fields (phone, address, email, note)
      mockContact.tel.pop();
      mockContact.email.pop();
      subject.render(mockContact);
      var cont = document.body.innerHTML;
      var toCheck = ['phone', 'address', 'email', 'note'];
      for (var i = 0; i < toCheck.length; i++) {
        var element = 'add-' + toCheck[i];
        assert.isTrue(cont.indexOf(element + '-0') > -1);
        assert.isTrue(cont.indexOf(element + '-1') == -1);
      }

      assertPhoneData(0);
      assertEmailData(0);

      assert.isFalse(footer.classList.contains('hide'));

      // Remove Field icon on photo is present
      var thumbnail = document.querySelector('#thumbnail-action');
      assert.isTrue(thumbnail.querySelector('.icon-delete') !== null);
    });

    test('if tel field has a value, carrier input must be in regular state',
      function() {
        subject.render(mockContact);
        var element = document.body.querySelector('#add-phone-0');
        assertCarrierState(element, null);
    });

    test('if tel field has no value, carrier input must be in disabled state',
      function() {
        mockContact.tel = [];
        subject.render(mockContact);
        var element = document.body.querySelector('#add-phone-0');
        assertCarrierState(element, 'disabled');
    });

    test('FB Contact. e-mail, phone and photo from Facebook', function() {
      window.fb.setIsFbContact(true);

      var deviceContact = new MockContactAllFields();
      var fbContact = new Mockfb.Contact(deviceContact);
      fbContact.getDataAndValues().onsuccess = function() {
        deviceContact.photo = null;
        subject.render(deviceContact, null, this.result);

        var cont = document.body.innerHTML;
        var toCheck = ['phone', 'email'];
        for (var i = 0; i < toCheck.length; i++) {
          var element = 'add-' + toCheck[i];
          assert.isTrue(cont.indexOf(element + '-0') > -1);
          assert.isTrue(cont.indexOf(element + '-1') > -1);
          assert.isTrue(cont.indexOf(element + '-2') == -1);

          var domElement0 = document.querySelector('#' + element + '-' + '0');
          assert.isTrue(domElement0.classList.contains('removed') &&
                        domElement0.classList.contains('facebook'));
          assert.isTrue(domElement0.querySelector('.icon-delete') === null);
        }

        assertPhoneData(0);
        assertEmailData(0);

        assert.isFalse(footer.classList.contains('hide'));

        // Remove Field icon photo should not be present
        var thumbnail = document.querySelector('#thumbnail-action');
        assert.isTrue(thumbnail.querySelector('.icon-delete').
                        parentNode.classList.contains('hide'));

        assert.isTrue(thumbnail.classList.contains('facebook'));
        assert.isTrue(thumbnail.classList.contains('removed'));
      };
    });

    test('FB Contact. Address from Facebook', function() {
      window.fb.setIsFbContact(true);

      var fbContact = new Mockfb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        subject.render(mockContact, null, this.result);

        var content = document.body.innerHTML;
        var toCheck = ['address'];
        for (var i = 0; i < toCheck.length; i++) {
          var element = 'add-' + toCheck[i];
          assert.isTrue(content.indexOf(element + '-0') > -1);
          assert.isTrue(content.indexOf(element + '-1') > -1);
          assert.isTrue(content.indexOf(element + '-2') === -1);


          var domElement0 = document.querySelector('#' + element + '-' + '0');
          assert.isTrue(domElement0.classList.contains('removed') &&
                        domElement0.classList.contains('facebook'),
                        'Class Removed and Facebook present');
          assert.isTrue(domElement0.querySelector('.icon-delete') === null,
                        'Icon delete not present');
        }

        assertAddressData(0, this.result[0]);

        assert.isFalse(footer.classList.contains('hide'));
      };
    });


    test('FB Linked. e-mail and phone both from FB and device', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(true);

      var fbContact = new Mockfb.Contact(mockContact);

      fbContact.getDataAndValues().onsuccess = function() {
        this.result[0].tel[1] = {
          'value': '+34616885989',
          'type': ['Mobile'],
          'carrier': 'NTT'
        };

        this.result[0].email[1] = {
          'type': ['work'],
          'value': 'workwithme@tid.es'
        };
        subject.render(mockContact, null, this.result);

        var cont = document.body.innerHTML;
        var toCheck = ['phone', 'email'];

        for (var i = 0; i < toCheck.length; i++) {
          var element = 'add-' + toCheck[i];

          assert.isTrue(cont.indexOf(element + '-0') > -1);
          assert.isTrue(cont.indexOf(element + '-1') > -1);

          var domElement0 = document.querySelector('#' + element + '-' + '0');
          assert.isTrue(domElement0.classList.contains('removed') &&
                        domElement0.classList.contains('facebook'));
          assert.isTrue(domElement0.querySelector('.icon-delete') === null);

          var domElement1 = document.querySelector('#' + element + '-' + '1');
          assert.isFalse(domElement1.classList.contains('removed') ||
                          domElement1.classList.contains('facebook'));
          assert.isTrue(domElement1.querySelector('.icon-delete') !== null);
        }

        for (var c = 0; c < 2; c++) {
          assertPhoneData(c, this.result[0]);
          assertEmailData(c, this.result[0]);
        }
      };
    });

    test('FB Linked. Photo local to the device', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(true);

      var fbContact = new Mockfb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        subject.render(mockContact, null, this.result);

        var thumbnail = document.querySelector('#thumbnail-action');
        assert.isFalse(thumbnail.querySelector('.icon-delete').
                        parentNode.classList.contains('hide'));

        assert.isFalse(thumbnail.classList.contains('facebook'));
        assert.isFalse(thumbnail.classList.contains('removed'));
      };
    });
  });

  suite('Generate full contact name', function() {
    setup(function() {
      // Bypass the contacts matcher when saving contact
      LazyLoader.load(['/shared/js/simple_phone_matcher.js',
                       '/contacts/js/contacts_matcher.js'], function() {
          contacts.Matcher.match = function() {};
      });
    });

    test('given name is empty', function() {
      var deviceContact = new MockContactAllFields();
      deviceContact.givenName = null;
      deviceContact.name = null;

      subject.render(deviceContact);
      subject.saveContact();
      assert.equal(deviceContact.name[0], deviceContact.familyName);
    });

    test('family name is empty', function() {
      var deviceContact = new MockContactAllFields();
      deviceContact.familyName = null;
      deviceContact.name = null;

      subject.render(deviceContact);
      subject.saveContact();
      assert.equal(deviceContact.name[0], deviceContact.givenName);
    });

    test('both name fields are empty', function() {
      var deviceContact = new MockContactAllFields();
      deviceContact.givenName = null;
      deviceContact.familyName = null;
      deviceContact.name = null;

      subject.render(deviceContact);
      subject.saveContact();
      assert.equal(deviceContact.name[0], undefined);
    });

    test('both name fields are present', function() {
      var deviceContact = new MockContactAllFields();
      deviceContact.name = null;

      subject.render(deviceContact);
      subject.saveContact();
      assert.equal(deviceContact.name[0],
        deviceContact.givenName + ' ' + deviceContact.familyName);
    });
  });

  suite('Delete Contact', function() {
    var deleteButton;
    var realSearch;
    var realMozContacts;
    setup(function() {
      subject.render(mockContact);
    });

    suiteSetup(function() {
      deleteButton = document.querySelector('#delete-contact');

      realSearch = contacts.Search;
      contacts.Search = MockContactsSearch;

      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = new MockMozContactsObj([]);
    });

    suiteTeardown(function() {
      contacts.Search = realSearch;
      navigator.mozContacts = realMozContacts;
    });

    test('show confirm', function() {
      deleteButton.click();
      assert.isTrue(ConfirmDialog.showing);
      assert.equal(ConfirmDialog.text, 'deleteConfirmMsg');
      ConfirmDialog.hide();
    });

    test('cancel delete', function() {
      deleteButton.click();
      ConfirmDialog.executeNo();

      assert.isFalse(ConfirmDialog.showing);
    });

    test('delete contact while in search mode', function(done) {
      deleteButton.click();

      var inSearchModeStub = sinon.stub(contacts.Search,
        'isInSearchMode', function() {
        return true;
      });
      var exitSearchModeStub = sinon.stub(contacts.Search,
        'exitSearchMode', function() {
        assert.isTrue(true);
        contactsStub.restore();
        exitSearchModeStub.restore();
        done();
      });
      var contactsStub = sinon.stub(window.navigator.mozContacts,
        'remove', function() {
        return {
          set onsuccess(cb) {
            cb();
          }
        };
      });

      ConfirmDialog.executeYes();
    });
  });

  function assertEmpty(id) {
    var fields = document.querySelectorAll('#' + id + ' input');
    for (var i = 0; i < fields.length; i++) {
      var currField = fields[i];

      if (currField.dataset['field'] && currField.dataset['field'] != 'type') {
        assert.isTrue(fields[i].value == '');
      }
    }
  }

  function assertPhoneData(c, phoneData) {
    var data = phoneData || mockContact;

    var valuePhone = document.querySelector('#number_' + c).value;
    var typePhone = document.querySelector('#tel_type_' + c).textContent;
    var carrierPhone = document.querySelector('#carrier_' + c).value;
    assert.isTrue(valuePhone === data.tel[c].value);
    assert.isTrue(typePhone === data.tel[c].type[0]);
    assert.isTrue(carrierPhone === data.tel[c].carrier);
  }

  function assertEmailData(c, emailData) {
    var data = emailData || mockContact;

    var valueEmail = document.querySelector('#email_' + c).value;
    var typeEmail = document.querySelector('#email_type_' + c).textContent;
    assert.isTrue(valueEmail === data.email[c].value);
    assert.isTrue(typeEmail === data.email[c].type[0]);
  }

  function assertAddressData(c, addrData) {
    var data = addrData || mockContact;

    var valueType = document.querySelector('#address_type_' + c).textContent;
    assert.isTrue(valueType === data.adr[c].type[0],
                  'Type Value as Expected');
    valueType = document.querySelector('#locality_' + c).value;
    assert.isTrue(valueType === data.adr[c].locality,
                  'Type Value as Expected');
    valueType = document.querySelector('#countryName_' + c).value;
    assert.isTrue(valueType === data.adr[c].countryName,
                  'Type Value as Expected');
  }

});
