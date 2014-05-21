'use strict';

require('/shared/elements/gaia_menu/script.js');

suite('GaiaMenu', function() {
  setup(function() {
    this.container = document.createElement('div');
    this.container.innerHTML =
      '<gaia-menu>' +
        '<header>title</header>' +
        '<button>button1</button>'+
        '<button>button2</button>'+
      '</gaia-menu>';
    this.element = this.container.firstElementChild;
  });

  test('Content is populated', function() {

    // Validate header
    var headers = this.element.querySelectorAll('header');
    assert.equal(headers.length, 1);
    assert.equal(headers[0].textContent, 'title');

    // Validate button
    var buttons = this.element.querySelectorAll('button');
    assert.equal(buttons.length, 2);

    // Validate a 'cancel' button was added
    var cancelButton = this.element.shadowRoot.querySelector('button');
    assert.equal(cancelButton.textContent, 'Cancel');
  });

  test('Cancel event is dispatched', function(done) {
    this.element.addEventListener('gaiamenu-cancel', function(e) {
      done();
    });

    this.element.shadowRoot.querySelector('button').click();
  });
});
