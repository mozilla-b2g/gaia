'use strict';

var utils = this.utils || {};
(function() {
  utils.overlay = {};

  var overlay = document.querySelector('#loading-overlay'),
      statusContainer = overlay.querySelector('p[role="status"]'),
      progressActivity = document.querySelector('#progress-activity'),
      progressTitle = document.querySelector('#progress-title'),
      progressElement = document.querySelector('#progress-element'),
      progressMsg = document.querySelector('#progress-msg');

  // Constructor for the progress element
  function ProgressBar(pMsgId, pClass) {
    var counter = 0;
    var total = 0;
    var progressTextId = pMsgId || 'genericProgress';
    var clazz = pClass;

    progressElement.setAttribute('value', 0);

    function showMessage() {
      progressMsg.textContent = _(progressTextId, {
        current: counter,
        total: total
      });
    }

    this.update = function() {
      progressElement.setAttribute('value', (++counter * 100) / total);
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
        progressMsg.textContent = null;
      }
    };

    this.setHeaderMsg = function(headerMsg) {
      progressTitle.textContent = headerMsg;
    };
  } // ProgressBar

  utils.overlay.isAnimationPlaying = false;
  utils.overlay.isShown = false;
  utils.overlay._show = function _show(message, progressClass, textId) {
    progressActivity.classList.remove('hide');
    progressTitle.textContent = message;
    progressMsg.textContent = null;
    if (utils.overlay.isShown) {
      return;
    }
    overlay.classList.remove('hide');
    overlay.classList.remove('fadeOut');
    overlay.classList.add('fadeIn');
    utils.overlay.isAnimationPlaying = true;
    overlay.addEventListener('animationend', function ov_onFadeIn(ev) {
      utils.overlay.isAnimationPlaying = false;
      overlay.removeEventListener('animationend', ov_onFadeIn);
      overlay.classList.remove('no-opacity');
      utils.overlay.isShown = true;
    });
  };

  utils.overlay.show = function show(message, progressClass, textId) {
    var out;
    // In the case of an spinner this object will not be really used
    out = new ProgressBar(textId, progressClass);
    setClass(progressClass);
    if (!utils.overlay.isAnimationPlaying) {
      utils.overlay._show(message, progressClass, textId);
      return out;
    }
    overlay.addEventListener('animationend',
      function ov_showWhenFinished(ev) {
        overlay.removeEventListener('animationend', ov_showWhenFinished);
        utils.overlay._show(message, progressClass, textId);
      }
    );
    return out;
  };

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
    if (!utils.overlay.isShown) {
      return;
    }
    overlay.classList.remove('fadeIn');
    overlay.classList.add('fadeOut');
    utils.overlay.isAnimationPlaying = true;
    overlay.addEventListener('animationend', function ov_onFadeOut(ev) {
      utils.overlay.isAnimationPlaying = false;
      overlay.removeEventListener('animationend', ov_onFadeOut);
      progressActivity.classList.add('hide');
      overlay.classList.add('no-opacity');
      overlay.classList.add('hide');
      utils.overlay.isShown = false;
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
