
'use strict';

var Launcher = (function() {

  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  var back = document.getElementById('back-button');
  var forward = document.getElementById('forward-button');

  var footer = document.querySelector('#footer');
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
    addEventListener('mousedown', toggleButtonBar);

  document.getElementById('close-button').
    addEventListener('click', toggleButtonBar);

  var iframe = document.getElementById('app');

  var reload = document.getElementById('reload-button');
  reload.addEventListener('click', function doReload(evt) {
    clearButtonBarTimeout();
    iframe.reload(true);
  });

  function goBack(evt) {
    clearButtonBarTimeout();
    evt.stopPropagation();
    iframe.getCanGoBack().onsuccess = function(e) {
      if (e.target.result === true) {
        iframe.goBack();
      }
    }
  }

  function goForward(evt) {
    clearButtonBarTimeout();
    iframe.getCanGoForward().onsuccess = function(e) {
      if (e.target.result === true) {
        iframe.goForward();
      }
    }
  }

  var loading = document.getElementById('loading');

  iframe.addEventListener('mozbrowserloadstart', function mozBrowserStart() {
    loading.hidden = false;
  });

  iframe.addEventListener('mozbrowserloadend', function mozBrowserEnd() {
    loading.hidden = true;
  });

  var href = window.location.href;

  function getURL() {
    var regex = new RegExp('[\\?&]url=([^&#]*)');
    var results = regex.exec(href);
    return decodeURIComponent(results[1]);
  }

  function getOrigin() {
    var regex = new RegExp('[\\?&]origin=([^&#]*)');
    var results = regex.exec(href);
    return decodeURIComponent(results[1]);
  }

  function getName() {
    var regex = new RegExp('[\\?&]name=([^&#]*)');
    var ret = regex.exec(href);
    if (ret && ret.length > 0) {
      ret = decodeURI(ret[1]);
    }

    return ret;
  }

  function getIcon() {
    var regex = new RegExp('[\\?&]icon=([^&#]*)');
    var results = regex.exec(href);
    return decodeURI(results[1]);
  }

  iframe.src = getURL();
  setTimeout(toggleButtonBar, BUTTONBAR_INITIAL_OPEN_TIMEOUT);

  function locChange(evt) {
    iframe.getCanGoForward().onsuccess = function(e) {
      if (e.target.result === true) {
        delete forward.dataset.disabled;
        forward.addEventListener('click', goForward);
      } else {
        forward.dataset.disabled = true;
        forward.removeEventListener('click', goForward);
      }
    }

    iframe.getCanGoBack().onsuccess = function(e) {
      if (e.target.result === true) {
        delete back.dataset.disabled;
        back.addEventListener('click', goBack);
      } else {
        back.dataset.disabled = true;
        back.removeEventListener('click', goBack);
      }
    }
  }

  iframe.addEventListener('mozbrowserlocationchange', locChange);

  var name = getName();
  if (name) {
    var bookmarkButton = document.getElementById('bookmark-button');
    delete bookmarkButton.dataset.disabled;
    bookmarkButton.addEventListener('click', function doBookmark(evt) {
      clearButtonBarTimeout();
      var response = window.confirm('Bookmark ' + name + '?');
      if (!response) {
        return;
      }

      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: getOrigin(),
          name: name,
          icon: getIcon()
        }
      });
      bookmarkButton.dataset.disabled = true;
      bookmarkButton.removeEventListener('click', doBookmark);
    });
  }
}());
