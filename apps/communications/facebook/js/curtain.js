'use strict';

var Curtain = (function() {

  var _ = navigator.mozL10n.get;

  var curtainFrame = parent.document.querySelector('#fb-curtain');
  var doc = curtainFrame.contentDocument;
  var cancelButton = doc.querySelector('#cancel');
  var retryButton = doc.querySelector('#retry');

  var progressElement = doc.querySelector('#progressElement');

  var form = doc.querySelector('form');

  var messages = [];
  var elements = ['error', 'timeout', 'wait', 'message', 'progress'];
  elements.forEach(function createElementRef(name) {
    messages[name] = doc.getElementById(name + 'Msg');
  });

  var progressTitle = doc.getElementById('progressTitle');

  var cpuWakeLock;

  function doShow(type) {
    form.dataset.state = type;
    curtainFrame.classList.add('visible');
    curtainFrame.classList.remove('fadeOut');
    curtainFrame.classList.add('fadeIn');
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
      messages['progress'].textContent = _('progressFB', {
        current: counter,
        total: total
      });
    }

    this.update = function() {
      progressElement.setAttribute('value', (++counter * 100) / total);
      showMessage();
    };

    this.setFrom = function(pfrom) {
      from = capitalize(pfrom);
      progressTitle.textContent = _('progressFB3' + from + 'Title');
    }

    this.setTotal = function(ptotal) {
      total = ptotal;
      showMessage();
    }
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

      delete form.dataset.state;
      curtainFrame.classList.remove('fadeIn');
      curtainFrame.classList.add('fadeOut');
      curtainFrame.addEventListener('animationend', function cu_fadeOut(ev) {
        curtainFrame.removeEventListener('animationend', cu_fadeOut);
        curtainFrame.classList.remove('visible');
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
     *  Returns the visibility state of the curtain
     *
     *  @return {boolean} visibility state.
     *
     */
    get visible() {
      return curtainFrame.classList.contains('visible');
    }
  };

})();
