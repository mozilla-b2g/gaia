'use strict';

requireApp('communications/contacts/test/unit/helper.js');
requireApp('communications/contacts/test/unit/mock_selection_dom.js.html');
requireApp('communications/contacts/js/utilities/dom.js');
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
      customTag.removeEventListener('touchend', subject.touchCustomTag);
    });
  });
});
