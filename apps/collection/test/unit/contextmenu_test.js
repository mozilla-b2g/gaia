'use strict';
/* global Contextmenu */

require('/shared/js/l10n.js');
require('/js/contextmenu.js');

suite('contextmenu > ', function() {

  setup(function() {
    loadBodyHTML('/view.html');
  });

  test('calls show on the element', function() {
    var subject = new Contextmenu();

    var menuStub = this.sinon.stub(subject.menu, 'show');
    subject.grid.dispatchEvent(new CustomEvent('contextmenu'));

    assert.ok(menuStub.calledOnce);
  });

});
