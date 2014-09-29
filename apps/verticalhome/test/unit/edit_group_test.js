'use strict';

/* global loadBodyHTML, MocksHelper, groupEditor */
/* global require, suite, suiteTeardown, suiteSetup, test, assert */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelperForEditGroup = new MocksHelper([
  'LazyLoader'
]).init();

suite('edit_group.js >', function() {

  mocksHelperForEditGroup.attachTestHelpers();

  var expectedName = 'My group';

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    require('/js/edit_group.js', done);
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  function dispatchInputEvent() {
    groupEditor.form.dispatchEvent(new CustomEvent('input'));
  }

  suite('UI initialized correctly >', function() {
    suiteSetup(function() {
      groupEditor.edit({
        name: expectedName
      });
    });

    suiteTeardown(function() {
      groupEditor.close();
    });

    test('The form is visible', function() {
      assert.isFalse(groupEditor.container.hidden);
    });

    test('The group name has to be defined from group.name >', function() {
      assert.equal(groupEditor.nameField.value, expectedName);
    });

    test('Done button disabled', function() {
      assert.isTrue(groupEditor.save.disabled);
    });
  });

  suite('Typing group name >', function() {
    setup(function() {
      groupEditor.edit({
        name: expectedName
      });
    });

    teardown(function() {
      groupEditor.close();
    });

    test('Empty group name -> Enable button >', function() {
      assert.isTrue(groupEditor.save.disabled);
      groupEditor.nameField.value = '';
      dispatchInputEvent();
      assert.isFalse(groupEditor.save.disabled);
    });

    test('Different group name -> Enable button >', function() {
      assert.isTrue(groupEditor.save.disabled);
      groupEditor.nameField.value = 'Other group';
      dispatchInputEvent();
      assert.isFalse(groupEditor.save.disabled);
    });

    test('The same group name -> Disable button >', function() {
      assert.isTrue(groupEditor.save.disabled);
      groupEditor.nameField.value = 'Other group';
      dispatchInputEvent();
      groupEditor.nameField.value = expectedName;
      dispatchInputEvent();
      assert.isTrue(groupEditor.save.disabled);
    });

    test('Reset group name -> Enable button >', function() {
      assert.isTrue(groupEditor.save.disabled);
      groupEditor.clear.dispatchEvent(new CustomEvent('touchstart'));
      assert.equal(groupEditor.nameField.value, '');
      assert.isFalse(groupEditor.save.disabled);
    });
  });

  suite('Saving group name >', function() {
    var group = {
      name: expectedName
    };

    setup(function() {
      groupEditor.edit(group);
    });

    test('Click on save button and group.name changes >', function() {
      var newName = 'Other group';
      groupEditor.nameField.value = newName;
      dispatchInputEvent();
      assert.equal(group.name, expectedName);
      groupEditor.save.dispatchEvent(new CustomEvent('click'));
      assert.equal(group.name, newName);
      assert.isTrue(groupEditor.container.hidden);
      assert.isTrue(groupEditor.hidden);
    });
  });

  suite('Closing UI >', function() {
    setup(function() {
      groupEditor.edit({
        name: expectedName
      });
    });

    test('Click on close button >', function() {
      assert.isFalse(groupEditor.container.hidden);
      assert.isFalse(groupEditor.hidden);
      groupEditor.header.dispatchEvent(new CustomEvent('action'));
      assert.isTrue(groupEditor.container.hidden);
      assert.isTrue(groupEditor.hidden);
    });

    test('Click on home button >', function() {
      assert.isFalse(groupEditor.container.hidden);
      assert.isFalse(groupEditor.hidden);
      window.dispatchEvent(new CustomEvent('hashchange'));
      assert.isTrue(groupEditor.container.hidden);
      assert.isTrue(groupEditor.hidden);
    });
  });

});
