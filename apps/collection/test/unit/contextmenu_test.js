'use strict';
/* global Contextmenu */

require('/shared/js/l10n.js');
require('/js/contextmenu.js');

suite('contextmenu > ', function() {

  var menuStub = null,
      subject = null;

  suiteSetup(function() {
    loadBodyHTML('/view.html');
    var mockCollection = {
      isPinned: function() {}
    };
    subject = new Contextmenu(mockCollection);
  });

  setup(function() {
    menuStub = this.sinon.stub(subject.menu, 'show');
  });

  teardown(function() {
    menuStub.restore();
  });

  var simulateContextMenu = function(elem) {
    var ev = document.createEvent('MouseEvents');
    ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                      false, false, false, false, 2, null);
    elem.dispatchEvent(ev);
  };

  test('clicking an icon', function() {
    var icon = document.createElement('div');
    icon.dataset.identifier = 'hi';
    subject.grid.appendChild(icon);

    simulateContextMenu(icon);

    assert.ok(menuStub.calledOnce);
  });

  test('clicking an empty space', function() {
    simulateContextMenu(subject.grid);

    assert.isFalse(menuStub.called);
  });

});
