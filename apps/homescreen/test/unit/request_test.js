'use strict';

requireApp('homescreen/test/unit/mock_l10n.js');
requireApp('homescreen/test/unit/mock_request.html.js');
requireApp('homescreen/js/request.js');

suite('request.js >', function() {

  var dialog;

  suiteSetup(function() {
    dialog = document.createElement('section');
    dialog.id = 'confirm-dialog';
    dialog.innerHTML = MockRequestHtml;
    document.body.appendChild(dialog);
    ConfirmDialog.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(dialog);
  });

  function showDialog() {
    ConfirmDialog.show('Game', 'Delete?', {title: 'Cancel'}, {title: 'OK'});
  }

  test(' Request dialog displayed ', function() {
    this.sinon.useFakeTimers();
    showDialog();
    assert.isTrue(dialog.classList.contains('visible'));
    this.sinon.clock.tick(50);
    assert.isTrue(dialog.classList.contains('show'));
  });

  test(' Request dialog hidden ', function() {
    ConfirmDialog.hide();
    assert.isFalse(dialog.classList.contains('show'));
    dialog.dispatchEvent(new CustomEvent('transitionend'));
    assert.isFalse(dialog.classList.contains('visible'));
  });

  test(' Hide dialog twice - no transitionend listeners lost', function() {
    this.sinon.useFakeTimers();
    showDialog();
    this.sinon.clock.tick(50);
    var dialogSpy = this.sinon.spy(dialog, 'addEventListener');
    ConfirmDialog.hide();
    ConfirmDialog.hide();
    sinon.assert.callCount(dialogSpy, 1);
    dialogSpy.restore();
  });

  test(' Request dialog displayed > UI elements ', function() {
    showDialog();

    assert.equal(document.querySelector('#confirm-dialog-title').textContent,
                 'Game');

    assert.equal(document.querySelector('#confirm-dialog-message').textContent,
                 'Delete?');

    assert.equal(document.querySelector('#confirm-dialog-cancel-button').
                 textContent, 'Cancel');

    assert.equal(document.querySelector('#confirm-dialog-confirm-button').
                 textContent, 'OK');
  });

});
