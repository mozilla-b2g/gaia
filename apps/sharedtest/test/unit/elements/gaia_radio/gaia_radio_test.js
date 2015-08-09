'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_radio/script.js');

suite('GaiaRadio', function() {
  var inputs;

  setup(function() {
    this.container = document.createElement('div');
    this.container.innerHTML = '<gaia-radio  name="group"></gaia-radio>' +
      '<gaia-radio role="dialog" name="group" checked></gaia-radio>' +
      '<gaia-radio name="menu" data-role="menuitemradio" checked></gaia-radio>';
    document.body.appendChild(this.container);
    inputs = this.container.querySelectorAll('gaia-radio');
  });

  function simulateClick(element) {
    element.handleClick({
      preventDefault: function() {},
      stopImmediatePropagation: function() {}
    });
  }

  function getRadio(element) {
    return element.shadowRoot.querySelector('#radio');
  }

  test('Checked state', function() {
    assert.equal(inputs[0].checked, false);
    assert.equal(inputs[1].checked, true);

    assert.equal(getRadio(inputs[0]).getAttribute('aria-checked'), 'false');
    assert.equal(getRadio(inputs[1]).getAttribute('aria-checked'), 'true');

    simulateClick(inputs[0]);
    assert.equal(inputs[0].checked, true);
    assert.equal(inputs[1].checked, false);
  });

  test('ClassName is proxied to shadow dom', function() {
    this.container.innerHTML = '';

    var element = document.createElement('gaia-radio');
    element.className = 'inline';
    this.container.appendChild(element);
    var wrapper = element.shadowRoot.querySelector('#radio');
    assert.equal(wrapper.classList.contains('inline'),  true);

    element.className = '';
    assert.equal(wrapper.classList.contains('inline'), false);
  });

  test('Check accessibility roles', function() {
    assert.equal(inputs[0].getAttribute('role'), 'presentation');
    assert.equal(inputs[1].getAttribute('role'), 'dialog');
    assert.equal(getRadio(inputs[2]).getAttribute('role'), 'menuitemradio');
  });

  test('Gets right value after click', function(done) {
    inputs[0].addEventListener('change', function(e) {
      assert.equal(e.target.checked, true);
      assert.equal(inputs[0].checked, true);
      assert.equal(inputs[1].checked, false);
      assert.equal(getRadio(inputs[0]).getAttribute('aria-checked'), 'true');
      assert.equal(getRadio(inputs[1]).getAttribute('aria-checked'), 'false');

      done();
    });

    simulateClick(inputs[0]);
  });

});
