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
  this.activity = args.activity;

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

  // Add input event listener for handling the bubble creation/deletion.
  this.toNode.addEventListener('keydown', this.onAddressKeydown.bind(this));
  this.ccNode.addEventListener('keydown', this.onAddressKeydown.bind(this));
  this.bccNode.addEventListener('keydown', this.onAddressKeydown.bind(this));
  this.toNode.addEventListener('input', this.onAddressInput.bind(this));
  this.ccNode.addEventListener('input', this.onAddressInput.bind(this));
  this.bccNode.addEventListener('input', this.onAddressInput.bind(this));
  // Add Contact-add buttons event listener
  var addBtns = domNode.getElementsByClassName('cmp-contact-add');
  for (var i = 0; i < addBtns.length; i++) {
    addBtns[i].addEventListener('click', this.onContactAdd.bind(this));
  }
  // Add input focus:
  var containerList = domNode.getElementsByClassName('cmp-bubble-container');
  for (var i = 0; i < containerList.length; i++) {
    containerList[i].addEventListener('click',
      this.onContainerClick.bind(this));
  }

  // Add attachments
  var attachmentsContainer =
    domNode.getElementsByClassName('cmp-attachments-container')[0];
  if (this.composer.attachments && this.composer.attachments.length) {
    var attTemplate = cmpNodes['attachment-item'],
        filenameTemplate =
          attTemplate.getElementsByClassName('cmp-attachment-filename')[0],
        filesizeTemplate =
          attTemplate.getElementsByClassName('cmp-attachment-filesize')[0];
    for (var i = 0; i < this.composer.attachments.length; i++) {
      var attachment = this.composer.attachments[i];
      filenameTemplate.textContent = attachment.name;
      filesizeTemplate.textContent = prettyFileSize(attachment.blob.size);
      var attachmentNode = attTemplate.cloneNode(true);
      attachmentsContainer.appendChild(attachmentNode);

      attachmentNode.getElementsByClassName('cmp-attachment-remove')[0]
        .addEventListener('click',
                          this.onClickRemoveAttachment.bind(
                            this, attachmentNode, attachment));
    }
  }
  else {
    attachmentsContainer.classList.add('collapsed');
  }
}
ComposeCard.prototype = {
  postInsert: function() {
    // the HTML bit needs us linked into the DOM so the iframe can be linked in,
    // hence this happens in postInsert.
    this._loadStateFromComposer();
  },

  _loadStateFromComposer: function() {
    var self = this;
    function expandAddresses(node, addresses) {
      if (!addresses)
        return '';
      var container = node.parentNode;
      var normed = addresses.map(function(aval) {
        var name, address;
        if (typeof(aval) === 'string') {
          // TODO: We will apply email address parser for showing bubble
          //       properly. We set both name and address same as aval string
          //       before parser is ready.
          name = address = aval;
        } else {
          name = aval.name;
          address = aval.address;
        }
        self.insertBubble(node, name, address);
      });
    }
    expandAddresses(this.toNode, this.composer.to);
    expandAddresses(this.ccNode, this.composer.cc);
    expandAddresses(this.bccNode, this.composer.bcc);

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
      var container = node.parentNode;
      var addrList = [];
      var bubbles = container.querySelectorAll('.cmp-peep-bubble');
      for (var i = 0; i < bubbles.length; i++) {
        var dataSet = bubbles[i].dataset;
        addrList.push({ name: dataSet.name, address: dataSet.address });
      }
      // TODO: We will apply email address parser for setting name properly.
      //       We set both name to null and address to text input value
      //       before parser is ready.
      if (node.value.trim().length !== 0)
        addrList.push({ name: null, address: node.value });
      return addrList;
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

  createBubbleNode: function(name, address) {
    var bubble = cmpNodes['peep-bubble'].cloneNode(true);
    bubble.classList.add('msg-peep-bubble');
    bubble.setAttribute('data-address', address);
    bubble.setAttribute('data-name', name);
    bubble.querySelector('.cmp-peep-address').textContent = address;
    var nameNode = bubble.querySelector('.cmp-peep-name');
    if (!name) {
      nameNode.textContent = address.indexOf('@') !== -1 ?
                    address.split('@')[0] : address;
    } else {
      nameNode.textContent = name;
    }
    return bubble;
  },

  /**
   * insertBubble: We can set the input text node, name and address to
   *               insert a bubble before text input.
   */
  insertBubble: function(node, name, address) {
    var container = node.parentNode;
    var bubble = this.createBubbleNode(name, address);
    container.insertBefore(bubble, node);
    var dotInput = document.createElement('input');
    dotInput.value = ',';
    dotInput.classList.add('cmp-dot-text');
    dotInput.size = 1;
    container.insertBefore(dotInput, node);
  },
  /**
   * deleteBubble: Delete the bubble from the parent container.
   */
  deleteBubble: function(node) {
    var dot = node.nextSibling;
    var container = node.parentNode;
    if (dot.classList.contains('cmp-dot-text')) {
      container.removeChild(dot);
    }
    if (node.classList.contains('cmp-peep-bubble')) {
      container.removeChild(node);
    }
  },

  /**
   * Handle bubble deletion while keyboard backspace keydown.
   */
  onAddressKeydown: function(evt) {
    var node = evt.target;
    var container = evt.target.parentNode;

    if (evt.keyCode == 8 && node.value == '') {
      //delete bubble
      var previousBubble = node.previousSibling.previousSibling;
      this.deleteBubble(previousBubble);
    }
  },

  /**
   * Handle bubble creation while keyboard comma input.
   */
  onAddressInput: function(evt) {
    var node = evt.target;
    var container = evt.target.parentNode;
    if (node.value.slice(-1) == ',') {
      // TODO: Need to match the email with contact name.
      node.style.width = '0.5rem';
      // TODO: We will apply email address parser for showing bubble properly.
      //       We simply set name as string that splited from address
      //       before parser is ready.
      this.insertBubble(node, null, node.value.split(',')[0]);
      node.value = '';
    }
    // XXX: Workaround to get the length of the string. Here we create a dummy
    //      div for computing actual string size for changing input
    //      size dynamically.
    if (!this.stringContainer) {
      this.stringContainer = document.createElement('div');
      this.domNode.appendChild(this.stringContainer);
    }
    this.stringContainer.style.fontSize = '1.5rem';
    this.stringContainer.style.display = 'inline-block';
    this.stringContainer.textContent = node.value;
    node.style.width = (this.stringContainer.clientWidth + 2) + 'px';
  },

  onContainerClick: function(evt) {
    var target = evt.target;
    // Popup the context menu if clicked target is peer bubble.
    if (target.classList.contains('cmp-peep-bubble')) {
      var contents = cmpNodes['contact-menu'].cloneNode(true);
      Cards.popupMenuForNode(contents, target, ['menu-item'],
        function(clickedNode) {
          if (!clickedNode)
            return;

          switch (clickedNode.classList[0]) {
            case 'cmp-contact-menu-delete':
              this.deleteBubble(target);
              break;
          }
        }.bind(this));
      return;
    }
    // While user clicks on the container, focus on input to triger
    // the keyboard.
    var input = evt.currentTarget.getElementsByClassName('cmp-addr-text')[0];
    input.focus();
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

  onClickRemoveAttachment: function(node, attachment) {
    node.parentNode.removeChild(node);
    this.composer.removeAttachment(attachment);
  },

  /**
   * Save the draft if there's anything to it, close the card.
   */
  onBack: function() {
    // Since we will discard all the content while exit, there is no need to
    // save draft for now.
    //this.composer.saveDraftEndComposition();
    var discardHandler = function() {
      if (this.activity) {
        // We need more testing here to make sure the behavior that back
        // to originated activity works perfectly without any crash or
        // unable to switch back.

        this.activity.postError('cancelled');
        this.activity = null;

        Cards.removeCardAndSuccessors(this.domNode, 'animate');
      } else {
        Cards.removeCardAndSuccessors(this.domNode, 'animate');
      }
    }.bind(this);
    var self = this;
    var checkAddressEmpty = function() {
      var bubbles = self.domNode.querySelectorAll('.cmp-peep-bubble');
      if (bubbles.length == 0 && !self.toNode.value && !self.ccNode.value &&
          !self.bccNode.value)
        return true;
      else
        return false;
    };
    if (!this.subjectNode.value && !this.textBodyNode.value &&
        checkAddressEmpty()) {
      discardHandler();
      return;
    }
    CustomDialog.show(
      null,
      mozL10n.get('compose-discard-message'),
      {
        title: mozL10n.get('message-multiedit-cancel'),
        callback: function() {
          CustomDialog.hide();
        }
      },
      {
        title: mozL10n.get('compose-discard-confirm'),
        callback: function() {
          discardHandler();
          CustomDialog.hide();
        }
      }
    );
  },

  onSend: function() {
    this._saveStateToComposer();

    // XXX well-formedness-check (ideally just handle by not letting you send
    // if you haven't added anyone...)

    var activity = this.activity;
    var domNode = this.domNode;
    var sendingTemplate = cmpNodes['sending-container'];
    domNode.appendChild(sendingTemplate);

    this.composer.finishCompositionSendMessage(
      function callback(error , badAddress, sentDate) {
        var activityHandler = function() {
          if (activity) {
            // Define activity postResult return value here:
            if (activity.source.name == 'share') {
              activity.postResult('shared');
            }
            activity = null;
          }
        }

        domNode.removeChild(sendingTemplate);
        if (error) {
          CustomDialog.show(
            null,
            mozL10n.get('compose-send-message-failed'),
            {
              title: mozL10n.get('dialog-button-ok'),
              callback: function() {
                CustomDialog.hide();
              }
            }
          );
          return;
        }
        activityHandler();
        Cards.removeCardAndSuccessors(domNode, 'animate');
      }
    );
  },

  onContactAdd: function(event) {
    var contactBtn = event.target;
    var self = this;
    contactBtn.classList.remove('show');
    try {
      var reopenSelf = function reopenSelf(obj) {
        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
          var app = evt.target.result;
          app.launch();
          if (obj.email) {
            var emt = contactBtn.parentElement.querySelector('.cmp-addr-text');
            self.insertBubble(emt, obj.name, obj.email);
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

