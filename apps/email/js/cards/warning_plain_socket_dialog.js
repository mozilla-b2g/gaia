/*global define*/
define(function(require, exports) {

'use strict';

var templateNode = require('tmpl!./warning_plain_socket_dialog.html'),
    common = require('mail_common'),
    Cards = common.Cards,
    _domNode = null;

function WarningDialogCard(domNode, mode, args) {
  _domNode = domNode;
  var okButton = domNode.getElementsByClassName('ok-btn')[0];
  okButton.addEventListener('click', this.onOk.bind(this), false);
}

WarningDialogCard.prototype = {
  onOk: function(e) {
    e.preventDefault();
    Cards.removeCardAndSuccessors(_domNode, 'inmediate', 1, null, true);
    _domNode = null;
  },

  die: function() {
  }
};

WarningDialogCard.show = function(message, callback, cancel) {
  if (!_domNode) {
    Cards.pushCard('warning_plain_socket_dialog', 'default',
                   'immediate');
  }
};

WarningDialogCard.hide = function() {
  if (_domNode) {
    Cards.removeCardAndSuccessors(_domNode, 'immediate', 1, null, true);
    _domNode = null;
  }
};

Cards.defineCardWithDefaultMode(
    'warning_plain_socket_dialog',
    { tray: false },
    WarningDialogCard,
    templateNode
);

exports.hide = WarningDialogCard.hide;
exports.show = WarningDialogCard.show;
});
