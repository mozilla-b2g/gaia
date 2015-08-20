'use strict';
define(function(require) {
  var cards = require('cards');

  return [
    require('./base_card')(require('template!./confirm_dialog.html')),
    {
      onArgs: function(args) {
        var dialogBodyNode = args.dialogBodyNode,
            confirm = args.confirm,
            cancel = args.cancel,
            callback = args.callback;

        if (dialogBodyNode) {
          this.appendChild(dialogBodyNode);
        } else {
          // If no dialogBodyNode passed in, use the default form display, and
          // configure the confirm/cancel hand, for the simple way of handling
          // confirm dialogs.
          dialogBodyNode = this.querySelector('.confirm-dialog-form');

          dialogBodyNode.querySelector('.confirm-dialog-message')
                        .textContent = args.message;

          dialogBodyNode.classList.remove('collapsed');

          confirm = {
            handler: function() {
              callback(true);
            }
          };
          cancel = {
            handler: function() {
              callback(false);
            }
          };
        }

        // Wire up the event handling
        dialogBodyNode.addEventListener('submit', function(evt) {
          evt.preventDefault();
          evt.stopPropagation();

          this.hide();

          var target = evt.explicitOriginalTarget,
              targetId = target.id,
              isOk = target.classList.contains('confirm-dialog-ok'),
              isCancel = target.classList.contains('confirm-dialog-cancel');

          if ((isOk || targetId === confirm.id) && confirm.handler) {
            confirm.handler();
          } else if ((isCancel || targetId === cancel.id) && cancel.handler) {
            cancel.handler();
          }
        }.bind(this));
      },

      hide: function() {
        cards.removeCardAndSuccessors(this, 'immediate', 1, null, true);
      },

      die: function() {
      }
    }
  ];
});
