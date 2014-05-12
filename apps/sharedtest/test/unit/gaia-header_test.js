/*jshint maxlen:false*/
'use strict';

require('/shared/elements/gaia-header/script.js');

suite('GaiaHeader', function() {
  setup(function() {
    this.clock = sinon.useFakeTimers();
    this.sandbox = sinon.sandbox.create();
    this.container = document.createElement('div');
    this.sandbox.spy(HTMLElement.prototype, 'addEventListener');
  });

  teardown(function() {
    this.sandbox.restore();
    this.clock.restore();
  });

  test('Should hide action button if no action type defined', function() {
    this.container.innerHTML = '<gaia-header></gaia-header>';
    var element = this.container.firstElementChild;
    var button = element.shadowRoot.getElementById('action-button');
    assert.equal(button.style.display, 'none');
  });

  test('Should add the correct icon class for the action type', function() {
    ['menu', 'close', 'back'].forEach(function(type) {
      this.container.innerHTML = '<gaia-header data-action="' + type + '"></gaia-header>';
      var element = this.container.firstElementChild;
      var buttonInner = element.shadowRoot.getElementById('action-button-inner');
      assert.isTrue(buttonInner.classList.contains('icon-' + type));
    }, this);
  });

  test('Should not show an action button for unsupported action types', function() {
    this.container.innerHTML = '<gaia-header data-action="unsupported"></gaia-header>';
    var element = this.container.firstElementChild;
    var button = element.shadowRoot.getElementById('action-button');
    assert.equal(button.style.display, 'none');
  });

  test('Should add the defined `data-skin` as a class', function() {
    this.container.innerHTML = '<gaia-header data-skin="foo"></gaia-header>';
    var element = this.container.firstElementChild;
    var header = element.shadowRoot.querySelector('section');
    assert.isTrue(header.classList.contains('skin-foo'));
  });

  test('Should add a click event listener to the action button if an action defined', function() {
    this.container.innerHTML = '<gaia-header data-action="menu"></gaia-header>';
    var element = this.container.firstElementChild;
    var actionButton = element.shadowRoot.getElementById('action-button');
    assert.isTrue(HTMLElement.prototype.addEventListener.withArgs('click').calledOn(actionButton));
  });

  test('Should add the shadow-dom stylesheet to the root of the element', function() {
    var element = new window.GaiaHeader();
    assert.ok(element.querySelector('style'));
  });

  suite('style', function() {
    setup(function() {

      // Sizes are in rems, so we set the base font-size
      document.documentElement.style.fontSize = '10px';

      // Create and inject element
      this.container.innerHTML = [
        '<gaia-header data-action="menu">',
          '<h1>my title</h1>',
          '<button id="my-button">my button</button>',
        '</gaia-header>'
      ].join('');

      this.element = this.container.firstElementChild;

      // Insert into DOM to get styling
      document.body.appendChild(this.element);
    });

    teardown(function() {
      document.body.removeChild(this.element);
    });

    test('Should be of expected height', function() {
      assert.equal(this.element.offsetHeight, 50);
    });

    test('Should be orange by default', function() {
      var header = this.element.shadowRoot.getElementById('header');
      var styles = getComputedStyle(header);
      var orange = 'rgb(249, 124, 23)';

      assert.equal(styles.backgroundColor, orange);
    });

    test('Should place title after action button', function() {
      var button = this.element.shadowRoot.getElementById('action-button');
      var title = this.element.querySelector('h1');
      var span = document.createElement('span');

      // Wrap text in span so we can
      // measure postition of text node
      span.appendChild(title.firstChild);
      title.appendChild(span);

      var buttonX = button.getBoundingClientRect().left;
      var titleX = span.getBoundingClientRect().left;

      assert.isTrue(titleX > buttonX);
    });

    test('Should hang other buttons to the right', function() {
      var button = this.element.querySelector('#my-button');

      // Get positions
      var elementRight = this.element.getBoundingClientRect().right;
      var buttonRight = button.getBoundingClientRect().right;

      assert.equal(buttonRight, elementRight);
    });

    test('Should never overlap buttons with title', function() {
      var button = this.element.querySelector('#my-button');
      var otherButton = document.createElement('button');
      var title = this.element.querySelector('h1');

      title.textContent = 'really long title really long title really long title';
      otherButton.textContent = 'another button';
      this.element.appendChild(otherButton);

      // Get positions
      var buttonLeft = button.getBoundingClientRect().left;
      var otherButtonleft = otherButton.getBoundingClientRect().left;
      var titleRight = title.getBoundingClientRect().right;

      assert.isTrue(titleRight <= buttonLeft);
      assert.isTrue(titleRight <= otherButtonleft);
    });
  });

  suite('GaiaHeader#_onActionButtonClick()', function(done) {
    test('Should emit an \'action\' event', function() {
      var element = new window.GaiaHeader();
      var callback = sinon.spy();

      element.addEventListener('action', callback);
      element._onActionButtonClick();
      this.clock.tick(1);

      sinon.assert.called(callback);
    });

    test('Should pass the action type as `event.detail.type`', function() {
      this.container.innerHTML = '<gaia-header data-action="menu"></gaia-header>';
      var element = this.container.firstElementChild;
      var callback = sinon.spy();

      element.addEventListener('action', callback);
      element._onActionButtonClick();
      this.clock.tick(1);

      assert.equal(callback.args[0][0].detail.type, 'menu');
    });
  });
});