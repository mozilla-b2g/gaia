/*jshint maxlen:false*/
'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_drawer/script.js');

suite('GaiaDrawer', function() {

  setup(function() {
    this.sandbox = sinon.sandbox.create();

    // Sizes are in rems, so we set the base font-size
    document.documentElement.style.fontSize = '10px';

    this.container = document.createElement('div');
    this.container.innerHTML = '<gaia-drawer></gaia-drawer>';
    this.el = this.container.firstElementChild;
    this.el.style.height = '300px';

    sinon.spy(this.el, 'open');
    sinon.spy(this.el, 'close');
    sinon.spy(this.el, 'toggle');

    // Insert into DOM to get styling
    document.body.appendChild(this.el);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  test('Should toggle open when `open` attribute changes', function() {
    this.el.setAttribute('open', '');
    sinon.assert.called(this.el.open);

    this.el.removeAttribute('open');
    sinon.assert.called(this.el.close);
  });

  test('Should close the drawer when the background is clicked', function() {
    this.el.open();
    sinon.assert.notCalled(this.el.close);

    this.el.shadowRoot.getElementById('background').click();
    sinon.assert.called(this.el.close);
  });

  test('Should not close the drawer when the content is clicked', function() {
    this.el.open();
    sinon.assert.notCalled(this.el.close);
    this.el.shadowRoot.getElementById('content').click();
    sinon.assert.notCalled(this.el.close);
  });

  suite('GaiaDrawer#toggle()', function() {
    test('Should toggle the `open` state', function() {
      this.el.toggle();
      sinon.assert.called(this.el.open);
      assert.isTrue(this.el.hasAttribute('open'));

      this.el.toggle();
      sinon.assert.called(this.el.close);
      assert.isFalse(this.el.hasAttribute('open'));
    });

    test('Should derive state from argument if passed', function() {
      this.el.toggle(true);
      sinon.assert.called(this.el.open);
      assert.isTrue(this.el.hasAttribute('open'));

      this.el.toggle(true);
      assert.isTrue(this.el.hasAttribute('open'));
    });
  });
});
