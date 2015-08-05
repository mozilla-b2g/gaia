/* global LazyLoader, HtmlImports */
'use strict';

var utils = window.utils || {};
(function() {
  utils.overlay = {};

  var overlay,
      statusContainer,
      progressActivity,
      progressTitle,
      progressElement,
      progressMsg,
      menu,
      cancelButton,
      _cancelCB;

  var link = document.createElement('link');
  link.setAttribute('rel', 'import');
  link.setAttribute('href', '/contacts/elements/overlay.html');

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
    cancelButton.onclick = function on_cancel() {
      delete cancelButton.onclick;
      cancelButton.disabled = false;
      _cancelCB();
      _cancelCB = null;
    };
  }

  function init() {
    return new Promise(function(resolve, reject) {
      overlay = document.createElement('form');
      overlay.setAttribute('is', 'confirm-form');
      overlay.setAttribute('data-type', 'confirm');
      overlay.setAttribute('id', 'loading-overlay');
      overlay.setAttribute('role', 'dialog');
      overlay.className = 'hide no-opacity';
      document.head.appendChild(link);
      document.body.appendChild(overlay);
      LazyLoader.load([
        '/shared/js/html_imports.js'
      ], function() {
        HtmlImports.populate(function() {
          cacheElements();
          addListeners();
          resolve();
        });
      });
    });
  }

  function removeOverlay() {

    document.head.removeChild(link);
    document.body.removeChild(overlay);
    overlay = null;
    delete cancelButton.onclick;
  }

  // Constructor for the progress element
  function ProgressBar(pMsgId, pClass) {
    var counter = 0;
    var total = 0;
    var progressTextId = pMsgId || 'genericProgress';
    var clazz = pClass;

    function showMessage() {
      navigator.mozL10n.setAttributes(progressMsg,
                                      progressTextId,
                                      { current: counter, total: total }
      );
    }

    /**
     * Updates progress bar and message. It takes an optional `value` parameter
     * to overwrite the internal counter with this value.
     * @param {Number} value Overrides internal counter.
     */
    this.update = function(value) {
      if (value && value <= total && value >= counter) {
        counter = value;
      } else {
        counter++;
      }
      progressElement.setAttribute('value',
        ((counter * 100) / total).toFixed()); // Percent fraction is not needed.
      showMessage();
    };

    this.setTotal = function(ptotal) {
      total = ptotal;
    };

    this.setClass = function(clazzName) {
      setClass(clazzName);
      clazz = clazzName;
      // To refresh the message according to the new clazzName
      if (clazzName === 'activityBar' || clazzName === 'spinner') {
        progressMsg.removeAttribute('data-l10n-id');
      }
    };

    this.setHeaderMsg = function(headerMsgId) {
      progressTitle.setAttribute('data-l10n-id', headerMsgId);
    };
  } // ProgressBar

  utils.overlay.isAnimationPlaying = false;
  utils.overlay.isShown = false;
  utils.overlay._show = function _show(messageId, progressClass, textId) {
    progressActivity.classList.remove('hide');
    if (typeof messageId === 'string') {
      progressTitle.setAttribute('data-l10n-id', messageId);
    } else {
      navigator.mozL10n.setAttributes(progressTitle,
                                      messageId.id,
                                      messageId.args);
    }
    progressMsg.textContent = null;
    progressMsg.removeAttribute('data-l10n-id');
    if (utils.overlay.isShown) {
      return;
    }
    overlay.classList.remove('hide');
    overlay.classList.remove('fade-out');
    overlay.classList.add('fade-in');
    utils.overlay.isAnimationPlaying = true;
    // Custom event that can be used to apply (screen reader) visibility
    // changes.
    window.dispatchEvent(new CustomEvent('loadingoverlayshowing'));
    overlay.addEventListener('animationend', function ov_onFadeIn(ev) {
      utils.overlay.isAnimationPlaying = false;
      overlay.removeEventListener('animationend', ov_onFadeIn);
      overlay.classList.remove('no-opacity');
      utils.overlay.isShown = true;
      window.dispatchEvent(new CustomEvent('overlayshown'));
    });
  };

  utils.overlay.show = function show(messageId, progressClass, textId,
    isMenuActive) {
    var out;
    out = new ProgressBar(textId, progressClass);
    init().then(function() {
      progressElement.setAttribute('value', 0);
      // In the case of an spinner this object will not be really used
      setClass(progressClass);
      menu.classList.toggle('showed', isMenuActive);
      if (!utils.overlay.isAnimationPlaying) {
        utils.overlay._show(messageId, progressClass, textId);
        return out;
      }
      overlay.addEventListener('animationend',
        function ov_showWhenFinished(ev) {
          overlay.removeEventListener('animationend', ov_showWhenFinished);
          utils.overlay._show(messageId, progressClass, textId);
        }
      );
    });
  
    return out;
  };

  utils.overlay.hideMenu = function hideMenu() {
    menu.classList.remove('showed');
  };

  Object.defineProperty(utils.overlay, 'oncancel', {
    set: function(cancelCb) {
      if (typeof cancelCb === 'function') {
        _cancelCB = cancelCb;
      } else {
        _cancelCB = function foo(){};
      }
    }
  });

  function setAsProgress() {
    statusContainer.classList.remove('loading-icon');
    progressElement.setAttribute('max', '100');
    progressElement.setAttribute('value', '0');
  }

  function setClass(clazzName) {
    switch (clazzName) {
      case 'spinner':
        progressElement.classList.remove('pack-activity');
        statusContainer.classList.add('loading-icon');
        progressElement.removeAttribute('max');
        progressElement.removeAttribute('value');
      break;
      case 'activityBar':
      case 'progressActivity':
        progressElement.classList.add('pack-activity');
        setAsProgress();
      break;
      case 'progressBar':
        progressElement.classList.remove('pack-activity');
        setAsProgress();
      break;
    }
  }

  utils.overlay._hide = function ov__hide() {
    console.info(new Error().stack);
    if (!utils.overlay.isShown) {
      return;
    }
    overlay.classList.remove('fade-in');
    overlay.classList.add('fade-out');
    utils.overlay.isAnimationPlaying = true;
    // Custom event that can be used to apply (screen reader) visibility
    // changes.
    window.dispatchEvent(new CustomEvent('loadingoverlayhiding'));
    overlay.addEventListener('animationend', function ov_onFadeOut(ev) {
      utils.overlay.isAnimationPlaying = false;
      overlay.removeEventListener('animationend', ov_onFadeOut);
      progressActivity.classList.add('hide');
      overlay.classList.add('no-opacity');
      overlay.classList.add('hide');
      utils.overlay.isShown = false;
      window.dispatchEvent(new CustomEvent('overlayhidden'));
      removeOverlay();
    });
  };
  utils.overlay.hide = function ov_hide() {
    if (!utils.overlay.isAnimationPlaying) {
      utils.overlay._hide();
      return;
    }
    overlay.addEventListener('animationend',
      function ov_hideWhenFinished(ev) {
        overlay.removeEventListener('animationend', ov_hideWhenFinished);
        utils.overlay._hide();
      }
    );
  };
})();
