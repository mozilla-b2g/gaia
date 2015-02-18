'use strict';

/* global BrowserKeyEventManager */

requireApp('system/js/browser_key_event_manager.js');

suite('system/BrowserKeyEventManager', function() {
  var browserKeyEventManager;

  var createHardwareKeyEvent = function (type, key, embeddedCancelled) {
    return {
      type: type,
      key: key,
      location: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      embeddedCancelled: embeddedCancelled,
      preventDefault: function() {},
      getModifierState: function() {}
    };
  };

  suiteSetup(function() {
    browserKeyEventManager = new BrowserKeyEventManager();
  });
  suiteTeardown(function() {
    browserKeyEventManager = undefined;
  });

  test('tranlate (mozbrowserbeforekeydown, Power) into sleep-button-press',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'sleep-button-press');
      assert.isTrue(evt.preventDefault.calledOnce);
    });

  test('translate (keydown, Power) into sleep-button-press', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('keydown', 'Power', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.equal(actualTranslatedType, 'sleep-button-press');
    assert.isTrue(evt.preventDefault.calledOnce);
  });

  test('no translation for (mozbrowserafterkeydown, Power)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeydown', 'Power', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (mozbrowserbeforekeyup, Power) into sleep-button-release',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'sleep-button-release');
      assert.isTrue(evt.preventDefault.calledOnce);
    });

  test('translate (keyup, Power) into sleep-button-release',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('keyup', 'Power', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'sleep-button-release');
      assert.isTrue(evt.preventDefault.calledOnce);
    });

  test('no translation for (mozbrowserafterkeyup, Power)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeyup', 'Power', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('tranlate (mozbrowserbeforekeydown, Home) into home-button-press',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeydown', 'Home', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'home-button-press');
      assert.isTrue(evt.preventDefault.calledOnce);
    });

  test('translate (keydown, Home) into home-button-press', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('keydown', 'Home', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.equal(actualTranslatedType, 'home-button-press');
    assert.isTrue(evt.preventDefault.calledOnce);
  });

  test('no translation for (mozbrowserafterkeydown, Home)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeydown', 'Home', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (mozbrowserbeforekeyup, Home) into home-button-release',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeyup', 'Home', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'home-button-release');
      assert.isTrue(evt.preventDefault.calledOnce);
    });

  test('translate (keyup, Home) into home-button-release',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('keyup', 'Home', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'home-button-release');
      assert.isTrue(evt.preventDefault.calledOnce);
    });

  test('no translation for (mozbrowserafterkeyup, Home)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeyup', 'Home', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('no translation for (mozbrowserbeforekeydown, VolumeUp)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeydown', 'VolumeUp', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (keydown, VolumeUp) into volume-up-button-press', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('keydown', 'VolumeUp', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.equal(actualTranslatedType, 'volume-up-button-press');
    assert.isFalse(evt.preventDefault.called);
  });

  test('translate (mozbrowserafterkeydown, VolumeUp) into ' +
    'volume-up-button-press',
      function() {
        var evt = this.sinon.stub(
          createHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', false));
        assert.isFalse(evt.preventDefault.called);
        var actualTranslatedType =
          browserKeyEventManager.getButtonEventType(evt);
        assert.equal(actualTranslatedType, 'volume-up-button-press');
        assert.isFalse(evt.preventDefault.called);
      });

  test('no translation for embeddedCancelled ' +
    '(mozbrowserafterkeydown, VolumeUp)', function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', true));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('no translation for (mozbrowserbeforekeyup, VolumeUp)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeyup', 'VolumeUp', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (keyup, VolumeUp) into volume-up-button-release', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('keyup', 'VolumeUp', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.equal(actualTranslatedType, 'volume-up-button-release');
    assert.isFalse(evt.preventDefault.called);
  });

  test('translate (mozbrowserafterkeyup, VolumeUp) into ' +
    'volume-up-button-release',
      function() {
        var evt = this.sinon.stub(
          createHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeUp', false));
        assert.isFalse(evt.preventDefault.called);
        var actualTranslatedType =
          browserKeyEventManager.getButtonEventType(evt);
        assert.equal(actualTranslatedType, 'volume-up-button-release');
        assert.isFalse(evt.preventDefault.called);
      });

  test('no translation for embeddedCancelled ' +
    '(mozbrowserafterkeyup, VolumeUp)', function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeUp', true));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('no translation for (mozbrowserbeforekeydown, VolumeDown)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeydown', 'VolumeDown', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (keydown, VolumeDown) into volume-down-button-press',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('keydown', 'VolumeDown', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'volume-down-button-press');
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (mozbrowserafterkeydown, VolumeDown) into ' +
    'volume-down-button-press',
      function() {
        var evt = this.sinon.stub(createHardwareKeyEvent(
          'mozbrowserafterkeydown', 'VolumeDown', false));
        assert.isFalse(evt.preventDefault.called);
        var actualTranslatedType =
          browserKeyEventManager.getButtonEventType(evt);
        assert.equal(actualTranslatedType, 'volume-down-button-press');
        assert.isFalse(evt.preventDefault.called);
      });

  test('no translation for embeddedCancelled ' +
    '(mozbrowserafterkeydown, VolumeDown)', function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', true));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('no translation for (mozbrowserbeforekeyup, VolumeDown)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserbeforekeyup', 'VolumeDown', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (keyup, VolumeDown) into volume-down-button-release',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('keyup', 'VolumeDown', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'volume-down-button-release');
      assert.isFalse(evt.preventDefault.called);
    });

  test('translate (mozbrowserafterkeyup, VolumeDown) into ' +
    'volume-down-button-release',
      function() {
        var evt = this.sinon.stub(
          createHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false));
        assert.isFalse(evt.preventDefault.called);
        var actualTranslatedType =
          browserKeyEventManager.getButtonEventType(evt);
        assert.equal(actualTranslatedType, 'volume-down-button-release');
        assert.isFalse(evt.preventDefault.called);
      });

  test('no translation for embeddedCancelled ' +
    '(mozbrowserafterkeyup, VolumeDown)', function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', true));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });

  test('no translation for (mozbrowserbeforekeydown, Unknown)', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('mozbrowserbeforekeydown', 'Unknown', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.isUndefined(actualTranslatedType);
    assert.isFalse(evt.preventDefault.calledOnce);
  });

  test('no translation for (keydown, Unknown)', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('keydown', 'Unknown', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.isUndefined(actualTranslatedType);
    assert.isFalse(evt.preventDefault.called);
  });

  test('no translation for (mozbrowserafterkeydown, Unknown)', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('mozbrowserafterkeydown', 'Unknown', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.isUndefined(actualTranslatedType);
    assert.isFalse(evt.preventDefault.called);
  });

  test('no translation for (mozbrowserbeforekeyup, Unknown)', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('mozbrowserbeforekeyup', 'Unknown', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.isUndefined(actualTranslatedType);
    assert.isFalse(evt.preventDefault.calledOnce);
  });

  test('no translation for (keyup, Unknown)', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('keyup', 'Unknown', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.isUndefined(actualTranslatedType);
    assert.isFalse(evt.preventDefault.called);
  });

  test('no translation for (mozbrowserafterkeyup, Unknown)', function() {
    var evt = this.sinon.stub(
      createHardwareKeyEvent('mozbrowserafterkeyup', 'Unknown', false));
    assert.isFalse(evt.preventDefault.called);
    var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
    assert.isUndefined(actualTranslatedType);
    assert.isFalse(evt.preventDefault.called);
  });

  test('translate (mozbrowserafterkeydown, Camera) into camera-button-press',
    function() {
      var evt = this.sinon.stub(createHardwareKeyEvent(
        'mozbrowserafterkeydown', 'Camera', false));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType =
        browserKeyEventManager.getButtonEventType(evt);
      assert.equal(actualTranslatedType, 'camera-button-press');
      assert.isFalse(evt.preventDefault.called);
    });

  test('no translation for embeddedCancelled (mozbrowserafterkeydown, Camera)',
    function() {
      var evt = this.sinon.stub(
        createHardwareKeyEvent('mozbrowserafterkeydown', 'Camera', true));
      assert.isFalse(evt.preventDefault.called);
      var actualTranslatedType = browserKeyEventManager.getButtonEventType(evt);
      assert.isUndefined(actualTranslatedType);
      assert.isFalse(evt.preventDefault.called);
    });
});
