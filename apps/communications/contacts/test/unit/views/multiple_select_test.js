/* global Contacts, MockContactsList, MockLazyLoader, MockMultipleSelectHTML,
          MockMatcher, MockVCardReader */
'use strict';

requireApp('communications/contacts/test/unit/mock_contacts_list.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_multiple_select_dom.js');
requireApp('communications/contacts/test/unit/mock_contacts_match.js');
requireApp('communications/contacts/test/unit/mock_vcard_reader.js');
requireApp('communications/contacts/js/views/multiple_select.js');

window.contacts = window.contacts || {};

suite('MultipleSelect view', function() {
  var realLazyLoader,
      realMatcher;

  suiteSetup(function() {
    realLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;

    document.body.innerHTML = MockMultipleSelectHTML;
    Contacts.MultipleSelect.init();

    realMatcher = window.contacts.Matcher;
    window.contacts.Matcher = MockMatcher;
  });

  suiteTeardown(function() {
    window.LazyLoader = realLazyLoader;
    window.contacts.Matcher = realMatcher;
  });

  test('Adding contacts to the view', function() {
    const FILENAME = 'FileName.vcf';
    Contacts.MultipleSelect.render(MockContactsList(), {}, FILENAME);

    var title = document.getElementById('multiple-select-view-title');
    assert.equal(title.textContent, FILENAME);
    var contacts = document.querySelectorAll('li');
    assert.equal(contacts.length, 3);

    assert.equal(contacts[0].textContent.trim(), 'Pepito A\n        Test');
    assert.equal(contacts[1].textContent.trim(), 'Pepito BA\n        Test');
    assert.equal(contacts[2].textContent.trim(), 'Antonio CC\n        Test');
  });

  test('Loading contacts from vCard cursor', function(done) {
    var mockReader = new MockVCardReader(MockContactsList());
    Contacts.MultipleSelect.render([], mockReader.getAll());

    done(() => {
      assert.equal(document.querySelectorAll('li').length, 3);
    });

  });
});
