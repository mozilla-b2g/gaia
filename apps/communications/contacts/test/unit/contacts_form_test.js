//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/test/unit/mock_form_dom.js.html');

requireApp('communications/contacts/js/contacts_form.js');
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
        }
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

      var fbContact = new MockFb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        // Forcing photo comes from FB
        this.result[1].hasPhoto = true;

        subject.render(mockContact, null, this.result);

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
      }
    });

    test('FB Linked. e-mail and phone both from FB and device', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(true);

      mockContact.tel[1] = {
        'value': '+34616885989',
        'type': 'Mobile',
        'carrier': 'NTT'
      };

      mockContact.email[1] = {
        'type': 'work',
        'value': 'workwithme@tid.es'
      };

      var fbContact = new MockFb.Contact(mockContact);

      fbContact.getDataAndValues().onsuccess = function() {
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
          assertPhoneData(c);
          assertEmailData(c);
        }
      }
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

  function assertPhoneData(c) {
    var valuePhone = document.querySelector('#number_' + c).value;
    var typePhone = document.querySelector('#tel_type_' + c).textContent;
    var carrierPhone = document.querySelector('#carrier_' + c).value;
    assert.isTrue(valuePhone === mockContact.tel[c].value);
    assert.isTrue(typePhone === mockContact.tel[c].type);
    assert.isTrue(carrierPhone === mockContact.tel[c].carrier);
  }

  function assertEmailData(c) {
    var valueEmail = document.querySelector('#email_' + c).value;
    var typeEmail = document.querySelector('#email_type_' + c).textContent;
    assert.isTrue(valueEmail === mockContact.email[c].value);
    assert.isTrue(typeEmail === mockContact.email[c].type);
  }

});
