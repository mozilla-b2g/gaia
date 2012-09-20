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
    deleteButton;

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
    deleteButton = document.getElementById('delete-contact');
    subject = contacts.Form;
    subject.init(Contacts.getTags());
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    window.fb = realFb;
    window.mozL10n = realL10n;
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
        assert.isTrue(deleteButton.classList.contains('hide'));
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
      assert.isTrue(deleteButton.classList.contains('hide'));
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
      assert.isTrue(deleteButton.classList.contains('hide'));
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
      assert.isTrue(deleteButton.classList.contains('hide'));
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
      var valuePhone = document.querySelector('#number_0').value;
      var typePhone = document.querySelector('#tel_type_0').textContent;
      var carrierPhone = document.querySelector('#carrier_0').value;
      assert.isTrue(valuePhone === mockContact.tel[0].value);
      assert.isTrue(typePhone === mockContact.tel[0].type);
      assert.isTrue(carrierPhone === mockContact.tel[0].carrier);
      var valueEmail = document.querySelector('#email_0').value;
      var typeEmail = document.querySelector('#email_type_0').textContent;
      assert.isTrue(valueEmail === mockContact.email[0].value);
      assert.isTrue(typeEmail === mockContact.email[0].type);
      assert.isFalse(deleteButton.classList.contains('hide'));
    });
  });

  function assertEmpty(id) {
    var fields = document.querySelectorAll('#' + id + ' input');
    for (var i = 0; i < fields.length; i++) {
      var currField = fields[i];
      if (currField.dataset['field'] != 'type') {
        assert.isTrue(fields[i].value == '');
      }
    }
  }

});
