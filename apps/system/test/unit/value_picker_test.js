'use strict';

requireApp('system/js/value_selector/value_picker.js');

suite('value selector/value picker', function() {

  suite('Month value picker', function() {
    var subject, dom, unitStyle;

    setup(function() {
      this.sinon.stub(document, 'querySelector')
        .returns(document.createElement('div')
        .appendChild(document.createElement('div')));

      // month value picker
      unitStyle = {
        valueDisplayedText: ['January', 'February', 'March', 'April', 'May',
                             'June', 'July', 'August', 'September', 'October',
                             'November', 'December'],
        className: 'value-picker-month'
      };
      dom = document.querySelector('.value-picker-month');
      subject = new ValuePicker(dom, unitStyle);
    });

    test('basis contructor value check', function() {
      assert.equal(subject.element, dom);
      assert.equal(subject._unitClassName, unitStyle.className);
      assert.equal(subject._upper, 11);
      assert.equal(subject._range, 12);
    });

    test('initUI value check', function() {
      assert.equal(subject.container.getAttribute('role'), 'spinbutton');
      assert.equal(subject.container.getAttribute('aria-valuemin'), 0);
      assert.equal(subject.container.getAttribute('aria-valuemax'), 11);
    });

    test('called querySelector', function() {
      assert.isTrue(document.querySelector.withArgs('.value-picker-month')
        .calledOnce);
      assert.isFalse(document.querySelector.withArgs('.value-picker-year')
        .calledOnce);
    });

    test('getSelectedIndex', function() {
      subject._currentIndex = 2;
      assert.equal(subject.getSelectedIndex(), 2);
    });

    test('setSelectedIndex', function() {
      var currentlySelected =
        subject.element.querySelector('.selected');
      subject.setSelectedIndex(3);
      assert.isFalse(currentlySelected.classList.contains('selected'));
      assert.equal(subject.element.querySelector('.selected').textContent,
        unitStyle.valueDisplayedText[3]);
    });

    test('getSelectedDisplayedText', function() {
      assert.equal(subject.getSelectedDisplayedText(),
        unitStyle.valueDisplayedText[0]);
    });

    test('setSelectedDisplayedText', function() {
      subject._currentIndex = 3;
      assert.equal(subject.getSelectedDisplayedText(),
      unitStyle.valueDisplayedText[3]);
    });

    test('setRange', function() {
      subject.setRange(0, 11);
      assert.equal(subject._lower, 0);
      assert.equal(subject._upper, 11);
    });

    test('animation-on removed when touching', function() {
      var fakeEvent = { stopPropagation: function() {},
                        touches: [{ pageX: 0, pageY: 0 }],
                        timeStamp: 0 };

      subject.element.classList.add('animation-on');
      subject.touchstartHandler(fakeEvent);
      assert.isFalse(subject.element.classList.contains('animation-on'));
      subject.touchendHandler(fakeEvent);
      assert.isTrue(subject.element.classList.contains('animation-on'));
    });
  });

  suite('Time hour24-state picker', function() {
    var subject, dom, parent, unitStyle;

    setup(function() {
      document.body.innerHTML =
        '<div class="value-picker-hour24-wrapper">' +
        '<div class="value-picker-hour24-state animation-on"></div>' +
        '</div>';
      dom = document.querySelector('.value-picker-hour24-state');
      parent = document.querySelector('.value-picker-hour24-wrapper');
      unitStyle = {
        valueDisplayedText: ['AM', 'PM'],
        className: 'picker-unit'
      };
      subject = new ValuePicker(dom, unitStyle);
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('basis contructor value check', function() {
      assert.equal(subject.element, dom);
      assert.equal(subject.container, parent);
      assert.equal(subject._unitClassName, unitStyle.className);
      assert.equal(subject._upper, 1);
      assert.equal(subject._range, 2);
    });

    test('initUI value check', function() {
      assert.equal(subject.container.getAttribute('role'), 'spinbutton');
      assert.equal(subject.container.getAttribute('aria-valuemin'), 0);
      assert.equal(subject.container.getAttribute('aria-valuemax'), 1);
    });
  });
});
