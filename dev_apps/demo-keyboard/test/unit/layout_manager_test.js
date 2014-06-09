'use strict';

/* global KeyboardLayoutManager */
requireApp('demo-keyboard/js/layout_manager.js');
requireApp('demo-keyboard/js/layout.js');
requireApp('demo-keyboard/js/page.js');
requireApp('demo-keyboard/js/key.js');

suite('KeyboardLayoutManager', function() {

  function appSpy() {
    var app = {
      handleLayoutLoaded: function() {},
      path: '',
      debug: function() {}
    };

    return app;
  }

  var layoutManager;
  var app = appSpy();

  suite('[layout loading]', function() {
    setup(function() {
      layoutManager = new KeyboardLayoutManager(app);
      layoutManager.LAYOUT_PATH = '/layouts/';
      layoutManager.start();
    });

    teardown(function() {
      app.handleLayoutLoaded.restore();
      layoutManager.stop();
    });


    test('load single layout: en', function(done) {
      sinon.stub(app, 'handleLayoutLoaded', function() {
        sinon.assert.calledOnce(app.handleLayoutLoaded);
        sinon.assert.calledWith(app.handleLayoutLoaded, 'en');

        var layout = layoutManager.getLayout('en');
        assert.equal(layout.name, 'English');

        done();
      });

      layoutManager.load('en');
    });

    test('load single layout: es', function(done) {
      sinon.stub(app, 'handleLayoutLoaded', function() {
        sinon.assert.calledOnce(app.handleLayoutLoaded);
        sinon.assert.calledWith(app.handleLayoutLoaded, 'es');

        var layout = layoutManager.getLayout('es');
        assert.equal(layout.name, 'Spanish');
        done();
      });

      layoutManager.load('es');
    });

    test('load 2 layouts: en & es', function(done) {
      sinon.stub(app, 'handleLayoutLoaded', function() {
        if (app.handleLayoutLoaded.callCount != 2) {
          return;
        }

        sinon.assert.calledTwice(app.handleLayoutLoaded);
        sinon.assert.calledWith(app.handleLayoutLoaded, 'en');
        sinon.assert.calledWith(app.handleLayoutLoaded, 'es');

        var layout = layoutManager.getLayout('en');
        assert.equal(layout.name, 'English');

        layout = layoutManager.getLayout('es');
        assert.equal(layout.name, 'Spanish');
        done();
      });

      layoutManager.load('en');
      layoutManager.load('es');
    });

    test('load en 2 times', function(done) {

      sinon.stub(app, 'handleLayoutLoaded', function(name) {
        sinon.assert.calledOnce(layoutManager.handleEvent);
        sinon.assert.calledWith(app.handleLayoutLoaded, 'en');

        var layout = layoutManager.getLayout('en');
        assert.equal(layout.name, 'English');

        done();
      });

      sinon.spy(layoutManager, 'handleEvent');

      layoutManager.load('en');
      layoutManager.load('en');
    });

    test('load en after it is loaded', function(done) {
      sinon.stub(app, 'handleLayoutLoaded', function(name) {

        sinon.spy(layoutManager, 'handleEvent');

        // To stub this function again
        app.handleLayoutLoaded.restore();
        sinon.stub(app, 'handleLayoutLoaded', function(name) {
          sinon.assert.callCount(layoutManager.handleEvent, 0);

          var layout = layoutManager.getLayout('en');
          assert.equal(layout.name, 'English');
          done();
        });

        // Second-time loading
        layoutManager.load('en');
      });

      // First-time loading
      layoutManager.load('en');
    });
  });  // end of layout loading suite

  suite('[module state]', function() {
    test('should not call back when the module is stopped', function() {

      sinon.stub(app, 'handleLayoutLoaded');

      var layoutManager = new KeyboardLayoutManager(app);
      layoutManager.LAYOUT_PATH = '/layouts/';
      layoutManager.start();
      layoutManager.load('en');
      layoutManager.stop();

      sinon.assert.callCount(app.handleLayoutLoaded, 0);
      assert.equal(layoutManager.xhrList, null);
    });
  });
});
