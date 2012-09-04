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
  this.textBodyNode = domNode.getElementsByClassName('cmp-body-text')[0];
  this.textBodyNode.addEventListener('input',
                                     this.onTextBodyDelta.bind(this));
  this.textBodyNode.addEventListener('change',
                                     this.onTextBodyDelta.bind(this));
  this.htmlBodyContainer = domNode.getElementsByClassName('cmp-body-html')[0];
  this.htmlIframeNode = null;
  var inputList = domNode.getElementsByClassName('cmp-addr-text');
  for (var i = 0; i < inputList.length; i++) {
    inputList[i].addEventListener('focus', this.onAddrInputFocus.bind(this));
    inputList[i].addEventListener('blur', this.onAddrInputBlur.bind(this));
  }

  // Add Contact-add buttons event listener
  var addBtns = domNode.getElementsByClassName('cmp-contact-add');
  for (var i = 0; i < inputList.length; i++) {
    addBtns[i].addEventListener('click', this.onContactAdd.bind(this));
  }
}
ComposeCard.prototype = {
  postInsert: function() {
    // the HTML bit needs us linked into the DOM so the iframe can be linked in,
    // hence this happens in postInsert.
    this._loadStateFromComposer();
  },
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
    this.textBodyNode.value = this.composer.body.text;
    // force the textarea to be sized.
    this.onTextBodyDelta();

    if (this.composer.body.html) {
      // Although (still) sanitized, this is still HTML we did not create and so
      // it gets to live in an iframe.  Its read-only and the user needs to be
      // able to see what they are sending, so reusing the viewing functionality
      // is desirable.
      this.htmlIframeNode = createAndInsertIframeForContent(
        this.composer.body.html, this.htmlBodyContainer, /* append */ null,
        'noninteractive',
        /* no click handler because no navigation desired */ null);
    }
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
    this.composer.body.text = this.textBodyNode.value;
    // The HTML representation cannot currently change in our UI, so no
    // need to save it.  However, what we send to the back-end is what gets
    // sent, so if you want to implement editing UI and change this here,
    // go crazy.
  },

  /**
   * Make our textarea grow as new lines are added...
   */
  onTextBodyDelta: function() {
    var value = this.textBodyNode.value, newlines = 0, idx = -1;
    while (true) {
      idx = value.indexOf('\n', idx + 1);
      if (idx === -1)
        break;
      newlines++;
    }
    // the last line won't have a newline
    var neededRows = newlines + 1;
    if (this.textBodyNode.rows !== neededRows)
      this.textBodyNode.rows = neededRows;
  },

  /**
   * Set the contact add button show/hide while input field focus/blur.
   */
  onAddrInputFocus: function(evt) {
    var addBtn = evt.target.parentElement.querySelector('.cmp-contact-add');
    addBtn.classList.add('show');
  },

  onAddrInputBlur: function(evt) {
    var addBtn = evt.target.parentElement.querySelector('.cmp-contact-add');
    if (addBtn == evt.explicitOriginalTarget)
      return;
    addBtn.classList.remove('show');
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

  onContactAdd: function(event) {
    var contactBtn = event.target;
    contactBtn.classList.remove('show');
    try {
      var reopenSelf = function reopenSelf(obj) {
        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
          var app = evt.target.result;
          app.launch();
          if (obj.email) {
            // TODO: We need to add name icon in the input field
            //       and save the email in array intead of query the input
            //       value directly.
            var emt = contactBtn.parentElement.querySelector('.cmp-addr-text');
            emt.value += emt.value ? (',' + obj.email) : obj.email;
          }
        };
      };
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'webcontacts/email'
        }
      });
      activity.onsuccess = function success() {
        var number = this.result.number;
        reopenSelf(this.result);
      }
      activity.onerror = function error() {
        reopenSelf();
      }

    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode('compose', {}, ComposeCard);

