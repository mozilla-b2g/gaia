'use strict';

requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/js/utilities/status.js');
requireApp('communications/contacts/js/utilities/event_listeners.js');
requireApp('communications/contacts/js/contacts.js');

requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_contacts_details.js');
requireApp('communications/contacts/test/unit/mock_contacts_form.js');
requireApp('communications/contacts/test/unit/mock_contacts_settings.js');
requireApp('communications/contacts/test/unit/mock_search.js');
requireApp('communications/contacts/test/unit/mock_contact_list_dom.js.html');
requireApp('communications/contacts/test/unit/mock_selection_dom.js.html');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_mozkeyboard.js');

requireApp('communications/contacts/test/unit/helper.js');

var contacts,
    ActivityHandler;

suite('Fill tag options', function() {
  var contacts,
      realContacts,
      realActivityHandler,
      subject,
      realL10n,
      realMozKeyboard;

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
      },
      language: {
        code: 'en',
        dir: 'ltr'
      }
    };
    realContacts = window.contacts;
    contacts = {};
    contacts.List = MockContactsListObj;
    contacts.Details = MockContactDetails;
    contacts.Form = MockContactsForm;
    contacts.Settings = MockContactsSettings;
    contacts.Search = MockSearch;
    window.contacts = contacts;
    realActivityHandler = window.ActivityHandler;
    window.ActivityHandler = MockActivities;
    realMozKeyboard = window.navigator.mozKeyboard;
    window.navigator.mozKeyboard = MockMozKeyboard;
    document.body.innerHTML = ContactListDom + MockSelectionDom;
    subject = window.Contacts;
    subject.init();

  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    window.contacts = realContacts;
    window.ActivityHandler = realActivityHandler;
    window.navigator.mozKeyboard = realMozKeyboard;
    document.body.innerHTML = '';
  });

  suite('go to selected tag', function() {
    var originTagOptions,
        container,
        mockLegend,
        customTag;
    var testTagOptions = {
      'test-type' : [
        {value: 'value1'},
        {value: 'value2'}
      ]
    };

    setup(function() {
      originTagOptions = TAG_OPTIONS;
      TAG_OPTIONS = testTagOptions;
      container = document.getElementById('tags-list');
      customTag = document.getElementById('custom-tag');

      mockLegend = document.createElement('legend');
      mockLegend.class = 'action';

      var mockLegendSpan = document.createElement('span');
      mockLegendSpan.textContent = 'value2';
      mockLegendSpan.dataset.taglist = 'test-type';
      mockLegend.appendChild(mockLegendSpan);
    });

    test('render tag selection form', function() {
      subject.goToSelectTag({currentTarget: mockLegend});
      assert.equal(container.querySelector('button[data-index="0"]')
        .textContent, 'value1');
      assert.equal(container.querySelector('button[data-index="1"]')
        .textContent, 'value2');
    });

    test('choose a tag', function() {
      var tag = container.querySelector('button[data-index="0"]');
      triggerEvent(tag, 'click');
      assert.isTrue(tag.className.contains('icon-selected'));
    });

    test('choose custom tag', function() {
      var tags = container.querySelectorAll('button');
      triggerEvent(customTag, 'touchend');
      for (var i = 0; i < tags.length; i++) {
        assert.lengthOf(tags[i].classList, 0);
      }
    });

    teardown(function() {
      TAG_OPTIONS = originTagOptions;
    });
  });
});
