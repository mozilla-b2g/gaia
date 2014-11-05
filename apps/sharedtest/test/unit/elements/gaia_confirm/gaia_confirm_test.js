'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_confirm/script.js');

suite('GaiaSwitch', function() {
  setup(function() {
    this.container = document.createElement('div');
  });

  teardown(function() {
    this.container.parentNode.removeChild(this.container);
  });

  var subject;
  setup(function() {
    this.container.innerHTML = '<gaia-confirm>' +
      '<h1>title</h1>' +
      '<p>description</p>' +
      '<gaia-buttons skin="dark">' +
        '<button class="cancel">Cancel</button>' +
        '<button class="confirm recommend">Submit</button>' +
      '</gaia-buttons>' +
    '</gaia-confirm>';

    subject = this.container.firstElementChild;
    // XXX: Currently we must build the entire dom in one go then insert it.
    document.body.appendChild(this.container);
  });

  test('Event : confirm', function(done) {
    this.timeout(100);
    subject.addEventListener('confirm', function confirm() {
      subject.removeEventListener('confirm', confirm);
      done();
    });

    var confirm = this.container.querySelector('.confirm');
    confirm.dispatchEvent(new CustomEvent('click'));
  });


  test('Event : cancel', function(done) {
    this.timeout(100);
    subject.addEventListener('confirm', function confirm() {
      subject.removeEventListener('confirm', confirm);
      done();
    });

    var confirm = this.container.querySelector('.confirm');
    confirm.dispatchEvent(new CustomEvent('click'));
  });

  test('Content is populated', function() {
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
