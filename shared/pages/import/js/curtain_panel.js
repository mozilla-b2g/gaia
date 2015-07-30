'use strict';
/* global LazyLoader */
/* exported Curtain */

/*
 * XXX:The name it's quite confusing, but we are going to work in several
 * steps in order to split this 'panel' in a small set, in order to load
 * just the JS you need.
 *
 * 'Curtain' is a panel which let you to show 'progress', 'confirm'...
 * within the .html related with 'import', 'matching'...
 *
 * We are going to keep the name by now, but this must be revisited when
 * refactoring how all these .html work.
 * In order to keep backwards compatibility, let's keep the same interface
 * by now.
 */


var Curtain = (function() {

  var _ = navigator.mozL10n.get;

  var cancelButton, retryButton, okButton,
      progressElement, progressTitle;
  var cpuWakeLock;
  var messages = [];
  var elements = ['error', 'timeout', 'wait', 'message', 'progress', 'alert'];
  var _cancelCB = function foo() {};
  var _retryCB = function foo() {};
  var _okCB = function foo() {};

  var form;

  var panel = document.createElement('panel');
  panel.id = 'curtain';

  var link = document.createElement('link');
  link.setAttribute('rel', 'import');
  link.setAttribute('href', '/shared/pages/import/elements/curtain.html');

  function addListeners() {
    okButton.onclick = function on_ok(e) {
      delete okButton.onclick;
      _okCB();
      _okCB = null;
    };

    retryButton.onclick = function on_retry(e) {
      delete retryButton.onclick;
      _retryCB();
      _retryCB = null;
    };

    cancelButton.onclick = function on_cancel(e) {
      delete cancelButton.onclick;
      _cancelCB();
      _cancelCB = null;
    };
  }

  function cacheElements() {
    cancelButton = document.querySelector('#cancel');
    retryButton = document.querySelector('#retry');
    okButton = document.querySelector('#ok');

    progressElement = document.querySelector('#progressElement');

    elements.forEach(function createElementRef(name) {
      messages[name] = document.getElementById(name + 'Msg');
    });

    progressTitle = document.getElementById('progressTitle');
  }

  function init() {
    return new Promise(function(resolve, reject) {

      document.head.appendChild(link);

      panel.setAttribute('is', 'curtain');
      panel.className = 'fade-out';
      document.body.appendChild(panel);
      LazyLoader.load([
        document.getElementById('curtain')
      ], function() {
        cacheElements();
        addListeners();
        resolve();
      });
    });
  }

  function clean() {
    document.body.removeChild(panel);
    // Clean unnecessary dom elements:
    form = null;
    cancelButton = null;
    retryButton = null;
    okButton = null;
    progressElement = null;
    progressTitle = null;
  }

  function doShow(type) {
    if (!form) {
      form = panel.querySelector('form');
    }
    form.dataset.state = type;

    panel.classList.remove('no-menu');
    panel.classList.add('visible');
    panel.classList.remove('fade-out');
    panel.classList.add('fade-in');
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
      progressTitle.textContent = _('progressFB3' + from + 'Title');
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
      init().then(function() {
        var out;

        from = capitalize(from);

        switch (type) {
          case 'wait':
            messages[type].textContent = _(type + from);
          break;

          case 'timeout':
            messages[type].textContent = _('timeout1', {
              from: _('timeout' + from)
            });
          break;

          case 'error':
            messages[type].textContent = _('error1', {
              from: _(type + from)
            });
          break;

          case 'alert':
          case 'message':
            messages[type].textContent = _(type + from);
          break;

          case 'progress':
            progressTitle.textContent = _(type + 'FB3' + from + 'Title');
            out = new Progress(from);
            cpuWakeLock = navigator.requestWakeLock('cpu');
          break;
        }

        doShow(type);

        return out;
      });
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

      panel.classList.add('fade-out');
      panel.addEventListener('animationend', function cu_fadeOut(ev) {
        panel.removeEventListener('animationend', cu_fadeOut);
        delete form.dataset.state;
        clean();
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
        _cancelCB = cancelCb;
      } else {
        _cancelCB = function foo(){};
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
        _retryCB = retryCb;
      } else {
        _retryCB = function foo(){};
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
        _okCB = okCb;
      } else {
        _okCB = function foo(){};
      }
    },

    /**
     *  Returns the visibility state of the curtain
     *
     *  @return {boolean} visibility state.
     *
     */
    get visible() {
      return panel.classList.contains('visible');
    },

    /**
     *  Hides the menu
     */
    hideMenu: function c_hideMenu() {
      panel.classList.add('no-menu');
    }
  };

})();
