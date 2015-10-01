'use strict';
/* global MockIntlHelper */
suite('FormButton', function() {
  var doc, input, formButton, FormButton, Constants, Utils;

  suiteSetup(function(done) {
    window.IntlHelper = MockIntlHelper;
    require([
        'form_button',
        'constants',
        'utils'
      ], function(formButton, constants, utils) {
        FormButton = formButton;
        Constants = constants;
        Utils = utils;
        done();
      }
    );
  });

  suite('basic functions', function() {

    setup(function() {
      doc = document.createElement('div');
      doc.innerHTML = '<input type="time" id="time-input"/>';
      input = doc.querySelector('#time-input');
      formButton = new FormButton(input);
    });

    test('should insert a button element into the dom', function() {
      var buttons = doc.querySelectorAll('button');
      assert.equal(buttons.length, 1);
    });

    test('should hide the input', function() {

      assert.isTrue(input.classList.contains('form-button-hide'));
    });

    test('clicking the button should focus the input', function(done) {
      this.sinon.stub(input, 'focus', function() {
        assert.ok(input.focus.called);
        done();
      });
      formButton.button.click();
    });

    test('refresh should update the button text', function(done) {
      formButton.input.value = '10:10';
      formButton.refresh().then(() => {
        assert.equal(formButton.button.textContent, '10:10');
      }).then(done, done);
    });

    test('formatLabel should be overrideable', function() {
      var formButton = new FormButton(input, {
        formatLabel: function() {
          return 'formatted label';
        }
      });
      assert.equal(formButton.formatLabel(), 'formatted label');
    });

    test('tagName should set the element type of the button', function() {
      var formButton = new FormButton(input, {
        tagName: 'span'
      });
      assert.equal(formButton.button.nodeName, 'SPAN');
    });

    test('className should set the classes of the button', function() {
      var formButton = new FormButton(input, {
        className: 'foo bar'
      });
      assert.equal(formButton.button.className, 'foo bar');
    });

    test('id should set the id of the button', function() {
      var formButton = new FormButton(input, {
        id: 'my-button'
      });
      assert.equal(formButton.button.id, 'my-button');
    });

  });

  suite('when the input property is an input element', function() {

    setup(function() {
      doc = document.createElement('div');
      doc.innerHTML = '<input type="time" id="time-input"/>';
      input = doc.querySelector('#time-input');
      formButton = new FormButton(input);
    });

    test('the blur event should update the button text', function(done) {
      formButton.input.value = '10:11';
      formButton.input.dispatchEvent(new Event('blur'));
      Promise.resolve().then(() => {
        assert.equal(formButton.button.textContent, '10:11');
      }).then(done, done);
    });

    test('getValue should return the current value', function() {
      formButton.input.value = '10:12';
      assert.equal(formButton.value, '10:12');
    });


    test('setValue should set the current value', function() {
      formButton.value = '10:13';
      assert.equal(formButton.input.value, '10:13');
    });

    test('isSelect should be false', function() {
      assert.equal(formButton.isSelect, false);
    });
  });

  suite('when the input property is a select element', function() {

    setup(function() {
      doc = document.createElement('div');
      doc.innerHTML = ['<select id="vibrate-select"/>',
                       '<option value="1">On</option>',
                       '<option value="0">Off</option>',
                       '<option value="maybe">Maybe</option>',
                       '</select>'].join('');
      input = doc.querySelector('#vibrate-select');
      formButton = new FormButton(input);
    });

    test('the change event should update the button text', function(done) {
      Utils.changeSelectByValue(formButton.input, '0');
      formButton.input.dispatchEvent(new Event('change'));
      Promise.resolve().then(() => {
        assert.equal(formButton.button.textContent, '0');
      }).then(done, done);
    });

    test('getValue should return the current value', function() {
      Utils.changeSelectByValue(formButton.input, '1');
      assert.equal(formButton.value, '1');
    });


    test('setValue should set the current value', function() {
      formButton.value = 'maybe';
      assert.equal(formButton.input.value, 'maybe');
    });

    test('isSelect should be true', function() {
      assert.equal(formButton.isSelect, true);
    });
  });

  suite('when the input property is a select multiple', function() {

    setup(function() {
      doc = document.createElement('div');
      doc.innerHTML = ['<select id="repeat-select" multiple="true">',
                       '<option value="1">Monday</option>',
                       '<option value="2">Tuesday</option>',
                       '<option value="3">Wednesday</option>',
                       '<option value="4">Thursday</option>',
                       '<option value="5">Friday</option>',
                       '<option value="6">Saturday</option>',
                       '<option value="0">Sunday</option>',
                       '</select>'].join('');
      input = doc.querySelector('#repeat-select');
      formButton = new FormButton(input, {
        formatLabel: function (value) {
          return {raw: JSON.stringify(value)};
        }
      });
    });

    test('the change event should update the button text', function(done) {
      Utils.changeSelectByValue(formButton.input, '5');
      formButton.input.dispatchEvent(new Event('change'));
      Promise.resolve().then(() => {
        assert.equal(formButton.button.textContent, '{"5":true}');
      }).then(done, done);
    });

    test('getValue should return the current value', function(done) {
      Utils.changeSelectByValue(formButton.input, '2');
      Promise.resolve().then(() => {
        assert.deepEqual(formButton.value, { '2': true });
      }).then(done, done);
    });


    test('setValue should set the current value', function() {
      formButton.value = {'2': true, '4': true, '6': true};
      var options = formButton.input.options;
      assert.isFalse(options[0].selected); // monday
      assert.isTrue(options[1].selected); // tuesday
      assert.isFalse(options[2].selected); // wednesday
      assert.isTrue(options[3].selected); // tursday
      assert.isFalse(options[4].selected); // friday
      assert.isTrue(options[5].selected); // saturday
      assert.isFalse(options[6].selected); // sunday
    });

    test('isSelect should be true', function() {
      assert.equal(formButton.isSelect, true);
    });
  });
});
