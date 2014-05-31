'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_radio/script.js');

suite('GaiaRadio', function() {
  var inputs;

  setup(function() {
    this.container = document.createElement('div');
    this.container.innerHTML = '<gaia-radio  name="group"></gaia-radio>' +
      '<gaia-radio name="group" checked></gaia-radio>';
    document.body.appendChild(this.container);
    inputs = this.container.querySelectorAll('gaia-radio');
  });

  function simulateClick(element) {
    element.handleClick({
      preventDefault: function() {},
      stopImmediatePropagation: function() {}
    });
  }

  test('Checked state', function() {
    assert.equal(inputs[0].checked, false);
    assert.equal(inputs[1].checked, true);

    simulateClick(inputs[0]);
    assert.equal(inputs[0].checked, true);
    assert.equal(inputs[1].checked, false);
  });

  test('Gets right value after click', function(done) {
    inputs[1].addEventListener('click', function(e) {
      assert.equal(e.target.checked, true);
      assert.equal(inputs[1].checked, true);
      assert.equal(inputs[0].checked, false);
      done();
    });

    simulateClick(inputs[1]);
  });

});
