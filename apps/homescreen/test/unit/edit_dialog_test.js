'use strict';

/* global EditDialog, Icon, MocksHelper */

mocha.globals(['EditDialog']);

window.requireElements('homescreen/elements/edit_dialog.html');

window.require('/shared/js/url_helper.js');
window.requireApp('homescreen/test/unit/mock_icon.js');
window.requireApp('homescreen/js/edit_dialog.js');

var mocksHelperForEditDialog = new MocksHelper([
  'Icon'
]).init();

suite('edit_dialog.js >', function() {

  mocksHelperForEditDialog.attachTestHelpers();

  var dialog = null, nameField = null, urlField = null, doneButton = null,
      cancelButton = null, form = null, name = 'Mozilla', setNameSpy = null,
      setURLSpy = null, url = 'http://www.mozilla.org/', icon = null;

  window.suiteTemplate('edit-dialog', {
    id: 'edit-dialog'
  });

  setup(function() {
    dialog = document.getElementById('edit-dialog');
    form = dialog.querySelector('form');
    nameField = dialog.querySelector('#edit-dialog-name');
    urlField = dialog.querySelector('#edit-dialog-url');
    doneButton = dialog.querySelector('#edit-dialog-done');
    cancelButton = document.getElementById('edit-dialog-cancel');

    icon = new Icon({
      name: name,
      url: url
    });
    setNameSpy = this.sinon.spy(icon, 'setName');
    setURLSpy = this.sinon.spy(icon, 'setURL');

    this.sinon.useFakeTimers();
    EditDialog.show(icon);
    this.sinon.clock.tick();
    dispatchTransitionEndEvent();
  });

  teardown(function() {
    setNameSpy.restore();
    setURLSpy.restore();
  });

  function dispatchInputEvent() {
    form.dispatchEvent(new CustomEvent('input'));
  }

  function dispatchTransitionEndEvent() {
    dialog.dispatchEvent(new CustomEvent('transitionend'));
  }

  function assertDialogIsHidden () {
    assert.isNull(doneButton.onclick);
    assert.isNull(cancelButton.onclick);
    assert.isFalse(dialog.classList.contains('show'));
  }

  test(' Edit dialog initilized correctly ', function() {
    assert.isTrue(dialog.classList.contains('visible'));
    assert.isTrue(dialog.classList.contains('show'));
    assert.ok(doneButton.onclick);
    assert.ok(cancelButton.onclick);
    assert.isTrue(doneButton.disabled);
    assert.equal(nameField.value, name);
    assert.equal(urlField.value, url);
  });

  test(' Check done button typing name ', function() {
    assert.isTrue(doneButton.disabled);

    nameField.value = 'Telefonica';
    dispatchInputEvent();
    assert.isFalse(doneButton.disabled);

    nameField.value = '';
    dispatchInputEvent();
    assert.isTrue(doneButton.disabled);

    nameField.value = name;
    dispatchInputEvent();
    assert.isFalse(doneButton.disabled);
  });

  test(' Check done button typing address ', function() {
    assert.isTrue(doneButton.disabled);

    urlField.value = 'http://www.tid.es';
    dispatchInputEvent();
    assert.isFalse(doneButton.disabled);

    urlField.value = '';
    dispatchInputEvent();
    assert.isTrue(doneButton.disabled);

    urlField.value = url;
    dispatchInputEvent();
    assert.isFalse(doneButton.disabled);
  });

  test(' Check done button with invalid URL address ', function() {
    assert.isTrue(doneButton.disabled);

    urlField.value = 'alert("I am the devil!")';
    dispatchInputEvent();
    assert.isTrue(doneButton.disabled);

    urlField.value = url;
    dispatchInputEvent();
    assert.isFalse(doneButton.disabled);
  });

  test(' Saving bookmark correctly ', function() {
    assert.isTrue(doneButton.disabled);

    nameField.value = 'Telefonica';
    urlField.value = 'http://www.tid.es';
    dispatchInputEvent();

    assert.isFalse(doneButton.disabled);

    doneButton.click();
    this.sinon.clock.tick();
    dispatchTransitionEndEvent();

    assert.isTrue(setNameSpy.withArgs(nameField.value).called);
    assert.isTrue(setURLSpy.withArgs(urlField.value).called);

    assertDialogIsHidden();
  });

  test(' Hide edit dialog clicking on cancel button ', function() {
    cancelButton.click();

    assert.isFalse(setNameSpy.called);
    assert.isFalse(setURLSpy.called);
    assertDialogIsHidden();
  });

  test(' Hide edit dialog programmatically ', function() {
    EditDialog.hide();
    this.sinon.clock.tick();
    dispatchTransitionEndEvent();

    assert.isFalse(setNameSpy.called);
    assert.isFalse(setURLSpy.called);
    assertDialogIsHidden();
  });
});
