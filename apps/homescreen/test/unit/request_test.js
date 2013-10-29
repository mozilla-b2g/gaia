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

  test(' Request dialog displayed ', function() {
    ConfirmDialog.show('Game', 'Delete?', {title: 'Cancel'}, {title: 'OK'});
    assert.isTrue(dialog.classList.contains('visible'));
  });

  test(' Request dialog hidden ', function() {
    ConfirmDialog.hide();
    assert.isFalse(dialog.classList.contains('visible'));
  });

  test(' Request dialog displayed > UI elements ', function() {
    ConfirmDialog.show('Game', 'Delete?', {title: 'Cancel'}, {title: 'OK'});

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
