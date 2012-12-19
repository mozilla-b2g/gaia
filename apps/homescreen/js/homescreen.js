
'use strict';

const Homescreen = (function() {
  var mode = 'normal', initialized = false;

  var _ = navigator.mozL10n.get;
  setLocale();
  window.addEventListener('localized', function localize() {
    setLocale();
    if (initialized) {
      GridManager.localize();
    }
  });

  // Initialize the various components.
  function initialize() {
    PaginationBar.init('.paginationScroller');
    GridManager.init('.apps', '.dockWrapper', function gm_init() {
      PaginationBar.show();
      GridManager.goToPage(1);
      DragDropManager.init();
      Wallpaper.init();
      initialized = true;
    });
  }

  window.addEventListener('hashchange', function() {
    if (document.location.hash != '#root')
      return;

    if (Homescreen.isInEditMode()) {
      Homescreen.setMode('normal');
      GridManager.markDirtyState();
      ConfirmDialog.hide();
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
      var title, body;
      var cancel = {
        title: _('cancel'),
        callback: ConfirmDialog.hide
      };

      var confirm = {
        callback: function onAccept() {
          ConfirmDialog.hide();
          app.uninstall();
        },
        applyClass: 'danger'
      };

      // Show a different prompt if the user is trying to remove
      // a bookmark shortcut instead of an app.
      var manifest = app.manifest || app.updateManifest;
      if (app.isBookmark) {
        title = _('remove-title-2', { name: manifest.name });
        body = _('remove-body', { name: manifest.name });
        confirm.title = _('remove');
      } else {
        title = _('delete-title', { name: manifest.name });
        body = _('delete-body', { name: manifest.name });
        confirm.title = _('delete');
      }

      ConfirmDialog.show(title, body, cancel, confirm);
    },

    isInEditMode: function() {
      return mode === 'edit';
    },

    setMode: function(newMode) {
      mode = document.body.dataset.mode = newMode;
    },

    init: initialize
  };

})();

if (document.readyState === 'complete') {
  Homescreen.init();
} else {
  window.addEventListener('DOMContentLoaded', function homescreenStart() {
    Homescreen.init();
    window.removeEventListener('DOMContentLoaded', homescreenStart);
  });
}
