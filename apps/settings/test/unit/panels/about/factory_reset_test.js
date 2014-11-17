'use strict';

suite('about > factory_reset', function() {
  var factoryReset;
  var realNavigatorPower;
  var modules = [
    'panels/about/factory_reset'
  ];
  var maps = {};

  var MockPower = {
    factoryReset: function() {}
  };

  var elements = {
    resetButton: document.createElement('button'),
    resetDialog: document.createElement('form'),
    resetConfirm: document.createElement('button'),
    resetCancel: document.createElement('button')
  };

  setup(function(done) {
    testRequire(modules, maps,
      function(FactoryReset) {
        realNavigatorPower = navigator.mozPower;
        navigator.mozPower = MockPower;

        factoryReset = FactoryReset();
        elements.resetDialog.hidden = true;
        factoryReset._elements = elements;
        done();
    });
  });

  suiteTeardown(function() {
    navigator.mozPower = realNavigatorPower;
    realNavigatorPower = null;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(factoryReset, '_resetClick');
    });

    test('resetButton is enabled when mozPower exist', function() {
      factoryReset.init(elements);
      assert.equal(factoryReset._elements.resetButton.disabled, false);
    });

    test('resetButton is disabled when mozPower does not exist', function() {
      navigator.mozPower = null;
      factoryReset.init(elements);
      assert.equal(factoryReset._elements.resetButton.disabled, true);
    });

    test('resetButton is enabled when mozPower exist', function() {
      factoryReset.init(elements);
      factoryReset._elements.resetButton.click();
      assert.ok(factoryReset._resetClick.called);
    });
  });

  suite('resetClick', function() {
    setup(function() {
      this.sinon.stub(factoryReset, '_factoryReset');
      factoryReset.init(elements);
    });

    test('resetDialog is shown when calling resetClick', function() {
      assert.equal(factoryReset._elements.resetDialog.hidden, true);
      factoryReset._resetClick();
      assert.equal(factoryReset._elements.resetDialog.hidden, false);
    });

    test('resetDialog is hidden when cancel button is clicked', function() {
      factoryReset._resetClick();
      assert.equal(factoryReset._elements.resetDialog.hidden, false);
      factoryReset._elements.resetCancel.click();
      assert.equal(factoryReset._elements.resetDialog.hidden, true);
    });

    test('factoryReset is called when confirm button is clicked', function() {
      factoryReset._resetClick();
      assert.equal(factoryReset._elements.resetDialog.hidden, false);
      factoryReset._elements.resetConfirm.click();
      assert.ok(factoryReset._factoryReset.called);
      assert.equal(factoryReset._elements.resetDialog.hidden, true);
    });

    test('if mozPower is not defined, dialog is still hidden ' +
      'when confirm button is clicked', function() {
        navigator.mozPower = null;
        factoryReset._resetClick();
        assert.equal(factoryReset._elements.resetDialog.hidden, false);
        factoryReset._elements.resetConfirm.click();
        assert.ok(factoryReset._factoryReset.called);
        assert.equal(factoryReset._elements.resetDialog.hidden, true);
    });
  });

  suite('factoryReset', function() {
    setup(function() {
      this.sinon.spy(navigator.mozPower, 'factoryReset');
      this.sinon.stub(console, 'error');
    });

    test('mozPower factoryReset is called', function() {
      factoryReset._factoryReset();
      assert.ok(navigator.mozPower.factoryReset.called);
    });

    test('if mozPower is not defined, return error',
      function() {
        navigator.mozPower = null;
        factoryReset._factoryReset();
        assert.ok(console.error.calledWith('Cannot get mozPower'));
    });

    test('if mozPower factoryReset is not defined, ' +
      'mozPower factoryReset should not be called', function() {
        navigator.mozPower.factoryReset = null;
        factoryReset._factoryReset();
        assert.ok(
          console.error.calledWith('Cannot invoke mozPower.factoryReset()'));
    });
  });
});
