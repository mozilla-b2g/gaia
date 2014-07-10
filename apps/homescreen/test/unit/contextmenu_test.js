'use strict';

requireApp('homescreen/js/contextmenu.js');
requireElements('homescreen/elements/contextmenu.html');

suite('contextmenu.js >', function() {

  suiteTemplate('contextmenu-dialog', {
    id: 'contextmenu-dialog'
  });

  test(' Context Menu dialog displayed ', function() {
    this.sinon.useFakeTimers();
    ContextMenuDialog.show();
    this.sinon.clock.tick(50);
    assert.isTrue(document.getElementById('contextmenu-dialog').classList.
                  contains('show'));
  });

  test(' Context Menu dialog hidden ', function() {
    ContextMenuDialog.hide();
    assert.isFalse(document.getElementById('contextmenu-dialog').classList.
                   contains('show'));
  });
});
