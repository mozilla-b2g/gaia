'use strict';

Evme.ConnectionMessage = new function Evme_ConnectionMessage() {
  var NAME = 'ConnectionMessage',
      self = this,
      elScopes = [],
      elMessages = [],

      CLASS_NO_CONNECTION = 'connection-error',
      SELECTOR_CONNECTION_MESSAGE =
        '[role="notification"].connection-message div span';

  this.init = function init(options) {
    elScopes = Evme.Utils.getScopeElements();
    elMessages = document.querySelectorAll(SELECTOR_CONNECTION_MESSAGE);

    Evme.EventHandler.trigger(NAME, 'init');
  };

  this.show = function show(l10nKey, l10nArgs) {
    var msg = Evme.Utils.l10n(NAME, l10nKey, l10nArgs);

    for (var i = 0, el; el = elMessages[i++];) {
      el.innerHTML = msg;
    }

    for (var i = 0, el; el = elScopes[i++];) {
      el.classList.add(CLASS_NO_CONNECTION);
    }

    Evme.EventHandler.trigger(NAME, 'show');
  };

  this.hide = function hide() {
    for (var i = 0, el; el = elScopes[i++];) {
      el.classList.remove(CLASS_NO_CONNECTION);
    }

    Evme.EventHandler.trigger(NAME, 'hide');
  };
}
