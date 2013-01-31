/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Launcher = (function() {
  function log(str) {
    dump(' -+- Launcher -+-: ' + str + '\n');
  }

  function currentAppFrame() {
    return WindowManager.getAppFrame(WindowManager.getDisplayedApp());
  }


  function currentAppIframe() {
    return currentAppFrame().firstChild;
  }

  var _ = navigator.mozL10n.get;

  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  var footer = document.querySelector('#wrapper-footer');
  window.addEventListener('appopen', function onAppOpen(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      window.addEventListener('mozbrowserlocationchange', onLocationChange);
      onLocationChange();
      onDisplayedApplicationChange();
    }
  });

  window.addEventListener('appwillclose', function onAppClose(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      window.removeEventListener('mozbrowserlocationchange', onLocationChange);
      clearTimeout(buttonBarTimeout);
      footer.classList.add('closed');
      isButtonBarDisplayed = false;
    }
  });

  window.addEventListener('keyboardchange', function onKeyboardChange(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      if (footer.classList.contains('visible')) {
        footer.classList.remove('visible');
      }
    }
  });

  window.addEventListener('keyboardhide', function onKeyboardChange(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      if (!footer.classList.contains('visible')) {
        footer.classList.add('visible');
      }
    }
  });

  var buttonBarTimeout;

  var isButtonBarDisplayed = false;
  function toggleButtonBar(time) {
    clearTimeout(buttonBarTimeout);
    footer.classList.toggle('closed');
    isButtonBarDisplayed = !isButtonBarDisplayed;
    if (isButtonBarDisplayed) {
      buttonBarTimeout = setTimeout(toggleButtonBar, time || BUTTONBAR_TIMEOUT);
    }
  }

  function clearButtonBarTimeout() {
    clearTimeout(buttonBarTimeout);
    buttonBarTimeout = setTimeout(toggleButtonBar, BUTTONBAR_TIMEOUT);
  }

  document.getElementById('handler').
    addEventListener('mousedown', function open() { toggleButtonBar() });

  document.getElementById('close-button').
    addEventListener('mousedown', function close() { toggleButtonBar() });

  var reload = document.getElementById('reload-button');
  reload.addEventListener('click', function doReload(evt) {
    clearButtonBarTimeout();
    currentAppIframe().reload(true);
  });

  var back = document.getElementById('back-button');
  back.addEventListener('click', function goBack() {
    clearButtonBarTimeout();
    currentAppIframe().goBack();
  });

  var forward = document.getElementById('forward-button');
  forward.addEventListener('click', function goForward() {
    clearButtonBarTimeout();
    currentAppIframe().goForward();
  });

  function onLocationChange() {
    currentAppIframe().getCanGoForward().onsuccess = function forwardSuccess(e) {
      if (e.target.result === true) {
        delete forward.dataset.disabled;
      } else {
        forward.dataset.disabled = true;
      }
    }

    currentAppIframe().getCanGoBack().onsuccess = function backSuccess(e) {
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
    toggleButtonBar(BUTTONBAR_INITIAL_OPEN_TIMEOUT);

    var dataset = currentAppIframe().dataset;
    if (dataset.originURL || dataset.searchURL) {
      delete bookmarkButton.dataset.disabled;
      return;
    }

    bookmarkButton.dataset.disabled = true;
  }

  bookmarkButton.addEventListener('click', function doBookmark(evt) {
    if (bookmarkButton.dataset.disabled)
      return;

    clearButtonBarTimeout();
    var dataset = currentAppIframe().dataset;

    function selected(value) {
      if (!value)
        return;

      var name, url;
      if (value === 'origin') {
        name = dataset.originName;
        url = dataset.originURL;
      }

      if (value === 'search') {
        name = dataset.searchName;
        url = dataset.searchURL;
      }

      var activity = new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: url,
          name: name,
          icon: dataset.icon,
          useAsyncPanZoom: dataset.useAsyncPanZoom,
          iconable: false
        }
      });

      activity.onsuccess = function onsuccess() {
        if (value === 'origin') {
          delete currentAppIframe().dataset.originURL;
        }

        if (value === 'search') {
          delete currentAppIframe().dataset.searchURL;
        }

        if (!currentAppIframe().dataset.originURL &&
          !currentAppIframe().dataset.searchURL) {
          bookmarkButton.dataset.disabled = true;
        }
      }
    }

    var data = {
      title: _('add-to-home-screen'),
      options: []
    };

    if (dataset.originURL) {
      data.options.push({ id: 'origin', text: dataset.originName });
    }

    if (dataset.searchURL) {
      data.options.push({ id: 'search', text: dataset.searchName });
    }

    ModalDialog.selectOne(data, selected);
  });
}());
