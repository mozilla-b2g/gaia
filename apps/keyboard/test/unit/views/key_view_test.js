'use strict';

/* global KeyView */

require('/js/views/key_view.js');

suite('Views > KeyView', function() {
  var keyView = null;
  var viewManager = {
    registerView: sinon.stub()
  };

  suite('some basic functions',  function() {
    setup(function() {
      var target = {};
      var options = {};
      keyView = new KeyView(target, options, viewManager);
    });

    test(' > render()', function() {
      assert.equal(keyView.element, null);

      keyView.render();
      assert.notEqual(keyView.element, null);
    });

    test(' > highlight() with upper case', function() {
      keyView.render();
      assert.isFalse(keyView.element.classList.contains('highlighted'));

      keyView.highlight({upperCase: true});
      assert.isTrue(keyView.element.classList.contains('highlighted'));
      assert.isTrue(keyView.element.classList.contains('uppercase-popup'));
    });

    test(' > highlight() with lower case', function() {
      keyView.render();
      assert.isFalse(keyView.element.classList.contains('highlighted'));

      keyView.highlight({upperCase: false});
      assert.isTrue(keyView.element.classList.contains('highlighted'));
      assert.isTrue(keyView.element.classList.contains('lowercase-popup'));
    });

    test(' > unHighlight()', function() {
      keyView.render();

      keyView.highlight();
      assert.isTrue(keyView.element.classList.contains('highlighted'));

      keyView.unHighlight();
      assert.isFalse(keyView.element.classList.contains('highlighted'));
      assert.isFalse(keyView.element.classList.contains('uppercase-popup'));
      assert.isFalse(keyView.element.classList.contains('lowercase-popup'));
    });
  });

  suite('DOM structures tests',  function() {
    test('basic key', function() {
      var key = {
        value: 'k',
        lowercaseValue: 'l_k',
        keyCode: 999,
        keyCodeUpper: 9999,
        targetPage: 2
      };

      var options = {
       keyWidth: 99
      };

      var keyView = new KeyView(key, options, viewManager);
      keyView.render();

      assert.isTrue(keyView.element.classList.contains('keyboard-key'));
      assert.isFalse(keyView.element.classList.contains('special-key'));

      assert.equal(keyView.element.getAttribute('role'), 'key');
      assert.equal(keyView.element.style.width, options.keyWidth + 'px');

      // Keycode dataset
      assert.equal(keyView.element.dataset.keycode, key.keyCode);
      assert.equal(keyView.element.dataset.keycodeUpper, key.keyCodeUpper);

      // target page dataset
      assert.equal(keyView.element.dataset.targetPage, key.targetPage);

      //visual wrapper element
      var visualWrapper = keyView.element.firstElementChild;
      assert.equal(visualWrapper.className, 'visual-wrapper');

      // Inner label
      var labelNode = visualWrapper.querySelector('.key-element');
      assert.equal(labelNode.innerHTML, key.value);
      assert.equal(labelNode.dataset.label, key.value);

      // popups
      var uppercasePopup = visualWrapper.querySelector('.uppercase.popup');
      assert.equal(uppercasePopup.innerHTML, key.value);

      var lowercasePopup = visualWrapper.querySelector('.lowercase.popup');
      assert.equal(lowercasePopup.innerHTML, key.lowercaseValue);
    });

    test('special key', function() {
      var key = {
        isSpecialKey: true,
        value: 'k',
        lowercaseValue: 'l_k'
      };

      var options = {
       keyWidth: 99
      };

      var keyView = new KeyView(key, options, viewManager);
      keyView.render();

      assert.isTrue(keyView.element.classList.contains('keyboard-key'));
      assert.isTrue(keyView.element.classList.contains('special-key'));
    });

    test('additional attribute list', function() {
      var key = {
        value: 'k',
        lowercaseValue: 'l_k'
      };

      var options = {
       keyWidth: 99,
       attributeList: [
         {key: 'testKey', value: 'testValue'},
         {key: 'testKey2', value: 'testValue2'}
       ]
      };

      var keyView = new KeyView(key, options, viewManager);
      keyView.render();

      options.attributeList.forEach(function(attribute) {
        assert.equal(keyView.element.getAttribute(attribute.key),
                     attribute.value);
      });
    });

    test('additional class name', function() {
      var key = {
        value: 'k',
        lowercaseValue: 'l_k',
        className: 'test-className'
      };

      var options = {
       keyWidth: 99,
       classNames: ['another-className']
      };

      var keyView = new KeyView(key, options, viewManager);
      keyView.render();

      assert.isTrue(keyView.element.classList.contains('keyboard-key'));
      assert.isTrue(keyView.element.classList.contains(key.className));

      options.classNames.forEach(function(className) {
        assert.isTrue(keyView.element.classList.contains(className));
      });
    });

    test('disabled key', function() {
      var key = {
        value: 'k',
        lowercaseValue: 'l_k',
        disabled: true
      };

      var options = {
       keyWidth: 99,
      };

      var keyView = new KeyView(key, options, viewManager);
      keyView.render();

      assert.equal(keyView.element.getAttribute('disabled'), 'true');
    });

    test('alt label node for option w/ altOutputChar case', function() {
      var key = {
        value: 'k',
        lowercaseValue: 'l_k',
      };

      var options = {
       keyWidth: 99,
       altOutputChar: '*k'
      };

      var keyView = new KeyView(key, options, viewManager);
      keyView.render();

      var visualWrapper = keyView.element.firstElementChild;

      // Inner label
      var labelNode = visualWrapper.querySelector('.key-element.lowercase');
      assert.equal(labelNode.innerHTML, options.altOutputChar);
    });

    test('altNote', function() {
      var key = {
        value: 'k',
        lowercaseValue: 'l_k',
        longPressValue: '#k'
      };

      var options = {
       keyWidth: 99,
       altOutputChar: '*k'
      };

      var keyView = new KeyView(key, options, viewManager);
      keyView.render();

      var visualWrapper = keyView.element.firstElementChild;

      var altNote = visualWrapper.querySelector('.alt-note');
      assert.equal(altNote.innerHTML, key.longPressValue);
    });
  });

  suite('Register View to viewManager',  function() {
    test('invoke viewManager.registerView', function() {
      var mockViewManager = {
        registerView: this.sinon.stub()
      };

      var target = {};
      var keyView = new KeyView(target, {}, mockViewManager);
      keyView.render();

      assert.isTrue(mockViewManager.registerView.calledOnce);
      assert.isTrue(mockViewManager.registerView.calledWith(target,
                                                            keyView));
    });
  });
});
