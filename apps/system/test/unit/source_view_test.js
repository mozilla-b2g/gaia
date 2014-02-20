/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global AppWindowManager, MocksHelper, ScreenManager, SourceView*/

'use strict';

requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_screen_manager.js');

requireApp('system/js/source_view.js');

mocha.globals([
  'AppWindowManager',
  'ScreenManager',
]);

var mocksForBootstrap = new MocksHelper([
  'AppWindowManager',
  'ScreenManager',
]).init();

suite('system/SourceView', function() {
  var sourceView;

  function insertDummyViewerElement() {
    var viewsourceElement = document.createElement('div');
    viewsourceElement.id = 'appViewsource';
    document.body.appendChild(viewsourceElement);
    viewsourceElement.style.visibility = 'visible';
    return viewsourceElement;
  }

  mocksForBootstrap.attachTestHelpers();

  suiteSetup(function() {
    ScreenManager.screenEnabled = true;
    sourceView = new SourceView();
    sourceView.start();
  });

  suiteTeardown(function() {
    sourceView.stop();
  });

  suite('getter attributes', function() {
    var viewsourceElement;
    suiteSetup(function() {
      viewsourceElement = insertDummyViewerElement();
    });
    suiteTeardown(function() {
      document.body.removeChild(viewsourceElement);
    });
    test('viewer returns correct DOM element', function() {
      assert.equal(sourceView.viewer, viewsourceElement);
    });
    test('active returns true when viewer element is visible', function() {
      assert.isTrue(sourceView.active);
    });
    test('active returns false when DOM element is not visible', function() {
      viewsourceElement.style.visibility = 'hidden';
      assert.isFalse(sourceView.active);
    });
  });

  suite('toggle source view', function() {
    test('source view is hidden at first', function() {
      assert.isNull(sourceView.viewer);
      assert.isFalse(sourceView.active);
    });

    test('show when home+volume buttons are pressed', function() {
      var evt = new CustomEvent('home+volume');
      window.dispatchEvent(evt);

      assert.isTrue(sourceView.active);
      assert.isNotNull(sourceView.viewer);
      sourceView.viewer.src = 'view-source: ' +
                              AppWindowManager.getDisplayedApp();
    });

    test('hide when home+volume buttons are pressed', function() {
      var evt = new CustomEvent('home+volume');
      window.dispatchEvent(evt);

      assert.isFalse(sourceView.active);
      sourceView.viewer.src = 'about:blank';
    });

    test('show again when home+volume buttons are pressed', function() {
      var evt = new CustomEvent('home+volume');
      window.dispatchEvent(evt);

      assert.isTrue(sourceView.active);
      sourceView.viewer.src = 'view-source: ' +
                              AppWindowManager.getDisplayedApp();
    });

    test('hide when device is being locked', function() {
      var evt = new CustomEvent('locked');
      window.dispatchEvent(evt);

      assert.isFalse(sourceView.active);
      sourceView.viewer.src = 'about:blank';
    });

    test('do not break if trying to hide but already hidden', function() {
      var evt = new CustomEvent('locked');
      window.dispatchEvent(evt);

      assert.isFalse(sourceView.active);
      sourceView.viewer.src = 'about:blank';
    });

    test('do not toggle when screen is not enabled', function() {
      ScreenManager.screenEnabled = false;
      var evt = new CustomEvent('home+volume');
      window.dispatchEvent(evt);

      assert.isFalse(sourceView.active);
      sourceView.viewer.src = 'about:blank';
    });
  });
});
