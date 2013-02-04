
'use strict';

const Homescreen = (function() {
  var mode = 'normal';
  var origin = document.location.protocol + '//homescreen.' +
    document.location.host.replace(/(^[\w\d]+.)?([\w\d]+.[a-z]+)/, '$2');
  var _ = navigator.mozL10n.get;
  setLocale();
  navigator.mozL10n.ready(function localize() {
    setLocale();
    GridManager.localize();
  });

  var initialized = false, landingPage;

  // Initialize the various components.
  PaginationBar.init('.paginationScroller');

  function initialize(lPage) {
    if (initialized) {
      return;
    }

    initialized = true;
    landingPage = lPage;

    window.addEventListener('hashchange', function() {
      if (document.location.hash != '#root')
        return;

      if (Homescreen.isInEditMode()) {
        exitFromEditMode();
      } else {
        GridManager.goToPage(landingPage);
      }
    });

    GridManager.init('.apps', '.dockWrapper', function gm_init() {
      PaginationBar.show();
      if (document.location.hash === '#root') {
        // Switch to the first page only if the user has not already start to pan
        // while home is loading
        GridManager.goToPage(landingPage);
      }
      DragDropManager.init();
      Wallpaper.init();
    });
  }

  function exitFromEditMode() {
    Homescreen.setMode('normal');
    GridManager.markDirtyState();
    ConfirmDialog.hide();
    GridManager.goToPage(GridManager.pageHelper.getCurrentPageNumber());
  }

  document.addEventListener('mozvisibilitychange', function mozVisChange() {
    if (document.mozHidden && Homescreen.isInEditMode()) {
      exitFromEditMode();
    }

    if (document.mozHidden == false) {
      setTimeout(function forceRepaint() {
        var helper = document.getElementById('repaint-helper');
        helper.classList.toggle('displayed');
      });
    }
  });

  window.addEventListener('message', function hs_onMessage(event) {
    if (event.origin === origin) {
      var message = event.data;
      switch (message.type) {
        case Message.Type.ADD_BOOKMARK:
          var app = new Bookmark(message.data);
          GridManager.install(app);
          break;
      }
    }
  });

  function setLocale() {
    // set the 'lang' and 'dir' attributes to <html> when the page is translated
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
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
          if (app.isBookmark) {
            app.uninstall();
          } else {
            navigator.mozApps.mgmt.uninstall(app);
          }
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
        // Make sure to get the localized name
        manifest = new ManifestHelper(manifest);
        title = _('delete-title', { name: manifest.name });
        body = _('delete-body', { name: manifest.name });
        confirm.title = _('delete');
      }

      ConfirmDialog.show(title, body, cancel, confirm);
    },

    isInEditMode: function() {
      return mode === 'edit';
    },

    init: initialize,

    setMode: function(newMode) {
      mode = document.body.dataset.mode = newMode;
    }
  };
})();
