/* global LazyLoader, HtmlImports */

(function(exports) {
  'use strict';

  var counter = 0;
  var total = 0;
  var progressTextId;

  var overlay,
      statusContainer,
      progressActivity,
      progressTitle,
      progressElement,
      progressMsg,
      menu,
      cancelButton,
      _cancelCB,
      isAnimationPlaying = false,
      isShown = false;

  var overlayReady,
      _reject,
      isLoading = false;

  var link = document.createElement('link');
  link.setAttribute('rel', 'import');
  link.setAttribute('href', '/shared/elements/contacts/overlay.html');

  function cacheElements() {
    statusContainer = overlay.querySelector('p[role="status"]'),
    progressActivity = document.querySelector('#progress-activity'),
    progressTitle = document.querySelector('#progress-title'),
    progressElement = document.querySelector('#progress-element'),
    progressMsg = document.querySelector('#progress-msg'),
    menu = document.querySelector('#loading-overlay menu'),
    cancelButton = document.querySelector('#cancel-overlay');
  }

  function addListeners() {
    cancelButton.onclick = function on_cancel(evt) {
      evt.preventDefault();
      delete cancelButton.onclick;
      cancelButton.disabled = false;
      if (typeof _cancelCB === 'function') {
        _cancelCB();
      }
      _cancelCB = null;
    };
  }

  function removeListeners() {
    if (cancelButton) {
      delete cancelButton.onclick;
    }
  }

  function reset() {
    overlay = null;
    overlayReady = null;
    _reject = null;
    isLoading = false;
    counter = 0;
    total = 0;
  }

  function deleteOverlay() {
    document.head.removeChild(link);
    document.body.removeChild(overlay);
    reset();
    removeListeners();
  }

  function populatePanel() {
    overlay = document.createElement('form');
    overlay.setAttribute('is', 'confirm-form');
    overlay.setAttribute('data-type', 'confirm');
    overlay.setAttribute('id', 'loading-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.className = 'hide no-opacity';
    document.head.appendChild(link);
    document.body.appendChild(overlay);
  }

  function init() {
    if (overlayReady) {
      return overlayReady;
    }

    // To prevent operation over the elements when they're still being loaded
    overlayReady = new Promise(function(resolve, reject) {
      isLoading = true;
      _reject = reject;
      populatePanel();
      LazyLoader.load([
        '/shared/js/html_imports.js'
      ], function() {
        HtmlImports.populate(function() {
          cacheElements();
          progressElement.setAttribute('value', 0);
          addListeners();
          isLoading = false;
          resolve();
        });
      });
    });

    return overlayReady;
  }

  function showMessage() {
    init().then(function() {
      navigator.mozL10n.setAttributes(progressMsg,
                                      progressTextId,
                                      { current: counter, total: total }
      );
    });
  }

  function setAsProgress() {
    statusContainer.classList.remove('loading-icon');
    progressElement.setAttribute('max', '100');
    progressElement.setAttribute('value', '0');
  }

  /**
   * Updates progress bar and message. It takes an optional `value` parameter
   * to overwrite the internal counter with this value.
   * @param {Number} value Overrides internal counter.
   */
  function updateProgressBar(value) {
    overlayReady && overlayReady.then(function() {
      if (value && value <= total && value >= counter) {
        counter = value;
      } else {
        counter++;
      }
      progressElement.setAttribute('value',
        ((counter * 100) / total).toFixed()); // Percent fraction is not needed.
      showMessage();
    });
  }

  function updateHeaderMsg(headerMsgId) {
    progressTitle.setAttribute('data-l10n-id', headerMsgId);
  }

  function setTotal(pTotal) {
    total = pTotal;
    showMessage();
  }

  function _show(messageId) {
    progressActivity.classList.remove('hide');
    if (typeof messageId === 'string') {
      updateHeaderMsg(messageId);
    } else {
      navigator.mozL10n.setAttributes(progressTitle,
                                      messageId.id,
                                      messageId.args);
    }
    progressMsg.textContent = null;
    progressMsg.removeAttribute('data-l10n-id');
    if (isShown) {
      return;
    }
    overlay.classList.remove('hide');
    overlay.classList.remove('fade-out');
    overlay.classList.add('fade-in');
    isAnimationPlaying = true;
    // Custom event that can be used to apply (screen reader) visibility
    // changes.
    window.dispatchEvent(new CustomEvent('loadingoverlayshowing'));
    overlay.addEventListener('animationend', function ov_onFadeIn(ev) {
      isAnimationPlaying = false;
      overlay.removeEventListener('animationend', ov_onFadeIn);
      overlay.classList.remove('no-opacity');
      isShown = true;
      window.dispatchEvent(new CustomEvent('overlayshown'));
    });
  }

  function show(messageId) {
    if (isShown) {
      updateHeaderMsg(messageId);
      return;
    }

    if (!isAnimationPlaying) {
      _show(messageId);
    }
    overlay.addEventListener('animationend',
      function ov_showWhenFinished(ev) {
        overlay.removeEventListener('animationend', ov_showWhenFinished);
        _show(messageId);
      }
    );
  }

  function _hide() {
    if (!isShown) {
      return;
    }
    overlay.classList.remove('fade-in');
    overlay.classList.add('fade-out');
    isAnimationPlaying = true;
    // Custom event that can be used to apply (screen reader) visibility
    // changes.
    window.dispatchEvent(new CustomEvent('loadingoverlayhiding'));
    overlay.addEventListener('animationend', function ov_onFadeOut(ev) {
      isAnimationPlaying = false;
      overlay.removeEventListener('animationend', ov_onFadeOut);
      progressActivity.classList.add('hide');
      overlay.classList.add('no-opacity');
      overlay.classList.add('hide');
      isShown = false;
      window.dispatchEvent(new CustomEvent('overlayhidden'));
      deleteOverlay();
    });
  }

  function hide() {
    // Avoid showing the overlay if it's not necessary
    if (isLoading) {
      _reject();
      return;
    }

    if (!isAnimationPlaying) {
      _hide();
      return;
    }
    overlay.addEventListener('animationend',
      function ov_hideWhenFinished(ev) {
        if (overlay) {
          overlay.removeEventListener('animationend', ov_hideWhenFinished);
          _hide();
        }
      }
    );
  }

  function showProgressBar(messageId, total, progressMsgId) {
    init().then(function() {
      progressTextId = progressMsgId || 'genericProgress';
      progressElement.classList.remove('pack-activity');
      menu.classList.add('showed');
      setTotal(total);
      setAsProgress();
      show(messageId);
    }).catch(function() {
      deleteOverlay();
    });
  }

  function showActivityBar(messageId, noMenu) {
    init().then(function() {
      progressElement.classList.add('pack-activity');
      progressMsg.removeAttribute('data-l10n-id');
      menu.classList.toggle('showed', !noMenu);
      setAsProgress();
      show(messageId);
    }).catch(function() {
      deleteOverlay();
    });
  }

  function showSpinner(messageId) {
    init().then(function() {
      progressMsg.removeAttribute('data-l10n-id');
      progressElement.classList.remove('pack-activity');
      statusContainer.classList.add('loading-icon');
      progressElement.removeAttribute('max');
      progressElement.removeAttribute('value');
      menu.classList.remove('showed');
      show(messageId);
    }).catch(function() {
      deleteOverlay();
    });
  }

  exports.Overlay = {
    'showProgressBar': showProgressBar,
    'showSpinner': showSpinner,
    'showActivityBar': showActivityBar,
    'hide': hide,
    'updateProgressBar': updateProgressBar,
    set oncancel(cancelCb) {
      if (typeof cancelCb === 'function') {
        _cancelCB = cancelCb;
      } else {
        _cancelCB = function foo() {};
      }
    }
  };
})(window);
