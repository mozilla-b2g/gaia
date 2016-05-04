'use strict';
/* global contacts */
/* global ConfirmDialog */
/* global LazyLoader */
/* global MockContactAllFields */
/* global MockContactsSearch */
/* global MockExtServices */
/* global Mockfb */
/* global MockFormDom */
/* global MocksHelper */
/* global MockMozContactsObj */
/* global MockThumbnailImage */
/* global Matcher */
/* global Search */
/* global utils */
/* exported _ */

require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/lazy_loader.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');
require('/shared/js/contacts/utilities/event_listeners.js');
//Avoiding lint checking the DOM file renaming it to .html
requireApp('communications/contacts/test/unit/mock_form_dom.js.html');
requireApp('communications/contacts/js/contacts_tag.js');
requireApp('communications/contacts/js/views/form.js');
requireApp('communications/contacts/js/utilities/mozContact.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_main_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_external_services.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_contacts_search.js');
requireApp('communications/contacts/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_image_thumbnail.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');

var subject,
    _,
    realL10n,
    realFb,
    realThumbnailImage,
    mockContact,
    footer,
    ActivityHandler;

var MOCK_NUMERIC_DATE_STRING =
  new Date(Date.UTC(1970, 0, 1)).toLocaleString(navigator.languages, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }
);

realL10n = navigator.mozL10n;
navigator.mozL10n = {
  get: function get(key) {
    return key;
  },
};
window._ = navigator.mozL10n.get;

requireApp('communications/contacts/js/tag_options.js');

var mocksForm = new MocksHelper([
  'MainNavigation',
  'Contacts',
  'ConfirmDialog',
  'ContactPhotoHelper'
]).init();

suite('Render contact form', function() {

  suiteSetup(function() {

    mocksForm.suiteSetup();

    window.ExtServices = MockExtServices;

    realFb = window.fb;
    window.fb = Mockfb;
    realThumbnailImage = utils.thumbnailImage;
    utils.thumbnailImage = MockThumbnailImage;
    document.body.innerHTML = MockFormDom;
    footer = document.querySelector('footer');
    subject = contacts.Form;

    ActivityHandler = {
      currentlyHandling: false
    };

    subject.init();
  });

  suiteTeardown(function() {
    window.fb = realFb;
    utils.thumbnailImage = realThumbnailImage;
    navigator.mozL10n = realL10n;

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

  function assertAddDateState(value) {
     assert.equal(document.getElementById('add-new-date').disabled, value);
  }

  suite('Render add form', function() {
    test('without params', function() {
      subject.render();
      var toCheck = ['phone', 'address', 'email', 'note', 'date'];
      for (var i = 0; i < toCheck.length; i++) {
        var element = 'add-' + toCheck[i];
        var cont = document.body.innerHTML;
        assert.isTrue(cont.indexOf(element + '-0') > -1);
        assertEmpty(element + '-0');
        assert.isTrue(cont.indexOf(element + '-1') == -1);
        assert.isTrue(footer.classList.contains('hide'));
        if (toCheck[i] === 'date') {
          // Check that the place holder 'date' appears
          var spanEle = document.getElementById('date-text_0');
          assert.equal(spanEle.getAttribute('data-l10n-id'),
                       'date-span-placeholder');
        }
      }
      assertSaveState('disabled');

      // The add date button shouldn't be disabled
      assertAddDateState(false);
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

    test('with date params', function() {
      var params = {
        date: new Date(0)
      };
      subject.render(params);

      var valueDate = document.querySelector('#date_0').valueAsDate;

      assert.equal(valueDate.toDateString(), params.date.toDateString());

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

    test('Empty form and label changes keeps the done button disabled',
      function() {
        subject.render();

        var formView = document.getElementById('view-contact-form');
        // Sending this custom event is equivalent to changing the select value
        // at UI level (see contacts.js#handleSelectTagDone)
        var valueModifiedEvent = new CustomEvent('ValueModified', {
          bubbles: true,
          detail: {
            prevValue: 'work',
            newValue: 'home'
          }
        });
        formView.dispatchEvent(valueModifiedEvent);

        assertSaveState('disabled');
    });

    test('Date tags are filtered properly', function() {
      subject.render();

      document.getElementById('add-new-date').click();

      var date1 = document.getElementById('date_type_0');
      assert.equal(date1.dataset.value, 'birthday');

      var date2 = document.getElementById('date_type_1');
      assert.equal(date2.dataset.value, 'anniversary');
    });

    test('Reset button phone field', function() {
      var phoneNumberField = document.getElementById('number_0');
      phoneNumberField.value = '123456';
      phoneNumberField.nextElementSibling.click();

      assert.isTrue(phoneNumberField.value === '');
    });
  });

  requireApp('communications/contacts/services/contacts.js');
  suite('Render edit form', function() {

    function assertDateContent(selector, date) {
      var inputDate = document.body.querySelector(selector).
                    querySelector('input[type="date"]');
      var contentDate = inputDate.valueAsDate;

      assert.equal(contentDate.toUTCString(), date.toUTCString());

      assert.equal(inputDate.previousElementSibling.
                    textContent.trim(), MOCK_NUMERIC_DATE_STRING);
      assert.isFalse(inputDate.previousElementSibling.
                     classList.contains('placeholder'));
    }

    var NO_OP = function() {};
    var noteSelector = '[data-field="note"]';

    test('no scroll on first load', function() {
      subject.render(mockContact);
      var container = document.getElementById('contact-form').parentNode;
      assert.equal(container.scrollTop, 0);
    });

    test('no scroll memorised from previous renders', function() {
      subject.render(mockContact);
      var container = document.getElementById('contact-form').parentNode;
      // scroll container
      container.scrollTop = 100;
      subject.render(mockContact);
      assert.equal(container.scrollTop, 0);
    });

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
      var toCheck = ['phone', 'address', 'email', 'note', 'date'];
      for (var i = 0; i < toCheck.length; i++) {
        var element = 'add-' + toCheck[i];
        assert.isTrue(cont.indexOf(element + '-0') > -1);
        assert.isTrue(cont.indexOf(element + '-1') == -1);
      }

      assertPhoneData(0);
      assertEmailData(0);

      assert.isFalse(footer.classList.contains('hide'));
    });

    test('with only birthday', function() {
      subject.render(mockContact);

      var cont = document.body.innerHTML;
      var element = 'add-date';
      assert.isTrue(cont.indexOf(element + '-0') > -1);
      assert.isTrue(cont.indexOf(element + '-1') === -1);

      assertDateContent('#' + element + '-0', mockContact.bday);

      // The add date button shouldn't be disabled
     assertAddDateState(false);
    });

    test('with birthday and anniversary', function() {
      mockContact.anniversary = new Date(Date.UTC(1970,0,1));
      subject.render(mockContact);

      var cont = document.body.innerHTML;
      var element = 'add-date';
      assert.isTrue(cont.indexOf(element + '-0') > -1);
      assert.isTrue(cont.indexOf(element + '-1') > -1);
      assert.isTrue(cont.indexOf(element + '-2') === -1);

      assertDateContent('#' + element + '-0', mockContact.bday);
      assertDateContent('#' + element + '-1', mockContact.anniversary);

      // The add date button should be disabled
      assertAddDateState(true);
    });

    test('Birthday first day of the year is rendered properly', function() {
      teardown(() => {
        MOCK_NUMERIC_DATE_STRING = REAL_MOCK_NUMERIC_DATE_STRING;
      });

      mockContact.bday = new Date(2014, 0, 1);
      subject.render(mockContact);

      var element = 'add-date';
      var REAL_MOCK_NUMERIC_DATE_STRING = MOCK_NUMERIC_DATE_STRING;
      MOCK_NUMERIC_DATE_STRING =
        new Date(Date.UTC(2014, 0, 1)).toLocaleString(navigator.languages, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        }
      );
      assertDateContent('#' + element + '-0', mockContact.bday);
    });

    test('Dates are saved preserving their timestasmp referred to UTC',
      function() {
        var deviceContact = new MockContactAllFields();

        subject.render(deviceContact);
        subject.saveContact();
        assert.equal(deviceContact.bday.getTime(), 0);
    });

    test('if the tel field is null, is ignored',
      function(done) {
        var calls = 0;
        var target = document.getElementById('throbber');
        var config = { attributes: true };
        // we need to check for the change after the contact is saved,
        // so we wait for the second time the throbber is modified
        // (first shown, then hidden)
        var observer = new MutationObserver(function(mutations) {
          if (++calls === 2) {
            observer.disconnect();
            assert.equal(deviceContact.tel.length, 1);
            done();
          }
        });
        observer.observe(target, config);

        var deviceContact = new MockContactAllFields();
        deviceContact.tel[0].value = null;
        subject.render(deviceContact);
        assert.equal(deviceContact.tel.length, 2);

        subject.saveContact();
    });

    test('if the email field is null, is ignored',
      function(done) {
        var calls = 0;
        var target = document.getElementById('throbber');
        var config = { attributes: true };
        // same as before, we check for the change after the contact is saved,
        // so we wait for the second time the throbber is modified
        // (first shown, then hidden)
        var observer = new MutationObserver(function(mutations) {
          if (++calls === 2) {
            observer.disconnect();
            assert.equal(deviceContact.email.length, 1);
            done();
          }
        });
        observer.observe(target, config);

        var deviceContact = new MockContactAllFields();
        deviceContact.email[0].value = null;

        subject.render(deviceContact);
        assert.equal(deviceContact.email.length, 2);

        subject.saveContact();
    });

    test('if the address field is null, is ignored',
      function() {
        var deviceContact = new MockContactAllFields();
        deviceContact.adr.unshift({'type': ['personal']});
        subject.render(deviceContact);
        assert.equal(deviceContact.adr.length, 2);

        subject.saveContact();
        assert.equal(deviceContact.adr.length, 1);
    });


    test('if tel field has a value, carrier input must be in regular state',
      function() {
        subject.render(mockContact);
        var element = document.body.querySelector('#add-phone-0');
        assertCarrierState(element, null);
    });

    test('if tel field has no value, there is no visible telephone field',
      function() {
        mockContact.tel = [];
        subject.render(mockContact);
        var element = document.body.querySelector('#add-phone-0');
        assert.isTrue(element === null);
    });

    test('Removing a note preserves the others', function() {
      mockContact.note.push('other note');
      subject.render(mockContact);

      // Three as we need to count the template one
      assert.equal(document.querySelectorAll(noteSelector).length, 3);

      var firstNoteContainer = document.getElementById('add-note-0');
      var delButton = firstNoteContainer.querySelector(
                                                    'button.img-delete-button');

     delButton.onclick({
        eventX: 100,
        eventY: 100,
        target: delButton,
        preventDefault: NO_OP
      });

      // Two as we need to count the template one
      assert.equal(document.querySelectorAll(noteSelector).length, 2);
    });

    test('Removing all notes collapses the notes section', function() {
      mockContact.note.push('other note');
      subject.render(mockContact);

      // Three as we need to count the template one
      assert.equal(document.querySelectorAll(noteSelector).length, 3);

      for(var j = 0; j < 2; j++) {
        var noteContainer = document.getElementById('add-note-' + j);
        var delButton = noteContainer.querySelector(
                                                    'button.img-delete-button');
        var synthEvent = {
          eventX: 100,
          eventY: 100,
          target: delButton,
          preventDefault: NO_OP
        };

        delButton.onclick(synthEvent);
      }

      // Only the template remains
      var presentNotes = document.querySelectorAll(
                                              '.note-template[data-template]');
      assert.equal(presentNotes.length, 1);
      assert.isTrue(presentNotes.item(0).id.indexOf('#') !== -1);
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
          assert.isTrue(domElement0.classList.contains('facebook'));
          assert.isTrue(domElement0.querySelector('.icon-delete') === null);
        }

        assertPhoneData(0);
        assertEmailData(0);

        assert.isFalse(footer.classList.contains('hide'));

        // Remove Field icon photo should not be present
        var thumbnail = document.querySelector('#thumbnail-action');
        assert.isTrue(thumbnail.classList.contains('facebook'));
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
          assert.isTrue(domElement0.classList.contains('facebook'),
                        'Class Removed and Facebook present');
          assert.isTrue(domElement0.querySelector('.icon-delete') === null,
                        'Icon delete not present');
        }

        assertAddressData(0, this.result[0]);

        assert.isFalse(footer.classList.contains('hide'));
      };
    });

    test('FB Contact. organization from Facebook', function() {
      window.fb.setIsFbContact(true);

      var deviceContact = new MockContactAllFields();
      var fbContact = new Mockfb.Contact(deviceContact);
      fbContact.getDataAndValues().onsuccess = function() {
        subject.render(deviceContact, null, this.result);

        var org = document.querySelector('input[name="org"]');

        assert.isTrue(org.parentNode.classList.contains('facebook'));
      };
    });

    test('FB Contact. Birthday from Facebook', function() {
      window.fb.setIsFbContact(true);

      var fbContact = new Mockfb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        subject.render(mockContact, null, this.result);

        var content = document.body.innerHTML;
        var element = 'add-date';
        assert.isTrue(content.indexOf(element + '-0') > -1);
        assert.isTrue(content.indexOf(element + '-1') === -1);

        assertDateContent('#' + element + '-0', mockContact.bday);

        var domElement0 = document.querySelector('#' + element + '-' + '0');
        assert.isTrue(domElement0.classList.contains('facebook'),
                      'Class Removed and Facebook present');
        assert.isTrue(domElement0.querySelector('.icon-delete') === null,
                      'Icon delete not present');

        // The add date button shouldn't be disabled
        assertAddDateState(false);

        assert.isFalse(footer.classList.contains('hide'));
      };
    });

    test('FB Contact. Linking and promoting given name', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(false);

      var promoteToLinkedSpy = sinon.spy(Mockfb, 'promoteToLinked');
      var setPropagatedFlagSpy = sinon.spy(window.fb, 'setPropagatedFlag');

      mockContact.givenName.pop();

      var fbContact = new Mockfb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        subject.render(mockContact, null, this.result);
        document.querySelector('#givenName').value = '';

        subject.saveContact();
        assert.isTrue(promoteToLinkedSpy.called);
        assert.isTrue(setPropagatedFlagSpy.calledWithMatch('givenName'));

        promoteToLinkedSpy.restore();
        setPropagatedFlagSpy.restore();
      };
    });

    test('FB Contact. Linking and promoting family name', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(false);

      var promoteToLinkedSpy = sinon.spy(Mockfb, 'promoteToLinked');
      var setPropagatedFlagSpy = sinon.spy(window.fb, 'setPropagatedFlag');

      mockContact.familyName.pop();

      var fbContact = new Mockfb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        subject.render(mockContact, null, this.result);
        document.querySelector('#familyName').value = '';

        subject.saveContact();
        assert.isTrue(promoteToLinkedSpy.called);
        assert.isTrue(setPropagatedFlagSpy.calledWithMatch('familyName'));

        promoteToLinkedSpy.restore();
        setPropagatedFlagSpy.restore();
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
          assert.isTrue(domElement0.classList.contains('facebook'));
          assert.isTrue(domElement0.querySelector('.icon-delete') === null);

          var domElement1 = document.querySelector('#' + element + '-' + '1');
          assert.isFalse(domElement1.classList.contains('facebook'));
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
        assert.isFalse(thumbnail.classList.contains('facebook'));
      };
    });

    test('FB Linked. Birthday local to the device', function() {
      window.fb.setIsFbContact(true);
      window.fb.setIsFbLinked(true);

      var fbContact = new Mockfb.Contact(mockContact);
      fbContact.getDataAndValues().onsuccess = function() {
        delete this.result[1][new Date(0).toString()];
        subject.render(mockContact, null, this.result);

        assertDateContent('#add-date-0', mockContact.bday);

        var domElement0 = document.querySelector('#add-date-0');
        assert.isFalse(domElement0.classList.contains('facebook'),
                      'Class Removed or Facebook present');

        // The add date button shouldn't be disabled
        assertAddDateState(false);
      };
    });
  });

  suite('Generate full contact name', function() {
    setup(function() {
      // Bypass the contacts matcher when saving contact
      LazyLoader.load(['/shared/js/simple_phone_matcher.js',
                       '/shared/js/contacts/contacts_matcher.js'], function() {
          Matcher.match = function() {};
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

      realSearch = window.Search;
      window.Search = MockContactsSearch;

      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = new MockMozContactsObj([]);
    });

    suiteTeardown(function() {
      window.Search = realSearch;
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

      sinon.stub(Search,
        'isInSearchMode', function() {
        return true;
      });

      var exitSearchModeStub = sinon.stub(Search,
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

  suite('utils.mis.formatDate', () => {
    test('defaultFormat', () => {
      const MOCK_DATE_STRING =
        new Date(Date.UTC(1970, 0, 1)).toLocaleString(navigator.languages, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }
      );
      assert.equal(utils.misc.formatDate(mockContact.bday), MOCK_DATE_STRING);
    });

    test('customFormat', () => {
      assert.equal(utils.misc.formatDate(mockContact.bday, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }), MOCK_NUMERIC_DATE_STRING);
    });
  });

  function assertEmpty(id) {
    var fields = document.querySelectorAll('#' + id + ' input');
    for (var i = 0; i < fields.length; i++) {
      var currField = fields[i];

      if (currField.dataset.field && currField.dataset.field != 'type') {
        assert.isTrue(fields[i].value === '');
      }
    }
  }

  function assertPhoneData(c, phoneData) {
    var data = phoneData || mockContact;

    var valuePhone = document.querySelector('#number_' + c).value;
    var typePhone = document.querySelector('#tel_type_' + c).textContent.trim();
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
