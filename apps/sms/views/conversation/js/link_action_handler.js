/*global ActivityPicker, ConversationView */

(function(exports) {
  'use strict';
  /*
   Centralized event handling for various
   data-actions url, email, phone in a message
  */

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
        ConversationView.prompt({
          email: dataset.email,
          inMessage: true
        });
      }

      if (action === 'dial-link') {
        ConversationView.promptContact({
          number: dataset.dial,
          inMessage: true
        });
      }

      if (action === 'url-link') {

        var type = action.replace('-link', '');

        ActivityPicker[type](
          dataset[type], this.reset, this.reset
        );
      }

    }
  };

  exports.LinkActionHandler = LinkActionHandler;
}(this));
