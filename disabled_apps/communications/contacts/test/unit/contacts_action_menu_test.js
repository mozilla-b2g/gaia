/* globals ActionMenu */

'use strict';

requireApp('communications/contacts/test/unit/mock_l10n.js');

suite('Test ActionMenu', function() {
  var fakeDOM;
  var fakeform;
  var fakeCallback;
  var real_;

  suiteSetup(function(done) {
    real_ = window._;
    window._ = navigator.mozL10n.get;

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
    window._ = real_;
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
