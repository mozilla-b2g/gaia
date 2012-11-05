'use strict';

var Curtain = (function() {

  var _ = navigator.mozL10n.get;

  var curtainFrame = parent.document.querySelector('#fb-curtain');
  var doc = curtainFrame.contentDocument;
  var cancelButton = doc.querySelector('#cancel');
  var retryButton = doc.querySelector('#retry');

  var progressElement = doc.querySelector('#progressElement');
  var progressLabel = doc.querySelector('#progressLabel');

  function setProgressUI(value) {
    progressLabel.textContent = value + '%';
    progressElement.setAttribute('value', value);
  }

  var form = doc.querySelector('form');

  var messages = [];
  var elements = ['error', 'timeout', 'wait', 'message', 'progress'];
  elements.forEach(function createElementRef(name) {
    messages[name] = doc.getElementById(name + 'Msg');
  });

  function doShow(type) {
    form.dataset.state = type;
    curtainFrame.classList.add('visible');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function Progress() {
    this.update = function(value) {
      setProgressUI(value);
    }
  }

  var progressObj = new Progress();

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
          messages[type].textContent = _(type + from);
          setProgressUI(0);
          out = progressObj;
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
      delete form.dataset.state;
      curtainFrame.classList.remove('visible');
      curtainFrame.addEventListener('transitionend', function tend() {
        curtainFrame.removeEventListener('transitionend', tend);
        if (typeof hiddenCB === 'function') {
          window.setTimeout(hiddenCB, 0);
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
