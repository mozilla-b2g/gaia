/*jshint maxlen:false, sub:true*/
/*global Spinner*/
'use strict';

requireApp('/gallery/js/spinner.js');

suite('spinner', function() {

  var real$;

  var selectors;

  setup(function() {
    selectors = {};
  });

  suiteSetup(function() {
    real$ = window.$;

    window.$ = function(selector) {
      return (selectors[selector] = selectors[selector] || {
        classList: {
          add: sinon.spy(),
          remove: sinon.spy()
        },
        removeAttribute: sinon.spy()
      });
    };
  });

  suiteTeardown(function() {
    window.$ = real$;
  });

  suite('show', function() {
    test('Should remove "hidden" from #spinner', function() {
      Spinner.show();
      assert.ok(selectors['spinner'].classList.remove.calledWith('hidden'));
    });
  });

  suite('hide', function() {
    test('Should add "hidden" to #spinner', function() {
      Spinner.hide();
      assert.ok(selectors['spinner'].classList.add.calledWith('hidden'));
    });
  });

});
