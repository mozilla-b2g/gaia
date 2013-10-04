'use strict';

var ContextMenuDialog = (function() {
  var initialized = false;

  var dialog, wallpaperButton, collectionsButton, cancelButton;

  function initialize() {
    if (initialized) {
      return;
    }

    dialog = document.getElementById('contextmenu-dialog');

    wallpaperButton =
      document.getElementById('contextmenu-dialog-wallpaper-button');

    collectionsButton =
      document.getElementById('contextmenu-dialog-collections-button');

    cancelButton =
      document.getElementById('contextmenu-dialog-cancel-button');

    initialized = true;
  }

  function chooseWallpaper() {
    LazyLoader.load(['shared/js/omadrm/fl.js', 'js/wallpaper.js'],
        function wallpaperLoaded() {
          Wallpaper.contextmenu();

          // prevent flickering until wallpaper dialog opens
          window.setTimeout(hide, 50);
        }
    );
  }

  function addCollection() {
    hide(function() {
      window.dispatchEvent(new CustomEvent('suggestcollections'));
    });
  }

  function show() {
    initialize();

    wallpaperButton.addEventListener('click', chooseWallpaper);
    collectionsButton.addEventListener('click', addCollection);
    cancelButton.addEventListener('click', hide);

    dialog.style.display = 'block';
    setTimeout(function animate() {
      dialog.classList.add('visible');
      window.dispatchEvent(new CustomEvent('contextmenushowed'));
    }, 10);
  }

  function hide(cb) {
    initialize();

    wallpaperButton.removeEventListener('click', chooseWallpaper);
    collectionsButton.removeEventListener('click', addCollection);
    cancelButton.removeEventListener('click', hide);

    dialog.addEventListener('transitionend', function hidden() {
      dialog.removeEventListener('transitionend', hidden);
      dialog.style.display = 'none';
      if (typeof cb === 'function') {
        cb();
      }
    });

    dialog.classList.remove('visible');
    window.dispatchEvent(new CustomEvent('contextmenuhidden'));
  }

  return {
    hide: hide,
    show: show,
    init: initialize
  };
}());
