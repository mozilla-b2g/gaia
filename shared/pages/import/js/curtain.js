'use strict';

/* exported Curtain */

/*
 * XXX: This is a class to load an <iframe> for loading the
 * curtain. This **MUST** be deprecated when [1] will be ready.
 * We need to get rid of all complexity passing messages, and reduce
 * the memory consumption in the apps.
 *
 * [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1183561
 */

var Curtain = (function() {

  var curtainFrame = parent.document.querySelector('#iframe_curtain');

  if (!curtainFrame) {
    curtainFrame = document.createElement('iframe');
    curtainFrame.id = 'iframe_curtain';
    curtainFrame.src = '/shared/pages/import/curtain.html';
    parent.document.body.appendChild(curtainFrame);
  }

  function getDoc() {
    return curtainFrame.contentWindow.document;
  }

  var cpuWakeLock, cancelButton, retryButton, okButton, progressElement, form,
      progressTitle;
  var messages = [];
  var elements = ['error', 'timeout', 'wait', 'message', 'progress', 'alert'];

  if (getDoc().readyState === 'complete') {
    init();
  } else {
    // The curtain could not be loaded at this moment
    curtainFrame.addEventListener('load', function loaded() {
      curtainFrame.removeEventListener('load', loaded);
      init();
    });
  }

  function init() {
    var doc = getDoc();
    cancelButton = doc.querySelector('#cancel');
    retryButton = doc.querySelector('#retry');
    okButton = doc.querySelector('#ok');

    progressElement = doc.querySelector('#progressElement');

    form = doc.querySelector('form');

    elements.forEach(function createElementRef(name) {
      messages[name] = doc.getElementById(name + 'Msg');
    });

    progressTitle = doc.getElementById('progressTitle');
  }

  function doShow(type) {
    form.classList.remove('no-menu');
    form.dataset.state = type;
    curtainFrame.classList.add('visible');
    curtainFrame.classList.remove('fade-out');
    curtainFrame.classList.add('fade-in');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function Progress(pfrom) {
    var from = pfrom;
    var counter = 0;
    var total = 0;

    progressElement.setAttribute('value', 0);

    function showMessage() {
      navigator.mozL10n.setAttributes(
        messages.progress,
        'progressFB',
        { current: counter, total: total }
      );
    }

    this.update = function() {
      progressElement.setAttribute('value', (++counter * 100) / total);
      showMessage();
    };

    this.setFrom = function(pfrom) {
      from = capitalize(pfrom);
      progressTitle.setAttribute(
        'data-l10n-id', 'progressFB3' + from + 'Title');
    };

    this.setTotal = function(ptotal) {
      total = ptotal;
      showMessage();
    };

    /**
     *  Returns the current value
     */
    this.getValue = function() {
      return counter;
    };
  }

  return {

    /**
     *  Shows the curtain
     *
     *  @param {String} type
     *    Curtain type oneOf('wait', 'timeout', 'error',
     *    'message' and 'progress').
     *
     *  @param {String} from
     *    The origin of the message.
     *
     *  @return {Object} progress. When 'type' === 'progress' .
     *  This object defines an <update> method to refresh the progress bar UI.
     *
     */
    show: function(type, from) {
      var out;

      from = capitalize(from);

      switch (type) {
        case 'wait':
          messages[type].setAttribute('data-l10n-id', type + from);
        break;

        case 'timeout':
          navigator.mozL10n.formatValue('timeout' + from).then((from) => {
            navigator.mozL10n.setAttributes(messages[type], 'timeout1', {
              from: from
            });
          });
        break;

        case 'error':
          navigator.mozL10n.formatValue('type' + from).then((from) => {
            navigator.mozL10n.setAttributes(messages[type], 'error1', {
              from: from
            });
          });
        break;

        case 'alert':
        case 'message':
          messages[type].setAttribute('data-l10n-id', type + from);
        break;

        case 'progress':
          progressTitle.setAttribute('data-l10n-id',
            type + 'FB3' + from + 'Title');
          out = new Progress(from);
          cpuWakeLock = navigator.requestWakeLock('cpu');
        break;
      }

      doShow(type);

      return out;
    },

    /**
     *  Hides the curtain
     *
     *  @param {Function} hiddenCB
     *    triggered when the curtain has been hidden.
     *
     */
    hide: function c_hide(hiddenCB) {
      if (cpuWakeLock) {
        cpuWakeLock.unlock();
        cpuWakeLock = null;
      }

      curtainFrame.classList.add('fade-out');
      curtainFrame.addEventListener('animationend', function cu_fadeOut(ev) {
        curtainFrame.removeEventListener('animationend', cu_fadeOut);
        curtainFrame.classList.remove('visible');
        curtainFrame.classList.remove('fade-out');
        curtainFrame.classList.remove('fade-in');
        delete form.dataset.state;
        if (typeof hiddenCB === 'function') {
          hiddenCB();
        }
      });
    },

    /**
     *  Allows to set a event handler that will be invoked when the user
     *  cancels the operation ongoing
     *
     *  @param {Function} cancelCb . Event handler.
     *
     */
    set oncancel(cancelCb) {
      if (typeof cancelCb === 'function') {
        cancelButton.onclick = function on_cancel(e) {
          delete cancelButton.onclick;
          cancelCb();
          return false;
        };
      }
    },

    /**
     *  Allows to set a event handler that will be invoked when the user
     *  retries the operation ongoing
     *
     *  @param {Function} retryCb . Event handler.
     *
     */
    set onretry(retryCb) {
      if (typeof retryCb === 'function') {
        retryButton.onclick = function on_retry(e) {
          delete retryButton.onclick;
          retryCb();
          return false;
        };
      }
    },

    /**
     *  Allows to set a event handler that will be invoked when the user
     *  clicks on ok button
     *
     *  @param {Function} okCb . Event handler.
     *
     */
    set onok(okCb) {
      if (typeof okCb === 'function') {
        okButton.onclick = function on_ok(e) {
          delete okButton.onclick;
          okCb();
          return false;
        };
      }
    },

    /**
     *  Returns the visibility state of the curtain
     *
     *  @return {boolean} visibility state.
     *
     */
    get visible() {
      return curtainFrame.classList.contains('visible');
    },

    /**
     *  Hides the menu
     */
    hideMenu: function c_hideMenu() {
      form.classList.add('no-menu');
    }
  };

})();
