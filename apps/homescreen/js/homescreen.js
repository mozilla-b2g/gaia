
'use strict';

const Homescreen = (function() {
  var mode = 'normal';

  var _ = navigator.mozL10n.get;
  setLocale();
  window.addEventListener('localized', function localize() {
    setLocale();
    GridManager.localize();
  });

  // Initialize the various components.
  PaginationBar.init('.paginationScroller');
  GridManager.init('.apps', '.dockWrapper', function gm_init() {
    PaginationBar.show();
    GridManager.goToPage(1);
    DragDropManager.init();
    Wallpaper.init();
  });

  window.addEventListener('hashchange', function() {
    if (document.location.hash != '#root')
      return;

    if (Homescreen.isInEditMode()) {
      Homescreen.setMode('normal');
      GridManager.markDirtyState();
      Permissions.hide();
      GridManager.goToPage(GridManager.pageHelper.getCurrentPageNumber());
    } else {
      GridManager.goToPage(1);
    }
  });

  function setLocale() {
    // set the 'lang' and 'dir' attributes to <html> when the page is translated
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  }

  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler('activity', function onActivity(activity) {
      var data = activity.source.data;
      switch (activity.source.name) {
        case 'save-bookmark':
          if (data.type === 'url') {
            BookmarkEditor.init(data);
          }
          break;
      }
    });
  }

  return {
    /*
     * Displays the contextual menu given an app.
     *
     * @param {Application} app
     *                      The application object.
     */
    showAppDialog: function h_showAppDialog(app) {
      var title, body, yesLabel;
      // Show a different prompt if the user is trying to remove
      // a bookmark shortcut instead of an app.
      if (app.isBookmark) {
        title = _('remove-title', { name: app.manifest.name });
        body = '';
        yesLabel = _('remove');
      } else {
        title = _('delete-title', { name: app.manifest.name });
        body = _('delete-body', { name: app.manifest.name });
        yesLabel = _('delete');
      }

      Permissions.show(title, body, yesLabel, _('cancel'),
                       function onAccept() { app.uninstall() },
                       function onCancel() {});
    },

    isInEditMode: function() {
      return mode === 'edit';
    },

    setMode: function(newMode) {
      mode = document.body.dataset.mode = newMode;
    }
  };
})();
