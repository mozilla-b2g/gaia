'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_tabs/script.js');

suite('GaiaTabs', function() {
  setup(function() {
    this.clock = sinon.useFakeTimers();
    this.container = document.createElement('div');

    // Sizes are in rems, so we set the base font-size
    document.documentElement.style.fontSize = '10px';

    this.container.innerHTML = [
      '<gaia-tabs selected="1">',
        '<div class="js-child"><span></span></div>',
        '<button class="js-child"></button>',
        '<a class="js-child"></a>',
      '</gaia-tabs>'
    ].join('');

    this.el = this.container.firstElementChild;
    this.children = this.el.querySelectorAll('.js-child');
    this.span = this.el.querySelector('span');
  });

  teardown(function() {
    this.clock.restore();
  });

  test('Should select the child at the given index on creation', function() {
    assert.isTrue(this.children[1].classList.contains('selected'));
  });

  test('Should update the selected child when the ' +
    '`selected` attribute changes', function() {
    assert.isTrue(this.children[1].classList.contains('selected'));
    this.el.setAttribute('selected', '2');
    assert.isTrue(this.children[2].classList.contains('selected'));
    assert.isFalse(this.children[1].classList.contains('selected'));
  });

  test('Should select a tab when it\'s clicked', function() {
    this.children[0].click();
    assert.isTrue(this.children[0].classList.contains('selected'));
    assert.isFalse(this.children[1].classList.contains('selected'));
  });

  test('Should select a tab when a tab descendant is clicked', function() {
    this.span.click();
    assert.isTrue(this.children[0].classList.contains('selected'));
    assert.isFalse(this.children[1].classList.contains('selected'));
  });

  suite('style', function() {
    setup(function(done) {
      this.container.style.width = '400px';
      document.body.appendChild(this.el);
      this.el.children[3].onload = function() {
        done();
      };
    });

    test('Should position tabs horizontally', function() {
      this.children[0].pos = this.children[0].getBoundingClientRect();
      this.children[1].pos = this.children[1].getBoundingClientRect();
      this.children[2].pos = this.children[2].getBoundingClientRect();

      assert.isTrue(this.children[0].pos.right < this.children[1].pos.right);
      assert.isTrue(this.children[1].pos.right < this.children[2].pos.right);
    });

    test('Should size each tab to fill horizontal space equally', function() {
      this.el.pos = this.el.getBoundingClientRect();
      this.children[0].pos = this.children[0].getBoundingClientRect();
      this.children[1].pos = this.children[1].getBoundingClientRect();
      this.children[2].pos = this.children[2].getBoundingClientRect();

      var expected = Math.round(this.el.pos.width / 3);

      assert.equal(Math.round(this.children[0].pos.width), expected);
      assert.equal(Math.round(this.children[1].pos.width), expected);
      assert.equal(Math.round(this.children[2].pos.width), expected);
    });
  });
});