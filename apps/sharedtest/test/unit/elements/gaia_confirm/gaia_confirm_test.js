'use strict';

require('/shared/elements/gaia_confirm/script.js');

suite('GaiaSwitch', function() {
  setup(function() {
    this.container = document.createElement('div');
  });

  test('Content is populated', function() {
    this.container.innerHTML = '<gaia-confirm>' +
      '<h1>title</h1>' +
      '<p>description</p>' +
      '<gaia-buttons skin="dark">' +
        '<button>Cancel</button>' +
        '<button class="recommend">Submit</button>' +
      '</gaia-buttons>' +
    '</gaia-confirm>';

    var element = this.container.firstElementChild;

    // Validate title
    var titles = element.querySelectorAll('h1');
    assert.equal(titles.length, 1);
    assert.equal(titles[0].textContent, 'title');

    // Validate description
    var descs = element.querySelectorAll('p');
    assert.equal(descs.length, 1);
    assert.equal(descs[0].textContent, 'description');

    // Validate buttons
    var buttons = element.querySelectorAll('button');
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].textContent, 'Cancel');
    assert.equal(buttons[1].textContent, 'Submit');
  });

});
