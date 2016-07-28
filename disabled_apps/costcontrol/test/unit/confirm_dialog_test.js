'use strict';

require('/test/unit/mock_common.js');
require('/test/unit/mock_moz_l10n.js');
require('/js/views/ConfirmDialog.js');
require('/js/view_manager.js');

/* global ConfirmDialog, ViewManager */

var realCommon, realMozL10n;

if (!window.Common) {
  window.Common = null;
}

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

suite('Confirm Dialog test suite >', function() {

  var screen, vManager;
  var container, buttonContainer, okButton, cancelButton, header, message;

  suiteSetup(function() {
    realCommon = window.Common;
    window.Common = new window.MockCommon();

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;
  });

  suiteTeardown(function() {
    window.Common = realCommon;
    window.navigator.mozL10n = realMozL10n;
  });

  setup(function() {

    buttonContainer = document.createElement('div');
    header = document.createElement('h1');
    message = document.createElement('p');
    okButton = document.createElement('button');
    okButton.classList.add('danger');
    cancelButton = document.createElement('button');
    cancelButton.classList.add('close-reset-dialog');

    buttonContainer.appendChild(okButton);
    buttonContainer.appendChild(cancelButton);

    container = document.createElement('div');
    container.appendChild(header);
    container.appendChild(message);
    container.appendChild(buttonContainer);
    container.id = 'test';

    vManager = new ViewManager();
    screen = new ConfirmDialog(container, vManager);
  });

  test('setMessageMode() shows the message localized', function() {
    var expectedMessage = 'Expected message';
    screen.setMessage(expectedMessage);
    assert.strictEqual(message.textContent, expectedMessage);
  });

  test('updateAcceptAction() changes the accept button behaviour', function() {
    assert.isNull(okButton.onclick);
    var expectedFunction = function() {};
    screen.updateAcceptAction(expectedFunction);
    assert.strictEqual(okButton.onclick, expectedFunction);
  });

  test('closeConfirmDialog() closes view', function() {
    this.sinon.spy(vManager, 'closeCurrentView');
    screen.closeConfirmDialog();
    sinon.assert.calledOnce(vManager.closeCurrentView);
  });

  test('showConfirmDialog() changes the view', function() {
    this.sinon.stub(vManager, 'changeViewTo', function() {});
    screen.showConfirmDialog();
    sinon.assert.calledWith(vManager.changeViewTo, container.id);
  });
});
