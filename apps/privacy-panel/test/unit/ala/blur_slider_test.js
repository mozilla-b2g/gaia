'use strict';

suite('ALA BlurSlider', function() {

  setup(function(done) {
    require(['ala/blur_slider'], BlurSlider => {
      var slider = document.createElement('input');
      var label = document.createElement('p');
      slider.classList.add('blur-slider');
      label.classList.add('blur-label');
      this.element = document.createElement('div');
      this.element.appendChild(label);
      this.element.appendChild(slider);
      this.subject = new BlurSlider();
      done();
    });
  });

  //initialize with 500m
  test('initializing the element', function() {
    this.subject.init(this.element, '1');
    var label = this.element.querySelector('.blur-label').innerHTML;
    assert.equal(label, '500m');
  });

  test('check changing to 1 km ', function(done) {
    this.subject.init(this.element, '1', function(result) {
      assert.equal(result, 1);
      assert.isNumber(result);
      done();
    });

    this.element.querySelector('.blur-slider').value = 2;

    var event = new Event('change');
    this.subject.input.dispatchEvent(event);
  });

  test('check changing the slider', function() {
    this.subject.init(this.element,'1');
    this.element.querySelector('.blur-slider').value = 2;

    var event = new Event('touchmove');
    this.subject.input.dispatchEvent(event);

    var label = this.element.querySelector('.blur-label').innerHTML;
    assert.equal(label, '1km');
  });
});
