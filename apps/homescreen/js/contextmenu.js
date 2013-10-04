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
        hide(Wallpaper.contextmenu);
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

    var classList = dialog.classList;
    classList.add('visible');
    setTimeout(function animate() {
      classList.add('show');
      window.dispatchEvent(new CustomEvent('contextmenushowed'));
    }, 50); // Give the opportunity to paint the UI component
  }

  function hide(cb) {
    initialize();

    wallpaperButton.removeEventListener('click', chooseWallpaper);
    collectionsButton.removeEventListener('click', addCollection);
    cancelButton.removeEventListener('click', hide);

    var classList = dialog.classList;
    dialog.addEventListener('transitionend', function hidden() {
      dialog.removeEventListener('transitionend', hidden);
      classList.remove('visible');
      if (typeof cb === 'function') {
        cb();
      }
    });

    classList.remove('show');
    window.dispatchEvent(new CustomEvent('contextmenuhidden'));
  }

  return {
    hide: hide,
    show: show,
    init: initialize
  };
}());
