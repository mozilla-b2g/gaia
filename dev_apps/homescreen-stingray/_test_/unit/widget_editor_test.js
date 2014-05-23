'use strict';
/* global MockAppList, MockLayoutEditor, WidgetEditor, Applications*/

requireApp('homescreen-stingray/js/vendor/evt.js');
requireApp('homescreen-stingray/test/unit/mock_applications.js');
requireApp('homescreen-stingray/test/unit/mock_app_list.js');
requireApp('homescreen-stingray/test/unit/mock_selection_border.js');
requireApp('homescreen-stingray/test/unit/mock_layout_editor.js');

var options = {};

var mocksForWidgetEditor = new MocksHelper([
  'Applications', 'AppList', 'LayoutEditor', 'SelectionBorder'
]).init();

suite('WidgetEditor', function() {
  mocksForWidgetEditor.attachTestHelpers();
  var widgetEditor;
  var appList;
  var apps;
  var layoutEditor;
  var widgetContainerDiv;

  suiteSetup(function(done) {
    appList = new MockAppList();
    apps = [{
      name: 'name', iconUrl: 'iconUrl',
      manifestURL: 'manifestURL', entryPoint: 'entryPoint',
      preventDefault: function() {}
    }];
    layoutEditor = new MockLayoutEditor();
    widgetContainerDiv = document.createElement('div');
    widgetContainerDiv.hidden = true;
    options = {
      container: widgetContainerDiv,
      appList: appList,
      layoutEditor: layoutEditor
    };
    requireApp('homescreen-stingray/js/widget_editor.js', done);
  });

  suiteTeardown(function() {
    appList = null;
    options = {};
  });

  suite('WidgetEditor start', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      this.sinon.stub(widgetEditor, '_handleAppRemoved', function() {});
      this.sinon.stub(widgetEditor, '_handleAppUpdated', function() {});
      this.sinon.stub(widgetEditor, '_handlePlaceClicked', function() {});
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
    });

    teardown(function() {
      widgetEditor._handleAppRemoved.restore();
      widgetEditor._handleAppUpdated.restore();
      widgetEditor._handlePlaceClicked.restore();
      widgetEditor.stop();
    });

    test('Should respond to uninstall/update events', function() {
      Applications.trigger('uninstall');
      Applications.trigger('update');
      assert.isTrue(widgetEditor._handleAppRemoved.called);
      assert.isTrue(widgetEditor._handleAppUpdated.called);
    });

    test('Should respond to container click events', function() {
      widgetContainerDiv.click();
      assert.isTrue(widgetEditor._handlePlaceClicked.called);
    });
  });

  suite('WidgetEditor stop', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      this.sinon.spy(widgetEditor, '_handlePlaceClicked');
      this.sinon.stub(widgetEditor, '_handleAppRemoved', function() {});
      this.sinon.stub(widgetEditor, '_handleAppUpdated', function() {});
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      widgetEditor.stop();
    });

    teardown(function() {
      widgetEditor._handlePlaceClicked.restore();
      widgetEditor._handleAppRemoved.restore();
      widgetEditor._handleAppUpdated.restore();
    });

    test('Should not respond to click event', function() {
      widgetContainerDiv.click();
      assert.isFalse(widgetEditor._handlePlaceClicked.called);
    });

    test('Should not respond to uninstall/update events', function() {
      Applications.trigger('uninstall');
      Applications.trigger('update');
      assert.isFalse(widgetEditor._handleAppRemoved.called);
      assert.isFalse(widgetEditor._handleAppUpdated.called);
    });
  });

  suite('WidgetEditor show', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      widgetEditor.hide();
      this.sinon.spy(widgetEditor, 'fire');
    });

    teardown(function() {
      widgetEditor.fire.restore();
      widgetEditor.stop();
    });

    test('Should show widget editor if not shown', function() {
      widgetEditor.show();
      assert.isFalse(widgetContainerDiv.hidden);
      assert.equal(widgetEditor.fire.args[0][0], 'shown');
    });

    test('Should not change widget editor if already shown', function() {
      widgetEditor.show();
      widgetEditor.show();
      assert.isFalse(widgetContainerDiv.hidden);
      assert.isTrue(widgetEditor.fire.called);
      assert.equal(widgetEditor.fire.callCount, 1);
    });
  });

  suite('WidgetEditor hide', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      widgetEditor.show();
      this.sinon.spy(widgetEditor, 'fire');
    });

    teardown(function() {
      widgetEditor.fire.restore();
      widgetEditor.stop();
    });

    test('Should hide widget editor if not hidden', function() {
      widgetEditor.hide();
      // Should fire closed event
      assert.isTrue(widgetContainerDiv.hidden);
      assert.equal(widgetEditor.fire.args[0][0], 'closed');
    });

    test('Should not change widget editor if already hidden', function() {
      widgetEditor.hide();
      widgetEditor.hide();
      // Should not fire closed event
      assert.isTrue(widgetContainerDiv.hidden);
      assert.isTrue(widgetEditor.fire.called);
      assert.equal(widgetEditor.fire.callCount, 1);
    });
  });

  suite('WidgetEditor isShown', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
    });

    teardown(function() {
      widgetEditor.stop();
    });

    test('Should have widget editor visibility state', function() {
      var isShown = widgetEditor.isShown();
      assert.equal(!widgetContainerDiv.hidden, isShown);
    });
  });

  suite('WidgetEditor loadWidgets', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      this.sinon.spy(widgetEditor.editor, 'reset');
      this.sinon.spy(widgetEditor, '_fillAppIcon');
    });

    teardown(function() {
      widgetEditor.editor.reset.restore();
      widgetEditor._fillAppIcon.restore();
      widgetEditor.stop();
    });

    test('Should invoke importConfig if config exist', function() {
      var configs = [{app: apps[0]}];
      widgetEditor.loadWidgets(configs);
      assert.isTrue(widgetEditor.editor.reset.called);
      assert.isTrue(widgetEditor._fillAppIcon.called);
    });

    test('Should not invoke importConfig if config not exist', function() {
      widgetEditor.loadWidgets();
      assert.isFalse(widgetEditor.editor.reset.called);
      assert.isFalse(widgetEditor._fillAppIcon.called);
    });
  });

  suite('WidgetEditor _fillAppIcon', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
    });

    teardown(function() {
      widgetEditor.stop();
    });

    test('Should invoke Applications getIconBlob and callback', function() {
      var cfg = {positionId: 0, app: apps[0]};
      this.sinon.spy(Applications, 'getIconBlob');
      var callbackCalled = false;
      widgetEditor._fillAppIcon(cfg, function() {
        callbackCalled = true;
      });

      assert.isTrue(Applications.getIconBlob.called);
      assert.isTrue(callbackCalled);
    });
  });

  suite('WidgetEditor _togglePlace', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      this.sinon.spy(widgetEditor, '_revokeUrl');
      this.sinon.stub(widgetEditor.editor, 'removeWidget');
      this.sinon.spy(widgetEditor.appList, 'show');
    });

    teardown(function() {
      widgetEditor._revokeUrl.restore();
      widgetEditor.editor.removeWidget.restore();
      widgetEditor.appList.show.restore();
      widgetEditor.stop();
    });

    test('toggle on empty place', function() {
      var places = widgetEditor.editor.placeHolders;
      widgetEditor._switchFocus(places[2]);
      widgetEditor._togglePlace(places[2]);
      // Empty place, show appList
      assert.isFalse(widgetEditor._revokeUrl.called);
      assert.isFalse(widgetEditor.editor.removeWidget.called);
      assert.isTrue(widgetEditor.appList.show.called);
    });

    test('toggle on widget place', function() {
      var places = widgetEditor.editor.placeHolders;
      places[2].app = {manifestURL: '', entryPoint: ''};
      widgetEditor._switchFocus(places[2]);
      widgetEditor._togglePlace(places[2]);
      // Widget place, _revokeUrl and removeWidget
      assert.isTrue(widgetEditor._revokeUrl.called);
      assert.isTrue(widgetEditor.editor.removeWidget.called);
      assert.isFalse(widgetEditor.appList.show.called);
    });
  });

  suite('WidgetEditor _switchFocus', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      this.sinon.spy(widgetEditor.selectionBorder, 'select');
    });

    teardown(function() {
      widgetEditor.selectionBorder.select.restore();
      widgetEditor.stop();
    });

    test('Should not invoke _switchFocus without place holder', function() {
      widgetEditor._switchFocus();
      assert.isFalse(widgetEditor.selectionBorder.select.called);
    });

    test('Should invoke _switchFocus with place holder', function() {
      var place = widgetEditor.editor.placeHolders[0];
      widgetEditor._switchFocus(place);
      assert.isTrue(widgetEditor.selectionBorder.select.called);
    });
  });

  suite('WidgetEditor _handleAppChosen', function() {
    var app;

    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      this.sinon.spy(widgetEditor.appList, 'hide');
      this.sinon.spy(widgetEditor.editor, 'addWidget');
      this.sinon.spy(Applications, 'getIconBlob');
      app = apps[0];
    });

    teardown(function() {
      widgetEditor.appList.hide.restore();
      widgetEditor.editor.addWidget.restore();
      Applications.getIconBlob.restore();
      widgetEditor.stop();
    });

    test('_handleAppChosen', function() {
      var appPreventDefault = this.sinon.spy(app, 'preventDefault');
      widgetEditor._handleAppChosen(app);
      assert.isTrue(widgetEditor.editor.addWidget.called);
      var args = widgetEditor.editor.addWidget.args[0][0];
      assert.equal(args.name, app.name);
      assert.equal(args.manifestURL, app.manifestURL);
      assert.equal(args.entryPoint, app.entryPoint);
      assert.isTrue(appPreventDefault.called);
      assert.isTrue(Applications.getIconBlob.called);
      assert.equal(Applications.getIconBlob.args[0][0], app.manifestURL);
      assert.equal(Applications.getIconBlob.args[0][1], app.entryPoint);
      assert.isTrue(widgetEditor.appList.hide.called);
    });
  });

  suite('WidgetEditor _handleAppRemoved', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      this.sinon.stub(widgetEditor.editor, 'removeWidgets', function() {});
    });

    teardown(function() {
      widgetEditor.editor.removeWidgets.restore();
      widgetEditor.stop();
    });

    test('_handleAppRemoved', function() {
      widgetEditor._handleAppRemoved(apps);
      assert.isTrue(widgetEditor.editor.removeWidgets.called);
    });
  });

  suite('WidgetEditor _handleAppUpdated', function() {
    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      this.sinon.stub(widgetEditor.editor, 'updateWidgets', function() {});
    });

    teardown(function() {
      widgetEditor.editor.updateWidgets.restore();
      widgetEditor.stop();
    });

    test('_handleAppUpdated', function() {
      widgetEditor._handleAppUpdated(apps);
      assert.isTrue(widgetEditor.editor.updateWidgets.called);
    });
  });

  suite('WidgetEditor _handlePlaceClicked', function() {
    var e;
    var places;

    setup(function() {
      widgetEditor = new WidgetEditor();
      widgetEditor.start(widgetContainerDiv, widgetContainerDiv, appList,
                         layoutEditor);
      this.sinon.stub(widgetEditor, '_togglePlace', function() {});
      places = widgetEditor.editor.placeHolders;
      e = {
        stopImmediatePropagation: function() {},
        preventDefault: function() {}
      };
    });

    teardown(function() {
      widgetEditor._togglePlace.restore();
      widgetEditor.stop();
    });

    test('Click element not in placeholder', function() {
      e.target = {};
      widgetEditor._handlePlaceClicked(e);
      assert.isFalse(widgetEditor._togglePlace.called);
    });

    test('Click static element in placeholder', function() {
      // click on static element: place 1, 2
      for (var i = 0; i < 2; i++) {
        e.target = places[i].elm;
        widgetEditor._handlePlaceClicked(e);
        assert.equal(widgetEditor._togglePlace.callCount, 0);
      }
    });

    test('Click non static element in placeholder', function() {
      // click non static element: place 3, 4, 5, 6
      for (var i = 0; i < 4; i++) {
        var idx = i + 2;
        var callCount = i + 1;
        e.target = places[idx].elm;
        widgetEditor._handlePlaceClicked(e);
        assert.equal(widgetEditor._togglePlace.callCount, callCount);
      }
    });
  });
});
