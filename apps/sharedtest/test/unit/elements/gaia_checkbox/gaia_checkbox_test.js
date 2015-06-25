'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_checkbox/script.js');

suite('GaiaCheckbox', function() {
  setup(function() {
    this.container = document.createElement('div');
  });

  test('Label is populated', function() {
    this.container.innerHTML = '<gaia-checkbox><label>my label</label>' +
      '</gaia-checkbox>';
    assert.equal(this.container.querySelector('label').textContent,
      'my label');
  });

  test('Not checked by default', function() {
    this.container.innerHTML = '<gaia-checkbox></gaia-checkbox>';
    var element = this.container.firstElementChild;
    assert.equal(element.checked, false);
  });

  test('Checks the element based on checked attr', function() {
    this.container.innerHTML =
      '<gaia-checkbox checked></gaia-checkbox>';
    var element = this.container.firstElementChild;
    var span = element.shadowRoot.querySelector('span');
    assert.equal(element.checked, true);
    assert.ok(span.classList.contains('checked'));
  });

  test('Attribute change toggles checked state', function() {
    this.container.innerHTML = '<gaia-checkbox></gaia-checkbox>';
    var element = this.container.firstElementChild;
    var checkbox = element.shadowRoot.querySelector('span');
    assert.equal(element.checked, false);
    assert.ok(!checkbox.classList.contains('checked'));

    element.checked = 'checked';
    assert.ok(element.checked);
    assert.ok(checkbox.classList.contains('checked'));
  });

  test('Gets right value after click', function(done) {
    this.container.innerHTML = '<gaia-checkbox></gaia-checkbox>';
    var element = this.container.firstElementChild;
    assert.ok(!element.checked);

    element.addEventListener('change', function(e) {
      assert.equal(e.target.checked, true);
      done();
    });

    element.handleClick({
      preventDefault: function() {},
      stopImmediatePropagation: function() {}
    });
  });
});
