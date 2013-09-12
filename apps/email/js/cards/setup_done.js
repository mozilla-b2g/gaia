/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_done.html'),
    common = require('mail_common'),
    model = require('model'),
    evt = require('evt'),
    Cards = common.Cards;


/**
 * Setup is done; add another account?
 */
function SetupDoneCard(domNode, mode, args) {
  domNode.getElementsByClassName('sup-add-another-account-btn')[0]
    .addEventListener('click', this.onAddAnother.bind(this), false);
  domNode.getElementsByClassName('sup-show-mail-btn')[0]
    .addEventListener('click', this.onShowMail.bind(this), false);
}
SetupDoneCard.prototype = {
  onAddAnother: function() {
    evt.emit('addAccount');
  },
  onShowMail: function() {
    // Nuke this card
    evt.emit('showLatestAccount');
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup_done',
    { tray: false },
    SetupDoneCard,
    templateNode
);

return SetupDoneCard;
});
