'use strict';

require('/shared/elements/gaia-switch/script.js');

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

  test('Checks the input based on data-checked', function() {
    this.container.innerHTML =
      '<gaia-switch data-checked="true"></gaia-switch>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.checked, true);
  });

  test('Attribute change toggles checked state', function() {
    this.container.innerHTML = '<gaia-switch></gaia-switch>';
    var element = this.container.firstElementChild;
    var input = element.shadowRoot.querySelector('input');
    assert.equal(input.checked, false);

    element.setAttribute('data-checked', 'true');
    assert.equal(input.checked, true);
    assert.equal(element.dataset.checked, 'true');
  });
});
