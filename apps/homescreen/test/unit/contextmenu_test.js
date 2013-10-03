'use strict';

requireApp('homescreen/js/contextmenu.js');
requireElements('homescreen/elements/contextmenu.html');

suite('contextmenu.js >', function() {

  suiteTemplate('contextmenu-dialog', {
    id: 'contextmenu-dialog'
  });

  test(' Context Menu dialog displayed ', function(done) {
    window.addEventListener('contextmenushowed', function showed() {
      window.removeEventListener('contextmenushowed', showed);

      var dialog = document.getElementById('contextmenu-dialog');
      assert.isTrue(dialog.classList.contains('visible'));
      done();
    });

    ContextMenuDialog.show();
  });

  test(' Context Menu dialog hidden ', function(done) {
    window.addEventListener('contextmenuhidden', function hidden() {
      window.removeEventListener('contextmenuhidden', hidden);

      var dialog = document.getElementById('contextmenu-dialog');
      assert.isFalse(dialog.classList.contains('visible'));
      done();
    });

    ContextMenuDialog.hide();
  });
});
