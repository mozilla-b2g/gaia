/* globals ActionMenu, MockL10n */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

suite('Test ActionMenu', function() {
  var fakeDOM;
  var fakeform;
  var fakeCallback;
  var realMozL10n;

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    fakeDOM = document.createElement('div');
    fakeDOM.innerHTML =
      '<form id="action-menu" role="dialog" data-type="action" class="hide">' +
        '<header id="org-title" data-l10n-id="select_recipient">' +
          'Select recipient' +
        '</header>' +
        '<menu id="value-menu" type="toolbar">' +
        '</menu>' +
      '</form>';

    document.body.appendChild(fakeDOM);
    fakeform = document.getElementById('action-menu');
    fakeCallback = function() {};
    requireApp('communications/contacts/js/action_menu.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    fakeDOM.parentNode.removeChild(fakeDOM);
  });

  suite('Invoke function', function() {
    var actionmenu;
    setup(function() {
      actionmenu = new ActionMenu();
    });

    test('invoke show()', function() {
      actionmenu.addToList('123456789', fakeCallback);
      actionmenu.addToList('111111111', fakeCallback);
      actionmenu.addToList('222222222', fakeCallback);
      actionmenu.show();
      var buttons = fakeDOM.querySelectorAll('button');
      assert.isFalse(fakeform.classList.contains('hide'));
      assert.equal(buttons.length, 4); // addToList + canncel
    });

    test('invoke hide()', function() {
      actionmenu.hide();
      assert.isTrue(fakeform.classList.contains('hide'));
      assert.equal(fakeDOM.querySelectorAll('button').length, 0);
    });
  });
});
