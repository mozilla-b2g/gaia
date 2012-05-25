/**
 * Card definitions/logic for composition, contact picking, and attaching
 * things.  Although ideally, the picking and attaching will be handled by a
 * web activity or shared code.
 **/

/**
 * Composer card; wants an initialized message composition object when it is
 * created (for now).
 */
function ComposeCard(domNode, mode, args) {
  this.domNode = domNode;
  this.composer = args.composer;

  domNode.getElementsByClassName('cmp-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);
  domNode.getElementsByClassName('cmp-send-btn')[0]
    .addEventListener('click', this.onSend.bind(this), false);
}
ComposeCard.prototype = {
  /**
   * Save the draft if there's anything to it, close the card.
   */
  onBack: function() {
    this.composer.saveDraftEndComposition();
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  onSend: function() {
    // XXX well-formedness-check (ideally just handle by not letting you send
    // if you haven't added anyone...)

    this.composer.finishCompositionSendMessage(Toaster.trackSendMessage());
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  die: function() {
  },
};
Cards.defineCard({
  name: 'compose',
  modes: {
    default: {
    },
  },
  constructor: ComposeCard
});
