'use strict';

suite('Panel', function() {
  suiteSetup(function(done) {
    testRequire(['modules/panel'], (function(panelFunc) {
      this.Panel = panelFunc;
      done();
    }).bind(this));
  });

  suite('Basic functions', function() {
    setup(function() {
      this.panel = this.Panel();
    });

    teardown(function() {
      this.panel = null;
    });

    test('init()', function() {
      // initialized shoule be false by default.
      assert.isFalse(this.panel.initialized);

      this.panel.init();
      // initialized shoule be true after initialized.
      assert.isTrue(this.panel.initialized);
    });

    test('uninit()', function() {
      this.panel.init();
      assert.isTrue(this.panel.initialized);

      this.panel.uninit();
      // initialized shoule be false after uninitialized.
      assert.isFalse(this.panel.initialized);
    });

    test('beforeShow()', function() {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};

      this.panel.beforeShow(panelElement, options);
      // init should be called when beforeShow is called at the first time.
      sinon.assert.calledWith(initSpy, panelElement, options);
    });

    test('show()', function() {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};

      this.panel.show(panelElement, options);
      // init should be called when show is called at the first time.
      sinon.assert.calledWith(initSpy, panelElement, options);
    });
  });

  suite('Internal functions', function() {
    setup(function() {
      this.mockOptions = {
        onInit: function() {},
        onUninit: function() {},
        onShow: function() {},
        onHide: function() {},
        onBeforeShow: function() {},
        onBeforeHide: function() {}
      };
    });

    teardown(function() {
      this.mockOptions = null;
    });

    function convertToInternalFuncName(name) {
      return 'on' + name.charAt(0).toUpperCase() + name.slice(1);
    }

    ['init', 'show', 'beforeShow'].forEach(function(funcName) {
      var internalFuncName = convertToInternalFuncName(funcName);
      test(internalFuncName + ' should be called when ' +
           funcName + ' is called',
        function() {
          var spy = sinon.spy(this.mockOptions, internalFuncName);
          var panel = this.Panel(this.mockOptions);
          var panelElement = document.createElement('div');
          var options = {};

          panel[funcName](panelElement, options);
          sinon.assert.calledWith(spy, panelElement, options);
      });
    });

    ['hide', 'beforeHide'].forEach(function(funcName) {
      var internalFuncName = convertToInternalFuncName(funcName);
      test(internalFuncName + ' should be called when ' +
           funcName + ' is called',
        function() {
          var spy = sinon.spy(this.mockOptions, internalFuncName);
          var panel = this.Panel(this.mockOptions);

          panel[funcName]();
          sinon.assert.calledOnce(spy);
      });
    });

    test('onUninit should be called when uninit is called',
      function() {
        var spy = sinon.spy(this.mockOptions, 'onUninit');
        var panel = this.Panel(this.mockOptions);

        panel.init();
        panel.uninit();
        sinon.assert.calledOnce(spy);
    });

    test('onInit should be called only once', function() {
      var spy = sinon.spy(this.mockOptions, 'onInit');
      var panel = this.Panel(this.mockOptions);

      panel.init();
      panel.init();
      // onInit should be called only once.
      sinon.assert.calledOnce(spy);
    });

    test('onUninit should not be called if the panel is not initialized',
      function() {
        var spy = sinon.spy(this.mockOptions, 'onUninit');
        var panel = this.Panel(this.mockOptions);

        panel.uninit();
        sinon.assert.notCalled(spy);
    });
  });
});
