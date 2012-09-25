
'use strict';

var Launcher = (function() {
  function log(str) {
    dump(' -+- Launcher -+-: ' + str + '\n');
  }

  function currentAppFrame() {
    return WindowManager.getCurrentDisplayedApp().frame;
  }

  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  var footer = document.querySelector('#wrapper');
  window.addEventListener('appopen', function onAppOpen(e) {
    if ('wrapper' in e.target.dataset) {
      window.addEventListener('mozbrowserlocationchange', onLocationChange);
      onLocationChange();
      footer.classList.add('visible');
      onDisplayedApplicationChange();
    }
  });

  window.addEventListener('appwillclose', function onAppClose(e) {
    if ('wrapper' in e.target.dataset) {
      window.removeEventListener('mozbrowserlocationchange', onLocationChange);
      footer.classList.remove('visible');
    }
  });

  window.addEventListener('keyboardchange', function onKeyboardChange(e) {
    if('wrapper' in currentAppFrame().dataset) {
      if (footer.classList.contains('visible')) {
        footer.classList.remove('visible');
      }
    }
  });

  window.addEventListener('keyboardhide', function onKeyboardChange(e) {
    if('wrapper' in currentAppFrame().dataset) {
      if (!footer.classList.contains('visible')) {
        footer.classList.add('visible');
      }
    }
  });

  var buttonBarTimeout;

  var isButtonBarDisplayed = true;
  function toggleButtonBar() {
    clearTimeout(buttonBarTimeout);
    footer.classList.toggle('closed');
    isButtonBarDisplayed = !isButtonBarDisplayed;
    if (isButtonBarDisplayed) {
      buttonBarTimeout = setTimeout(toggleButtonBar, BUTTONBAR_TIMEOUT);
    }
  }

  function clearButtonBarTimeout() {
    clearTimeout(buttonBarTimeout);
    buttonBarTimeout = setTimeout(toggleButtonBar, BUTTONBAR_TIMEOUT);
  }

  document.getElementById('handler').
    addEventListener('click', toggleButtonBar);

  document.getElementById('close-button').
    addEventListener('click', toggleButtonBar);

  var reload = document.getElementById('reload-button');
  reload.addEventListener('click', function doReload(evt) {
    clearButtonBarTimeout();
    currentAppFrame().reload(true);
  });

  var back = document.getElementById('back-button');
  back.addEventListener('click', function goBack() {
    clearButtonBarTimeout();
    currentAppFrame().goBack();
  });

  var forward = document.getElementById('forward-button');
  forward.addEventListener('click', function goForward() {
    clearButtonBarTimeout();
    currentAppFrame().goForward();
  });

  function onLocationChange() {
    currentAppFrame().getCanGoForward().onsuccess = function forwardSuccess(e) {
      if (e.target.result === true) {
        delete forward.dataset.disabled;
      } else {
        forward.dataset.disabled = true;
      }
    }

    currentAppFrame().getCanGoBack().onsuccess = function backSuccess(e) {
      if (e.target.result === true) {
        delete back.dataset.disabled;
      } else {
        back.dataset.disabled = true;
      }
    }
  }

  window.addEventListener('mozbrowserlocationchange', onLocationChange);

  var bookmarkButton = document.getElementById('bookmark-button');
  function onDisplayedApplicationChange() {
    setTimeout(toggleButtonBar, BUTTONBAR_INITIAL_OPEN_TIMEOUT);

    var name = currentAppFrame().dataset.name;
    if (name) {
      bookmarkButton.dataset.disabled = true;
      return;
    }
    delete bookmarkButton.dataset.disabled;
  }

  bookmarkButton.addEventListener('click', function doBookmark(evt) {
    if (bookmarkButton.dataset.disabled)
      return;

    clearButtonBarTimeout();

    var dataset = currentAppFrame().dataset;
    function confirm(value) {
      if (!value)
        return;

      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: dataset.frameOrigin,
          name: dataset.name,
          icon: dataset.icon
        }
      });
    }
    ModalDialog.confirm('Bookmark ' + dataset.name + '?', confirm);
  });
}());
