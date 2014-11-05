'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_switch/script.js');

suite('GaiaSwitch', function() {
  setup(function() {
    this.container = document.createElement('div');
  });

  test('Label is populated', function() {
    this.container.innerHTML = '<gaia-switch><label>my label</label>' +
      '</gaia-switch>';
    assert.equal(this.container.querySelector('label').textContent,
      'my label');
  });

  test('Input is not checked by default', function() {
    this.container.innerHTML = '<gaia-switch></gaia-switch>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.checked, false);
  });

  test('Checks the input based on checked attr', function() {
    this.container.innerHTML =
      '<gaia-switch checked></gaia-switch>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.checked, true);
  });

  test('Attribute change toggles checked state', function() {
    this.container.innerHTML = '<gaia-switch></gaia-switch>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.checked, false);

    element.checked = 'true';
    assert.equal(input.checked, true);
  });

  test('Gets right value after click', function(done) {
    this.container.innerHTML = '<gaia-switch></gaia-switch>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.checked, false);

    element.addEventListener('click', function(e) {
      assert.equal(e.target.checked, true);
      done();
    });

    element.handleClick({
      preventDefault: function() {},
      stopImmediatePropagation: function() {}
    });
  });
});
