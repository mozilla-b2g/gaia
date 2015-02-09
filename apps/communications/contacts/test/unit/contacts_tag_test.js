'use strict';
/* global MockSelectionDom */
/* global triggerEvent */

require('/shared/js/contacts/utilities/dom.js');

requireApp('communications/contacts/test/unit/helper.js');
requireApp('communications/contacts/test/unit/mock_selection_dom.js.html');
requireApp('communications/contacts/js/contacts_tag.js');

suite('Fill tag options', function() {
  var subject;

  suiteSetup(function() {
    subject = window.ContactsTag;
    document.body.innerHTML = MockSelectionDom;
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  suite('go to selected tag', function() {
    var container,
        customTag,
        originalTag;
    var testTagOptions = {
      'test-type' : [
        {type: 'value1', value: 'value1'},
        {type: 'value2', value: 'value2'}
      ]
    };

    setup(function() {
      container = document.getElementById('tags-list');
      customTag = document.getElementById('custom-tag');
      originalTag = document.createElement('button');
      originalTag.dataset.value = 'value1';
      subject.setCustomTag(customTag);
      customTag.addEventListener('touchend', subject.touchCustomTag);
    });

    test('render tag selection form', function() {
      subject.fillTagOptions(container, originalTag,
                             testTagOptions['test-type']);
      assert.equal(
        container.querySelector('input[type="radio"][data-index="0"]')
        .getAttribute('data-l10n-id'), 'value1');
      assert.equal(
        container.querySelector('input[type="radio"][data-index="1"]')
        .getAttribute('data-l10n-id'), 'value2');
    });

    test('choose a tag', function() {
      var tag = container.querySelector('input[type="radio"][data-index="0"]');
      triggerEvent(tag, 'click');
      assert.isTrue(tag.checked);
    });

    test('choose custom tag', function() {
      var customTagRadio = customTag.querySelector('input[type="radio"]');
      customTagRadio.setAttribute('checked', false);
      triggerEvent(customTagRadio, 'click');
      assert.isTrue(customTagRadio.checked); 
    });

    teardown(function() {
      customTag.removeEventListener('touchend', subject.touchCustomTag);
    });
  });
});
