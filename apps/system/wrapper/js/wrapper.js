
'use strict';

var Launcher = (function() {

  window.asyncStorage.getItem('adv_displayed', function callGetItem(value) {
    var adv = document.getElementById('advertisement');

    if (value) {
      adv.parentNode.removeChild(adv);
      return;
    }

    adv.hidden = false;
    setTimeout(function removeAdvertisement() {
      adv.parentNode.removeChild(adv);
      window.asyncStorage.setItem('adv_displayed', true);
    }, 5000);
  });

  var back = document.getElementById('back-button');
  var forward = document.getElementById('forward-button');

  var toolbar = document.getElementById('toolbar');
  var toolbarTimeout;

  var isToolbarDisplayed = false;
  function toggleToolbar(evt) {
    clearTimeout(toolbarTimeout);
    toolbar.classList.toggle('hidden');
    isToolbarDisplayed = !isToolbarDisplayed;
    if (isToolbarDisplayed) {
      toolbarTimeout = setTimeout(toggleToolbar, 3000);
    }
  }

  toolbar.addEventListener('mousedown', toggleToolbar);

  var iframe = document.getElementById('app');

  var reload = document.getElementById('reload-button');
  reload.addEventListener('mousedown', function toggle(evt) {
    iframe.reload(true);
  });

  function goBack(evt) {
    evt.stopPropagation();
    iframe.getCanGoBack().onsuccess = function(e) {
      if (e.target.result === true) {
        iframe.goBack();
      }
    }
  }

  function goForward(evt) {
    evt.stopPropagation();
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
    return decodeURI(results[1]);
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

  var url = iframe.src = getURL();

  function locChange(evt) {
    iframe.getCanGoForward().onsuccess = function(e) {
      if (e.target.result === true) {
        delete forward.dataset.disabled;
        forward.addEventListener('mousedown', goForward);
      } else {
        forward.dataset.disabled = true;
        forward.removeEventListener('mousedown', goForward);
      }
    }

    iframe.getCanGoBack().onsuccess = function(e) {
      if (e.target.result === true) {
        delete back.dataset.disabled;
        back.addEventListener('mousedown', goBack);
      } else {
        back.dataset.disabled = true;
        back.removeEventListener('mousedown', goBack);
      }
    }
  }

  iframe.addEventListener('mozbrowserlocationchange', locChange);

  var name = getName();
  if (name) {
    var bookmarkButton = document.getElementById('bookmark-button');
    bookmarkButton.classList.remove('hidden');
    bookmarkButton.addEventListener('mousedown', function doBookmark(evt) {
      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: url,
          name: name,
          icon: getIcon()
        }
      });
      bookmarkButton.classList.add('hidden');
    });
  }
}());
