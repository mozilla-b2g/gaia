/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(window) {

  var _ = navigator.mozL10n.get;

  var ENABLE_LOG = false;

  // Use mutation observer to monitor appWindow status change
  window.AppLog = function AppLog(app) {
    // select the target node
    var target = app.frame;

    // create an observer instance
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        console.log(mutation.target.id,
                    mutation.target.className,
                    mutation.attributeName);
      });
    });

    // configuration of the observer:
    var config = { attributes: true };

    // pass in the target node, as well as the observer options
    observer.observe(target, config);
  };

  window.AppError = function AppError(app) {
    var self = this;
    this.app = app;
    this.app.frame.addEventListener('mozbrowsererror', function(evt) {
      if (evt.detail.type != 'other')
        return;

      console.warn(
        'app of [' + self.app.origin + '] got a mozbrowsererror event.');

      if (self.injected) {
        self.update();
      } else {
        self.render();
      }
      self.show();
      self.injected = true;
    });
    return this;
  };

  AppError.className = 'appError';

  AppError.prototype.hide = function() {
    this.element.classList.remove('visible');
  };

  AppError.prototype.show = function() {
    this.element.classList.add('visible');
  };

  AppError.prototype.render = function() {
    this.app.frame.insertAdjacentHTML('beforeend', this.view());
    this.closeButton =
      this.app.frame.querySelector('.' + AppError.className + ' .close');
    this.reloadButton =
      this.app.frame.querySelector('.' + AppError.className + ' .reload');
    this.titleElement =
      this.app.frame.querySelector('.' + AppError.className + ' .title');
    this.messageElement =
      this.app.frame.querySelector('.' + AppError.className + ' .message');
    this.element = this.app.frame.querySelector('.' + AppError.className);
    var self = this;
    this.closeButton.onclick = function() {
      self.app.kill();
    };

    this.reloadButton.onclick = function() {
      self.hide();
      self.app.reload();
    };
  };

  AppError.prototype.update = function() {
    this.titleElement.textContent = this.getTitle();
    this.messageElement.textContent = this.getMessage();
  };

  AppError.prototype.id = function() {
    return AppError.className + '-' + this.app.frame.id;
  };

  AppError.prototype.getTitle = function() {
    if (AirplaneMode.enabled) {
      return _('airplane-is-on');
    } else if (!navigator.onLine) {
      return _('network-connection-unavailable');
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

  AppError.prototype.view = function() {
    return '<div id="' + this.id() + '" class="' +
        AppError.className + ' visible" role="dialog">' +
      '<div class="modal-dialog-message-container inner">' +
        '<h3 data-l10n-id="error-title" class="title">' +
          this.getTitle() + '</h3>' +
        '<p>' +
         '<span data-l10n-id="error-message" class="message">' +
            this.getMessage() + '</span>' +
        '</p>' +
      '</div>' +
      '<menu data-items="2">' +
        '<button class="close" data-l10n-id="try-again">' +
          _('close') + '</button>' +
        '<button class="reload" data-l10n-id="try-again">' +
          _('try-again') + '</button>' +
      '</menu>' +
    '</div>';
  };

  window.AppWindow = function AppWindow(configuration) {
    for (var key in configuration) {
      this[key] = configuration[key];
    }

    // We keep the appError object here for the purpose that
    // we may need to export the error state of AppWindow instance
    // to the other module in the future.
    this.appError = new AppError(this);
    if (ENABLE_LOG)
      this.appLog = new AppLog(this);

    return this;
  };

  AppWindow.prototype.reload = function() {
    this.iframe.reload(true);
  };

  AppWindow.prototype.kill = function() {
    // XXX: A workaround because a AppWindow instance shouldn't reference
    // Window Manager directly here.
    // In the future we should make every app maintain and execute the events
    // in itself like resize, setVisibility...
    // And Window Manager is in charge of cross app management.
    WindowManager.kill(this.origin);
  };

}(this));
