/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global HtmlHelper, FxaModule, FxaModuleManager, FxaModuleNavigation,
   LazyLoader, KeyEvent */
/* exported FxaModuleUI */

'use strict';

const OFFLINE_TIMEOUT = 30 * 1000;

var FxaModuleUI = {
  maxSteps: null,
  init: function(flow) {
    // Add listeners to the main elements
    HtmlHelper.importElements(this,
      'fxa-module-header',
      'fxa-module-back',
      'fxa-module-next',
      'fxa-module-navigation',
      'fxa-module-done',
      'fxa-progress'
    );

    this.fxaModuleHeader.addEventListener('action', function() {
      FxaModuleManager.close('DIALOG_CLOSED_BY_USER');
    });

    this.fxaModuleBack.addEventListener('mousedown', function() {
      FxaModuleNavigation.back();
    });

    // To enable click animation on buttons, the next and done method should
    // be invoked at mouseup or keyup event.
    this.fxaModuleNext.addEventListener('mouseup',
        FxaModuleNavigation.next.bind(FxaModuleNavigation));

    this.fxaModuleDone.addEventListener('mouseup',
        FxaModuleNavigation.done.bind(FxaModuleNavigation));

    this.fxaModuleNext.addEventListener('keydown', e => {
      if(e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.fxaModuleNext.classList.add('active');
      }
    });

    this.fxaModuleDone.addEventListener('keydown', e => {
      if(e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.fxaModuleDone.classList.add('active');
      }
    });

    this.fxaModuleNext.addEventListener('keyup', e => {
      if(e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.fxaModuleNext.classList.remove('active');
        FxaModuleNavigation.next();
      }
    });

    this.fxaModuleDone.addEventListener('keyup', e => {
      if(e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.fxaModuleDone.classList.remove('active');
        FxaModuleNavigation.done();
      }
    });

    // Give up if the network goes offline for more than 30 seconds straight.
    var offlineTimer;
    window.addEventListener('online', function onOnline(evt) {
      clearTimeout(offlineTimer);
      FxaModule.hideErrorResponse();
    });

    window.addEventListener('offline', function onOffline(evt) {
      if (offlineTimer) { return; }
      offlineTimer = setTimeout(function onOfflineTimeout() {
        return FxaModule.showErrorResponse({
          error: 'OFFLINE'
        });
      }, OFFLINE_TIMEOUT);
    });

    this.enableBack();

    FxaModuleNavigation.init(flow);
  },
  setMaxSteps: function(num) {
    this.maxSteps = num;
  },
  increaseMaxStepsBy: function(inc) {
    this.maxSteps = this.maxSteps + inc;
  },
  decreaseMaxStepsBy: function(dec) {
    this.maxSteps = this.maxSteps - dec;
  },
  loadScreen: function(params) {
    var currentScreen = document.querySelector('.current');
    var nextScreen = params.panel;
    // Set progress width
    this.fxaProgress.style.width = (100 / this.maxSteps) + '%';
    // Lazy load current panel
    LazyLoader.load(nextScreen, function() {
      // If the panel contains any new script elements,
      // lazy load those as well.
      var scripts = [].slice.call(nextScreen.querySelectorAll('script'))
        .map(function(script) { return script.getAttribute('src'); });

      // Once all scripts are loaded, load the modules/UI
      LazyLoader.load(scripts, function() {
        if (params.count > 1 && params.count < this.maxSteps) {
          this.fxaModuleNavigation.classList.remove('navigation-single-button');
          this.fxaModuleNavigation.classList.remove('navigation-back-only');
          this.fxaModuleNavigation.classList.remove('navigation-done');

          if (nextScreen.getAttribute('data-navigation') === 'back') {
            this.fxaModuleNavigation.classList.add('navigation-back-only');
          }
        } else {
          this.fxaModuleNavigation.classList.add('navigation-single-button');
          if (params.count === this.maxSteps) {
            this.fxaModuleNavigation.classList.add('navigation-done');
          } else {
            this.fxaModuleNavigation.classList.remove('navigation-done');
          }
        }
        this.setProgressBar(params.count);

        navigator.mozL10n.once(function() {
          // fire module's init method
          params.onload && params.onload();

          // animate it into view - TODO unclear how nextScreen could be falsy
          if (nextScreen) {
            this._animate(currentScreen,
                          nextScreen,
                          params.back,
                          params.onanimate);
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },
  _animate: function(from, to, back, callback) {
    if (!to) {
      return;
    }

    if (!from) {
      to.classList.add('current');
      return;
    }

    if (this._inTransition(from) || this._inTransition(to)) {
      return;
    }

    from.addEventListener('animationend', function fromAnimEnd() {
      from.removeEventListener('animationend', fromAnimEnd, false);
      from.classList.remove(back ? 'currentToRight' : 'currentToLeft');
      from.classList.remove('current');
      from.classList.remove('back');
    }, false);

    to.addEventListener('animationend', function toAnimEnd() {
      to.removeEventListener('animationend', toAnimEnd, false);
      to.classList.remove(back ? 'leftToCurrent' : 'rightToCurrent');
      to.classList.add('current');
      callback && callback();
    }, false);

    from.classList.add(back ? 'currentToRight' : 'currentToLeft');
    to.classList.add(back ? 'leftToCurrent' : 'rightToCurrent');
  },
  _inTransition: function(elem) {
    return elem.classList.contains('currentToRight') ||
    elem.classList.contains('currentToLeft') ||
    elem.classList.contains('rightToCurrent') ||
    elem.classList.contains('leftToCurrent') || false;
  },
  setProgressBar: function(value) {
    this.fxaProgress.value = 100 * value / this.maxSteps;
    this.fxaProgress.style.transform = 'translateX(' + 100 * (value - 1) + '%)';
  },
  setNextText: function(l10n) {
    this.fxaModuleNext.textContent = l10n;
  },
  disableNextButton: function() {
    this.fxaModuleNext.setAttribute('disabled', 'disabled');
  },
  enableNextButton: function() {
    this.fxaModuleNext.removeAttribute('disabled');
  },
  disableDoneButton: function() {
    this.fxaModuleDone.setAttribute('disabled', 'disabled');
  },
  enableDoneButton: function() {
    this.fxaModuleDone.removeAttribute('disabled');
  },
  onkeypress: function(e) {
    if (e.keyCode === KeyEvent.DOM_VK_ESCAPE ||
        (e.keyCode === KeyEvent.DOM_VK_BACK_SPACE &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.type !== 'text')) {
      FxaModuleNavigation.back();
    }
  },
  disableBack: function() {
    window.removeEventListener('keypress', this.onkeypress);
  },
  enableBack: function() {
    window.addEventListener('keypress', this.onkeypress);
  },
  focusDoneButton: function() {
    document.activeElement.blur();
    this.fxaModuleDone.focus();
  }
};
