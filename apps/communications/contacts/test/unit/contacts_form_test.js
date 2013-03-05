//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/test/unit/mock_form_dom.js.html');

requireApp('communications/contacts/js/contacts_form.js');
requireApp('communications/contacts/js/utilities/normalizer.js');
requireApp('communications/contacts/js/utilities/templates.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contact_all_fields.js');
requireApp('communications/contacts/test/unit/mock_fb.js');

var subject,
    realL10n,
    dom,
    fb,
    Contacts,
    realContacts,
    realFb,
    mozL10n,
    mockContact,
    footer;

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
    realContacts = window.Contacts;
    window.Contacts = MockContactsApp;
    realFb = window.fb;
    window.fb = MockFb;
    document.body.innerHTML = MockFormDom;
    footer = document.querySelector('footer');
    subject = contacts.Form;
    subject.init(Contacts.getTags());
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    window.fb = realFb;
    window.mozL10n = realL10n;

    document.body.innerHTML = '';
  });

  setup(function() {
    mockContact = new MockContactAllFields();
  });

  teardown(function() {
    window.fb.setIsFbContact(false);
    window.fb.setIsFbLinked(false);
  });

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
    });
  });

  suite('Render edit form', function() {
    test('with all fields', function() {
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

    test('FB Contact. e-mail, phone and photo from Facebook', function() {
      window.fb.setIsFbContact(true);

      var deviceContact = new MockContactAllFields();
      var fbContact = new MockFb.Contact(deviceContact);
      fbContact.getDataAndValues().onsuccess = function() {
        deviceContact.photo = null;
        subject.render(deviceContact, null, this.result);

        var cont = document.body.innerHTML;
        var toCheck = ['phone', 'email'];
        for (var i = 0; i < toCheck.length; i++) {
          var element = 'add-' + toCheck[i];
          assert.isTrue(cont.indexOf(element + '-0') > -1);
          assert.isTrue(cont.indexOf(element + '-1') == -1);

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

      var fbContact = new MockFb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        subject.render(mockContact, null, this.result);

        var content = document.body.innerHTML;
        var toCheck = ['address'];
        for (var i = 0; i < toCheck.length; i++) {
          var element = 'add-' + toCheck[i];
          assert.isTrue(content.indexOf(element + '-0') > -1);
          assert.isTrue(content.indexOf(element + '-1') === -1);

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

      var fbContact = new MockFb.Contact(mockContact);

      fbContact.getDataAndValues().onsuccess = function() {
        this.result[0].tel[1] = {
          'value': '+34616885989',
          'type': 'Mobile',
          'carrier': 'NTT'
        };

        this.result[0].email[1] = {
          'type': 'work',
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

      var fbContact = new MockFb.Contact(mockContact);
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
    assert.isTrue(typePhone === data.tel[c].type);
    assert.isTrue(carrierPhone === data.tel[c].carrier);
  }

  function assertEmailData(c, emailData) {
    var data = emailData || mockContact;

    var valueEmail = document.querySelector('#email_' + c).value;
    var typeEmail = document.querySelector('#email_type_' + c).textContent;
    assert.isTrue(valueEmail === data.email[c].value);
    assert.isTrue(typeEmail === data.email[c].type);
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
