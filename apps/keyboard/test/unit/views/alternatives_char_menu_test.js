'use strict';

/* global AlternativesCharMenuView */

require('/js/views/alternatives_char_menu.js');

suite('Views > AlternativesCharMenuView', function() {
  var menu = null;
  var renderer = {
    buildKey: function() {
      return document.createElement('button');
    }
  };

  var altChars = ['a', 'b', 'c'];

  var rootElement = document.createElement('div');

  setup(function() {
    menu = new AlternativesCharMenuView(rootElement, altChars, renderer);
  });

  test(' > show()', function() {
    var key = document.createElement('button');
    menu.show(key);

    assert.equal(rootElement.firstElementChild,
                 menu.getMenuContainer(),
                 'Menu was not inserted into root Element');
    menu.hide();
  });

  test(' > hide()', function() {
    var key = document.createElement('button');
    menu.show(key);
    menu.hide();

    assert.equal(rootElement.childElementCount, 0,
                 'Menu was not removed from root Element!');
  });
});
