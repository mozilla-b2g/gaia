'use strict';

require('/shared/js/lazy_loader.js');
requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_request.html.js');
requireApp('homescreen/test/unit/mock_lazy_loader.js');
requireApp('homescreen/test/unit/mock_l10n.js');
requireApp('homescreen/test/unit/mock_grid_manager.js');
requireApp('homescreen/test/unit/mock_pagination_bar.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('homescreen/js/grid_components.js');
requireApp('homescreen/js/request.js');
requireApp('homescreen/test/unit/mock_moz_activity.js');
requireApp('homescreen/test/unit/mock_icon.js');

requireApp('homescreen/js/homescreen.js');

var mocksHelperForHome = new MocksHelper([
  'PaginationBar',
  'GridManager',
  'ManifestHelper',
  'LazyLoader',
  'MozActivity'
]);
mocksHelperForHome.init();

suite('homescreen.js >', function() {

  var dialog, icon;

  mocksHelperForHome.attachTestHelpers();

  suiteSetup(function() {
    dialog = document.createElement('section');
    dialog.id = 'confirm-dialog';
    dialog.innerHTML = MockRequestHtml;
    document.body.appendChild(dialog);
    ConfirmDialog.init();
    icon = new MockIcon(null, {
      id: 'test',
      type: GridItemsFactory.TYPE.BOOKMARK
    });
  });

  suiteTeardown(function() {
    document.body.removeChild(dialog);
  });

  test(' Homescreen is in edit mode ', function() {
    Homescreen.setMode('edit');
    assert.isTrue(Homescreen.isInEditMode());
    assert.equal(document.body.dataset.mode, 'edit');
  });

  test(' Homescreen is not in edit mode ', function() {
    Homescreen.setMode('normal');
    assert.isFalse(Homescreen.isInEditMode());
    assert.equal(document.body.dataset.mode, 'normal');
  });

  test(' Homescreen displays a contextual menu for an app ', function() {
    Homescreen.showAppDialog({
      app: new MockApp(),
      getName: function() {}
    });
    assert.isTrue(dialog.classList.contains('visible'));
  });

  test(' Homescreen is listening online event ', function() {
    window.dispatchEvent(new CustomEvent('online'));
    assert.equal(document.body.dataset.online, 'online');
  });

  test(' Homescreen is listening offline event ', function() {
    window.dispatchEvent(new CustomEvent('offline'));
    assert.equal(document.body.dataset.online, 'offline');
  });

  test(' Homescreen showEditBookmarkDialog ', function() {
    var activities = MockMozActivity.calls;
    assert.equal(activities.length, 0);

    Homescreen.showEditBookmarkDialog(icon);

    assert.equal(activities.length, 1);
    var activity = activities[0];
    assert.equal(activity.name, 'save-bookmark');
    assert.equal(activity.data.type, 'url');
    assert.equal(activity.data.url, icon.app.id);
  });

  test(' Homescreen showAppDialog for bookmarks ', function() {
    var activities = MockMozActivity.calls;
    assert.equal(activities.length, 0);

    Homescreen.showAppDialog(icon);

    assert.equal(activities.length, 1);
    // Activity data
    var activity = activities[0];
    assert.equal(activity.name, 'remove-bookmark');
    assert.equal(activity.data.type, 'url');
    assert.equal(activity.data.url, icon.app.id);
  });

});
