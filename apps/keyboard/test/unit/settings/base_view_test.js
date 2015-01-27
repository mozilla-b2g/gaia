'use strict';

/* global BaseView */

require('/js/settings/base_view.js');

suite('BaseView', function() {
  var view;

  setup(function() {
    var stubGetElementById = this.sinon.stub(document, 'getElementById');

    view = new BaseView();

    view.CONTAINER_ID = 'test-id';

    view.start();

    assert.isTrue(stubGetElementById.called);
  });

  teardown(function() {
    view.stop();
  });

  suite('Transition event hooks', function() {
    var stubPromiseAll;

    setup(function() {
      view.childViews = {
        view1: {
          beforeShow: this.sinon.stub().returns('beforeShow1'),
          show: this.sinon.stub().returns('show1'),
          beforeHide: this.sinon.stub().returns('beforeHide1'),
          hide: this.sinon.stub().returns('hide1')
        },
        view2: {
          beforeShow: this.sinon.stub().returns('beforeShow2'),
          show: this.sinon.stub().returns('show2'),
          beforeHide: this.sinon.stub().returns('beforeHide2'),
          hide: this.sinon.stub().returns('hide2')
        },
        view3: {
          beforeShow: this.sinon.stub().returns('beforeShow3'),
          show: this.sinon.stub().returns('show3'),
          beforeHide: this.sinon.stub().returns('beforeHide3'),
          hide: this.sinon.stub().returns('hide3')
        }
      };

      stubPromiseAll = this.sinon.stub(window.Promise, 'all');      
    });

    test('beforeShow', function(){
      var options = {};

      view.beforeShow(options);

      assert.isTrue(stubPromiseAll.calledWith(
        ['beforeShow1', 'beforeShow2', 'beforeShow3']));
      assert.isTrue(view.childViews.view1.beforeShow.calledWith(options));
      assert.isTrue(view.childViews.view2.beforeShow.calledWith(options));
      assert.isTrue(view.childViews.view3.beforeShow.calledWith(options));
    });

    test('show', function(){
      view.show();

      assert.isTrue(stubPromiseAll.calledWith(['show1', 'show2', 'show3']));
    });

    test('beforeHide', function(){
      view.beforeHide();

      assert.isTrue(stubPromiseAll.calledWith(
        ['beforeHide1', 'beforeHide2', 'beforeHide3']));
    });

    test('hide', function(){
      view.hide();

      assert.isTrue(stubPromiseAll.calledWith(['hide1', 'hide2', 'hide3']));
    });
  });
});
