'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_textinput/script.js');

suite('GaiaTextinput', function() {
  setup(function() {
    this.container = document.createElement('div');
  });

  test('simple input with placeholder', function() {
    this.container.innerHTML = '<gaia-textinput placeholder="my text">' +
      '</gaia-textinput>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.placeholder, 'my text');

    // No reset link
    assert.equal(element.querySelectorAll('button[type="reset"]').length, 0);
  });

  test('reset button is injected', function() {
    this.container.innerHTML = '<gaia-textinput reset>' +
      '</gaia-textinput>';
    var element = this.container.firstElementChild;
    var buttons = element.shadowRoot.querySelectorAll('button[type="reset"]');
    assert.equal(buttons.length, 1);
  });

  test('value attribute', function() {
    this.container.innerHTML = '<gaia-textinput value="foo">' +
      '</gaia-textinput>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.value, 'foo');
  });
});
