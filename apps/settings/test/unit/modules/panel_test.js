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

    test('init()', function(done) {
      // initialized shoule be false by default.
      assert.isFalse(this.panel.initialized);

      Promise.resolve(this.panel.init())
      .then(function() {
        // initialized shoule be true after initialized.
        assert.isTrue(this.panel.initialized);
        done();
      }.bind(this));
    });

    test('uninit()', function(done) {
      Promise.resolve(this.panel.init())
      .then(function() {
        assert.isTrue(this.panel.initialized);

        this.panel.uninit();
        // initialized shoule be false after uninitialized.
        assert.isFalse(this.panel.initialized);
        done();
      }.bind(this));
    });

    test('beforeShow()', function(done) {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};

      Promise.resolve(this.panel.beforeShow(panelElement, options))
      .then(function() {
        // init should be called when beforeShow is called at the first time.
        sinon.assert.calledWith(initSpy, panelElement, options);
        done();
      });
    });

    test('show()', function(done) {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};

      Promise.resolve(this.panel.show(panelElement, options))
      .then(function() {
        // init should be called when show is called at the first time.
        sinon.assert.calledWith(initSpy, panelElement, options);
        done();
      });
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
        function(done) {
          var spy = sinon.spy(this.mockOptions, internalFuncName);
          var panel = this.Panel(this.mockOptions);
          var panelElement = document.createElement('div');
          var options = {};

          Promise.resolve(panel[funcName](panelElement, options))
          .then(function() {
            sinon.assert.calledWith(spy, panelElement, options);
            done();
          });
      });
    });

    ['hide', 'beforeHide'].forEach(function(funcName) {
      var internalFuncName = convertToInternalFuncName(funcName);
      test(internalFuncName + ' should be called when ' +
           funcName + ' is called',
        function(done) {
          var spy = sinon.spy(this.mockOptions, internalFuncName);
          var panel = this.Panel(this.mockOptions);

          Promise.resolve(panel[funcName]())
          .then(function() {
            sinon.assert.calledOnce(spy);
            done();
          });
      });
    });

    test('onUninit should be called when uninit is called',
      function(done) {
        var spy = sinon.spy(this.mockOptions, 'onUninit');
        var panel = this.Panel(this.mockOptions);

        Promise.resolve(panel.init())
        .then(function() {
          panel.uninit();
          sinon.assert.calledOnce(spy);
          done();
        });
    });

    test('onInit should be called only once', function(done) {
      var spy = sinon.spy(this.mockOptions, 'onInit');
      var panel = this.Panel(this.mockOptions);

      Promise.resolve(panel.init())
      .then(panel.init())
      .then(function() {
        // onInit should be called only once.
        sinon.assert.calledOnce(spy);
        done();
      });
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
