'use strict';

(function(window) {
  // number of retry attempts after changing settings
  const MAX_RETRY_ATTEMPTS = 5;
  var _ = navigator.mozL10n.get;

  function hide(el) {
    el.style.display = 'none';
  }

  function show(el) {
    el.style.display = 'block';
  }

  function getSetting(name, callback) {
    var setting = SettingsListener.getSettingsLock().get(name);
    setting.onsuccess = function() {
      callback(setting.result && setting.result[name]);
    };
    setting.onerror = function() {
      callback();
    };
  }

  window.AppError = function AppError(app) {
    this.app = app;
    this.reloading = 0; // reload attempt count

    this.app.iframe.addEventListener('mozbrowsererror', function(evt) {
      if (evt.detail.type === 'other') {
        this.handleAppError();
      }
    }.bind(this));

    return this;
  };

  AppError.className = 'appError';

  AppError.prototype.handleAppError = function() {
    // if we in the middle of attempting to reload an app,
    // simple retry the reload rather than showing the view
    if (this.reloading) {
      this.reloadApp();
    } else {
      this.show();
    }
  };

  AppError.prototype.hide = function() {
    if (this.injected) {
      this.element.classList.remove('visible');
    }
  };

  AppError.prototype.show = function() {
    if (!this.injected) {
      this.render();
      this.injected = true;
    }
    this.updateText();
    this.updateButtons();
    this.element.classList.add('visible');
  };

  AppError.prototype.render = function() {
    this.app.frame.insertAdjacentHTML('beforeend', this.view());
    this.airplaneButton =
      this.app.frame.querySelector('.' + AppError.className + ' .airplane');
    this.dataButton =
      this.app.frame.querySelector('.' + AppError.className + ' .data');
    this.wifiButton =
      this.app.frame.querySelector('.' + AppError.className + ' .wifi');
    this.closeButton =
      this.app.frame.querySelector('.' + AppError.className + ' .close');
    this.reloadButton =
      this.app.frame.querySelector('.' + AppError.className + ' .reload');
    this.titleElement =
      this.app.frame.querySelector('.' + AppError.className + ' .title');
    this.messageElement =
      this.app.frame.querySelector('.' + AppError.className + ' .message');
    this.progressIndicator =
      this.app.frame.querySelector('.' + AppError.className + ' progress');
    this.element = this.app.frame.querySelector('.' + AppError.className);

    this.element.onsubmit = function() {
      // disable building block form submit
      return false;
    };

    this.closeButton.onclick = (function() {
      this.app.kill();
    }).bind(this);

    this.reloadButton.onclick = (function() {
      this.reloadApp(0); // reload with no delay
    }).bind(this);

    this.airplaneButton.onclick = (function() {
      this.disableAirplane();
    }).bind(this);

    this.dataButton.onclick = (function() {
      this.enableData();
    }).bind(this);

    this.wifiButton.onclick = (function() {
      this.showSettings('wifi');
    }).bind(this);
  };

  AppError.prototype.updateText = function() {
    this.titleElement.textContent = this.getTitle();
    this.messageElement.textContent = this.getMessage();
  };

  AppError.prototype.id = function() {
    return AppError.className + '-' + this.app.frame.id;
  };

  AppError.prototype.reloadApp = function(delay) {
    // clear any previous attempt to hide the overlay
    // since we know that the reload attempt failed
    if (this.hideAfterReload) {
      clearTimeout(this.hideAfterReload);
    }

    delay = delay || 500;
    show(this.progressIndicator);
    this.reloading++;

    if (this.reloading > MAX_RETRY_ATTEMPTS) {
      // once we surpass max retries, re-display the overlay
      this.clearReloading();
      this.show();
    } else {
      // (optionally) delay app reload to give connection time to update
      setTimeout(this.app.reload.bind(this.app), delay);

      // if we hide the overlay immediately upon attempting to
      // reload the app, we will see flicker if the app still
      // cannot load, so delay hide event until we are sure
      // the underlying app is able to connect and load content
      var hideDelay = delay + 1000;
      this.hideAfterReload = setTimeout(function() {
        this.clearReloading();
        this.hide();
      }.bind(this), hideDelay);
    }
  };

  AppError.prototype.clearReloading = function() {
    this.reloading = 0;
    hide(this.progressIndicator);
  };

  AppError.prototype.getTitle = function() {
    if (AirplaneMode.enabled) {
      return _('airplane-is-on');
    } else if (!navigator.onLine) {
      return _('no-internet-access');
    } else {
      return _('error-title', { name: this.app.name });
    }
  };

  AppError.prototype.getMessage = function() {
    if (AirplaneMode.enabled) {
      return _('airplane-is-turned-on', { name: this.app.name });
    } else if (!navigator.onLine) {
      return _('network-error', { name: this.app.name });
    } else {
      return _('error-message', { name: this.app.name });
    }
  };

  AppError.prototype.updateButtons = function() {
    if (AirplaneMode.enabled) {
      show(this.airplaneButton);
    } else {
      hide(this.airplaneButton);
    }

    // even if wifi is enabled we may want to try changing networks
    // so always display wifi button if we are offline
    if (!navigator.onLine) {
      show(this.wifiButton);
    } else {
      getSetting('wifi.enabled', function(result) {
        if (result) {
          hide(this.wifiButton);
        } else {
          show(this.wifiButton);
        }
      }.bind(this));
    }

    getSetting('ril.data.enabled', function(result) {
      if (result) {
        hide(this.dataButton);
      } else {
        show(this.dataButton);
      }
    }.bind(this));
  };

  AppError.prototype.showSettings = function(section) {
    var activity = new MozActivity({
      name: 'configure-overlay',
      data: {
        target: 'device',
        section: section
      }
    });

    activity.onsuccess = (function() {
      if (activity.result) {
        this.reloadApp();
      }
    }).bind(this);

    activity.onerror = (function() {
      console.error('Settings web activity error', this);
    }).bind(this);
  };

  AppError.prototype.enableData = function() {
    var result = SettingsListener.getSettingsLock().set({
      'ril.data.enabled': true
    });

    result.onsuccess = (function() {
      this.reloadApp();
    }).bind(this);

    result.onerror = (function(e) {
      console.log('Failed to enable data connection', e);
      this.reloadApp();
    }).bind(this);
  };

  AppError.prototype.disableAirplane = function() {
    var result = SettingsListener.getSettingsLock().set({
      'ril.radio.disabled': false
    });

    result.onsuccess = (function() {
      this.reloadApp();
    }).bind(this);

    result.onerror = (function(e) {
      console.log('Failed to disable airplane mode', e);
      this.reloadApp();
    }).bind(this);
  };

  AppError.prototype.view = function() {
    return '<form id="' + this.id() + '" role="dialog" data-type="confirm" ' +
      'class="' + AppError.className + '">' +
        '<section>' +
          '<h1 class="title">' + _('no-internet-access') + '</h1>' +
          '<p class="message">' +
            _('network-error', { name: this.app.name }) +
          '</p>' +
        '</section>' +
        '<div class="actions">' +
          '<button class="reload full">' +
            '<span class="icon-refresh"></span>' + _('try-again') +
          '</button>' +
          '<button class="airplane full">' +
            '<span class="icon-airplane"></span>' + _('turn-off-airplane') +
          '</button>' +
          '<button class="data full">' +
            '<span class="icon-data"></span>' + _('turn-on-data') +
          '</button>' +
          '<button class="wifi full">' +
            '<span class="icon-wifi"></span>' + _('check-wifi') +
          '</button>' +
        '</div>' +
        '<menu>' +
          '<button class="close full">' + _('cancel') + '</button>' +
        '</menu>' +
        '<progress></progress>' +
      '</form>';
  };
}(this));
