/* global ViewManager */

'use strict';

require('/test/unit/mock_date.js');
require('/test/unit/mock_debug.js');
require('/test/unit/mock_moz_l10n.js');
require('/js/common.js');
require('/js/utils/toolkit.js');
require('/js/view_manager.js');

suite('ViewManager suite >', function() {

  var realMozL10n, viewManager;
  var view1, view2;

  if (!window.navigator.mozL10n) {
    window.navigator.mozL10n = null;
  }

  suiteSetup(function() {
    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    viewManager = new ViewManager();

    view1 = document.createElement('div');
    view1.id = 'view-1';

    view2 = document.createElement('div');
    view2.id = 'view-2';

    document.body.appendChild(view1);
    document.body.appendChild(view2);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;

    document.body.removeChild(view1);
    document.body.removeChild(view2);
  });

  var realLoadPanel;

  setup(function() {
    realLoadPanel = viewManager.loadPanel;
    viewManager.loadPanel = sinon.spy();
  });

  teardown(function() {
    viewManager.loadPanel = realLoadPanel;
  });

  test('Check if a view is a tab', function() {
    viewManager._tabs['is-a-tab'] = {};

    assert.ok(viewManager._isTab('is-a-tab'));
    assert.ok(!viewManager._isTab('not-a-tab'));
  });

  test('Change to a new view', function() {
    viewManager.changeViewTo('view-1');
    assert.ok(viewManager.loadPanel.calledWith(view1));
  });

  test('Trigger viewchanged event when changing to a new view',
    function(done) {
      viewManager.loadPanel = realLoadPanel;

      window.addEventListener('viewchanged',
        function onviewchanged(evt) {
          window.removeEventListener('viewchanged', onviewchanged);
          assert.equal(evt.detail.id, 'view-1');
          done();
        }
      );

      viewManager.changeViewTo('view-1');
    }
  );

  test('Pass parameters when changing to a new view',
    function(done) {
      viewManager.loadPanel = realLoadPanel;

      window.addEventListener('viewchanged',
        function onviewchanged(evt) {
          window.removeEventListener('viewchanged', onviewchanged);
          assert.equal(evt.detail.id, 'view-2');
          assert.equal(evt.detail.params.foo, 'bar');
          done();
        }
      );

      viewManager.changeViewTo('view-2?foo=bar');
    }
  );

});
