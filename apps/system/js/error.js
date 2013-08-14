'use strict';

(function(window) {
  var _ = navigator.mozL10n.get;

  window.AppError = function AppError(app) {
    var self = this;
    this.app = app;
    this.app.iframe.addEventListener('mozbrowsererror', function(evt) {
      if (evt.detail.type != 'other')
        return;

      console.warn(
        'app of [' + self.app.origin + '] got a mozbrowsererror event.');

      if (!self.injected) {
        self.render();
      }
      self.update();
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
        '<h3 data-l10n-id="error-title" class="title"></h3>' +
        '<p>' +
         '<span data-l10n-id="error-message" class="message"></span>' +
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
}(this));
