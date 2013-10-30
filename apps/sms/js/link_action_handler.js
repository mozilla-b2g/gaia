/*global ActivityPicker, ThreadUI */

(function(exports) {
  'use strict';
  /*
   Centralized event handling for various
   data-actions url, email, phone in a message
  */
  var inProgress = false;

  var LinkActionHandler = {
    onClick: function lah_onClick(event) {
      event.preventDefault();
      event.stopPropagation();

      var dataset = event.target.dataset;
      var action = dataset.action;

      if (!action) {
        return;
      }

      if (action === 'email-link') {
        ThreadUI.prompt({
          email: dataset.email,
          inMessage: true
        });
      }

      if (action === 'dial-link') {
        ThreadUI.promptContact({
          number: dataset.dial,
          inMessage: true
        });
      }

      if (action === 'url-link') {
        if (inProgress) {
          return;
        }

        inProgress = true;
        var type = action.replace('-link', '');
        // Use `LinkActionHandler.reset` (this.reset) as BOTH the
        // success and error callback. This ensure that any
        // activities will be freed regardless of their
        // resulting state.
        ActivityPicker[type](
          dataset[type], this.reset, this.reset
        );
      }

    },

    reset: function lah_reset() {
      inProgress = false;
    }
  };

  exports.LinkActionHandler = LinkActionHandler;
}(this));
