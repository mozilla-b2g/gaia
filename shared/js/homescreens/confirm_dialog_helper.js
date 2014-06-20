(function(exports) {
  'use strict';
  /**
  Generic dialog helper this _depends_ on <gaia-confirm> but is not required
  to be loaded as part of the main gaia-confirm script.

  XXX: much like how we abuse custom elements in gaia-grid we do similar things
       here but it reduces the amount of code duplication while still making it
       somewhat easy to use this functionality. This is still a hack and should
       be rethought.

  */
  function Dialog(config) {
    this.config = config;
  }

  Dialog.prototype = {
    handleEvent: function(e) {
      // ensure we hide the dialog in the face of other errors...
      this.destroy();

      switch (e.type) {
        case 'confirm':
          var confirm = this.config.confirm.cb;
          confirm && confirm();
          break;
        case 'cancel':
          var cancel = this.config.cancel.cb;
          cancel && cancel();
          break;
      }
    },

    destroy: function() {
      if (this.element) {
        // ensure cleanup of our hacks!
        window.removeEventListener('hashchange', this);

        this.element.parentNode.removeChild(this.element);
        this.element = null;
      }
    },

    show: function(parent) {
      var config = this.config;
      var wrapper = document.createElement('div');

      // only include a cancel button if the config was given...
      var cancelButton = config.cancel ?
        '<button class="cancel" type="button"></button>' :
        '';

      wrapper.innerHTML =
          '<gaia-confirm>' +
            '<h1></h1>' +
            '<p></p>' +
            '<gaia-buttons skin="dark">' +
              cancelButton +
              '<button class="confirm" type="button"></button>' +
            '</gaia-buttons>' +
          '</gaia-confirm>';

      var element = wrapper.firstElementChild;
      parent.appendChild(element);

      this.element = element;

      element.dataset.type = config.type;
      element.addEventListener('confirm', this);
      element.addEventListener('cancel', this);

      // XXX: Primarily here for pressing the home screen button
      window.addEventListener('hashchange', this);
      // TODO: Add visibility change handling...

      var title = element.querySelector('h1'),
          body = element.querySelector('p'),
          cancel = element.querySelector('.cancel'),
          confirm = element.querySelector('.confirm');

      title.textContent = config.title;
      body.textContent = config.body;
      confirm.textContent = config.confirm.title;

      if (config.cancel) {
        cancel.textContent = config.cancel.title;
      }

      if (config.confirm.type) {
        confirm.classList.add(config.confirm.type);
      }

    }
  };

  // XXX: This name is intentionally verbose and needs refactoring later.
  window.ConfirmDialogHelper = Dialog;
}(window));
