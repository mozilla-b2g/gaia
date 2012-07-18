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

  this.toNode = domNode.getElementsByClassName('cmp-to-text')[0];
  this.ccNode = domNode.getElementsByClassName('cmp-cc-text')[0];
  this.bccNode = domNode.getElementsByClassName('cmp-bcc-text')[0];
  this.subjectNode = domNode.getElementsByClassName('cmp-subject-text')[0];
  this.bodyNode = domNode.getElementsByClassName('cmp-body-text')[0];

  this._loadStateFromComposer();
}
ComposeCard.prototype = {
  _loadStateFromComposer: function() {
    function expandAddresses(addresses) {
      if (!addresses)
        return '';
      var normed = addresses.map(function(aval) {
        if (typeof(aval) === 'string')
          return aval;
        return '"' + aval.name + '" <' + aval.address + '>';
      });
      return normed.join(', ');
    }
    this.toNode.value = expandAddresses(this.composer.to);
    this.ccNode.value = expandAddresses(this.composer.cc);
    this.bccNode.value = expandAddresses(this.composer.bcc);

    this.subjectNode.value = this.composer.subject;
    this.bodyNode.value = this.composer.body;
  },

  _saveStateToComposer: function() {
    function frobAddressNode(node) {
      if (node.value.trim().length === 0)
        return [];
      return node.value.split(',');
    }
    this.composer.to = frobAddressNode(this.toNode);
    this.composer.cc = frobAddressNode(this.ccNode);
    this.composer.bcc = frobAddressNode(this.bccNode);
    this.composer.subject = this.subjectNode.value;
    this.composer.body = this.bodyNode.value;
  },

  /**
   * Save the draft if there's anything to it, close the card.
   */
  onBack: function() {
    this.composer.saveDraftEndComposition();
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  onSend: function() {
    this._saveStateToComposer();

    // XXX well-formedness-check (ideally just handle by not letting you send
    // if you haven't added anyone...)

    this.composer.finishCompositionSendMessage(Toaster.trackSendMessage());
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode('compose', {}, ComposeCard);

