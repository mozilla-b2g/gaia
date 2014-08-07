/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Settings, Utils, Attachment, AttachmentMenu, MozActivity, SMIL,
        MessageManager,
        Navigation,
        Promise,
        ThreadUI
*/
/*exported Compose */

'use strict';

/**
 * Handle UI specifics of message composition. Namely,
 * resetting (auto manages placeholder text), getting
 * message content, and message size
 */
var Compose = (function() {
  // delay between 2 counter updates while composing a message
  var UPDATE_DELAY = 500;

  var placeholderClass = 'placeholder';
  var attachmentClass = 'attachment-container';

  var attachments = new WeakMap();

  // will be defined in init
  var dom = {
    form: null,
    message: null,
    subject: null,
    sendButton: null,
    attachButton: null
  };

  var handlers = {
    input: [],
    type: [],
    segmentinfochange: []
  };

  var state = {
    empty: true,
    maxLength: null,
    size: null,
    lastScrollPosition: 0,
    resizing: false,

    // 'sms' or 'mms'
    type: 'sms',

    segmentInfo: {
      segments: 0,
      charsAvailableInLastSegment: 0
    }
  };

  var subject = {
    isVisible: false,
    lineHeight: null,
    toggle: function sub_toggle() {
      if (!this.isVisible) {
        this.show();
      } else {
        this.hide();
        dom.message.focus();
      }
      return this;
    },
    show: function sub_show() {
      // Adding this class to the form element, as other form elements depend on
      // visibility of the subject input
      dom.form.classList.add('subject-input-visible');
      this.isVisible = true;
      dom.subject.focus();
      onSubjectChanged();
      return this;
    },
    hide: function sub_hide() {
      dom.form.classList.remove('subject-input-visible');
      this.isVisible = false;
      onSubjectChanged();
      return this;
    },
    clear: function sub_clear() {
      dom.subject.innerHTML = '<br>';
      return this;
    },
    getContent: function sub_getContent() {
      return this.isVisible ?
        getTextFromContent(getContentFromDOM(dom.subject)) : '';
    },
    setContent: function sub_setContent(content) {
      if (typeof content !== 'string') {
        return;
      }
      dom.subject.insertBefore(
        insert(content),
        dom.subject.lastChild
      );
      return this;
    },
    isMultiline: function sub_isMultuLine() {
      // We don't check for subject emptiness because of the new line symbols
      // that aren't respected by isEmpty, see bug 1030160 for details
      if (!this.isShowing) {
        return false;
      }
      // If subject can fit more than one line then it's considered as
      // multiline one (currently it can have one or two lines)
      return dom.subject.clientHeight / this.getLineHeight() >= 2;
    },
    getLineHeight: function sub_getLineHeight() {
      if (!Number.isInteger(this.lineHeight)) {
        var computedStyle = window.getComputedStyle(dom.subject);
        // Line-height is not going to change, so cache it
        this.lineHeight = Number.parseInt(computedStyle.lineHeight, 10);
      }
      return this.lineHeight;
    },
    getMaxLength: function sub_getMaxLength() {
      return +dom.subject.dataset.maxLength;
    },
    get isEmpty() {
      return dom.subject.textContent.length === 0;
    },
    get isShowing() {
      return this.isVisible;
    }
  };

  // Given a DOM element, we will extract an array of the
  // relevant nodes as attachment or text
  function getContentFromDOM(domElement) {
    var content = [];
    var node;

    for (node = domElement.firstChild; node; node = node.nextSibling) {
      // hunt for an attachment in the WeakMap and append it
      var attachment = attachments.get(node);
      if (attachment) {
        content.push(attachment);
        continue;
      }

      var last = content.length - 1;
      var text = node.textContent;

      // Bug 877141 - contenteditable wil insert non-break spaces when
      // multiple consecutive spaces are entered, we don't want them.
      if (text) {
        text = text.replace(/\u00A0/g, ' ');
      }

      if (node.nodeName == 'BR') {
        if (node === domElement.lastChild) {
          continue;
        }
        text = '\n';
      }

      // append (if possible) text to the last entry
      if (text.length) {
        if (typeof content[last] === 'string') {
          content[last] += text;
        } else {
          content.push(text);
        }
      }
    }

    return content;
  }

  // Given a content array, we will get a String with the text
  // concatenated, without line breaks.
  function getTextFromContent(contentArray) {
    var text = '';
    for (var i = contentArray.length - 1; i >= 0; i--) {
      if (typeof contentArray[i] === 'string') {
        text += contentArray[i];
      }
    }
    return text.replace(/\n\s*/g, ' ');
  }

  // anytime content changes - takes a parameter to check for image resizing
  function onContentChanged(duck) {
    // Track when content is edited for draft replacement case
    if (ThreadUI.draft) {
      ThreadUI.draft.isEdited = true;
    }

    // if the duck is an image attachment or object, handle resizes
    if ((duck instanceof Attachment && duck.type === 'img') ||
       (duck && duck.containsImage)) {
      return imageAttachmentsHandling();
    }

    var isEmptyMessage = !dom.message.textContent.length && !hasAttachment();

    if (isEmptyMessage) {
      var brs = dom.message.getElementsByTagName('br');
      // firefox will keep an extra <br> in there
      if (brs.length > 1) {
        isEmptyMessage = false;
      }
    }

    // Placeholder management
    var placeholding = dom.message.classList.contains(placeholderClass);
    if (placeholding && !isEmptyMessage) {
      dom.message.classList.remove(placeholderClass);
    }
    if (!placeholding && isEmptyMessage) {
      dom.message.classList.add(placeholderClass);
    }

    state.emptyMessage = isEmptyMessage;

    Compose.updateEmptyState();
    Compose.updateSendButton();
    Compose.updateType();
    updateSegmentInfoThrottled();

    trigger.call(Compose, 'input');
  }

  function onSubjectChanged() {
    // Track when content is edited for draft replacement case
    if (ThreadUI.draft) {
      ThreadUI.draft.isEdited = true;
    }

    // Subject placeholder management
    dom.subject.classList.toggle(
      placeholderClass,
      subject.isShowing && subject.isEmpty
    );

    // Indicates that subject has multiple lines to change layout accordingly
    dom.form.classList.toggle('multiline-subject', subject.isMultiline());

    Compose.updateEmptyState();
    Compose.updateSendButton();
    Compose.updateType();
  }

  function hasAttachment() {
    return !!dom.message.querySelector('iframe');
  }

  function hasSubject() {
    return subject.isShowing && !subject.isEmpty;
  }

  function composeKeyEvents(e) {
    // if locking and no-backspace pressed, cancel
    if (compose.lock && e.which !== 8) {
      e.preventDefault();
    } else {
      // trigger a recompute of size on the keypresses
      state.size = null;
      compose.lock = false;
    }
  }

  function trigger(type) {
    var event = new CustomEvent(type);
    var fns = handlers[type];

    if (fns && fns.length) {
      for (var i = 0; i < fns.length; i++) {
        fns[i].call(compose, event);
      }
    }
  }

  function insert(item) {
    var fragment = document.createDocumentFragment();
    if (!item) {
      return null;
    }

    // trigger recalc on insert
    state.size = null;

    if (item.render) { // it's an Attachment
      var node = item.render();
      attachments.set(node, item);
      fragment.appendChild(node);
    } else if (item.nodeName === 'IFRAME') {
      // this iframe is generated by us
      fragment.appendChild(item);
    } else if (typeof item === 'string') {
      item.split('\n').forEach(function(line) {
        fragment.appendChild(document.createTextNode(line));
        fragment.appendChild(document.createElement('br'));
      });
      fragment.lastElementChild.remove();
    }

    return fragment;
  }

  function imageAttachmentsHandling() {
    // There is need to resize image attachment if total compose
    // size doen't exceed mms size limitation.
    if (Compose.size < Settings.mmsSizeLimitation) {
      onContentChanged();
      return;
    }

    var nodes = dom.message.querySelectorAll('iframe');
    var imgNodes = [];
    var done = 0;
    Array.prototype.forEach.call(nodes, function findImgNodes(node) {
      var item = attachments.get(node);
      if (item.type === 'img') {
        imgNodes.push(node);
      }
    });

    // Total number of images < 3
    //   => Set max image size to 2/5 message size limitation.
    // Total number of images >= 3
    //   => Set max image size to 1/5 message size limitation.
    var images = imgNodes.length;
    var limit = images > 2 ? Settings.mmsSizeLimitation * 0.2 :
                             Settings.mmsSizeLimitation * 0.4;

    function imageSized() {
      if (++done === images) {
        state.resizing = false;
        onContentChanged();
      } else {
        resizedImg(imgNodes[done]);
      }
    }

    function resizedImg(node) {
      var item = attachments.get(node);
      if (item.blob.size < limit) {
        imageSized();
      } else {
        Utils.getResizedImgBlob(item.blob, limit, function(resizedBlob) {
          // trigger recalc when resized
          state.size = null;

          item.blob = resizedBlob;
          var newNode = item.render();
          attachments.set(newNode, item);
          if (dom.message.contains(node)) {
            dom.message.insertBefore(newNode, node);
            dom.message.removeChild(node);
          }
          imageSized();
        });
      }
    }
    state.resizing = true;
    resizedImg(imgNodes[0]);
    onContentChanged();
  }

  var segmentInfoTimeout = null;
  function updateSegmentInfoThrottled() {
    // we need to call updateSegmentInfo even in MMS mode if we have only text:
    // if we're in MMS mode because we have a long message, then we need to
    // check when we go back to SMS mode by having a shorter message.
    // A possible solution is to do it only when the user deletes characters in
    // MMS mode.
    if (hasAttachment()) {
      return;
    }

    if (segmentInfoTimeout === null) {
      segmentInfoTimeout = setTimeout(updateSegmentInfo, UPDATE_DELAY);
    }
  }

  function updateSegmentInfo() {
    segmentInfoTimeout = null;

    var value = Compose.getText();

    // saving one IPC call when we clear the composer
    var segmentInfoPromise = value ?
      MessageManager.getSegmentInfo(value) :
      Promise.reject();

    segmentInfoPromise.then(
      function(segmentInfo) {
        state.segmentInfo = segmentInfo;
      }, function(error) {
        state.segmentInfo = {
          segments: 0,
          charsAvailableInLastSegment: 0
        };
      }
    ).then(compose.updateType.bind(Compose))
    .then(trigger.bind(compose, 'segmentinfochange'));
  }

  var compose = {
    init: function composeInit(formId) {
      dom.form = document.getElementById(formId);
      dom.message = document.getElementById('messages-input');
      dom.subject = document.getElementById('messages-subject-input');
      dom.sendButton = document.getElementById('messages-send-button');
      dom.attachButton = document.getElementById('messages-attach-button');
      dom.optionsMenu = document.getElementById('attachment-options-menu');

      // update the placeholder, send button and Compose.type
      dom.message.addEventListener('input', onContentChanged);
      dom.subject.addEventListener('input', onSubjectChanged);

      // we need to bind to keydown & keypress because of #870120
      dom.message.addEventListener('keydown', composeKeyEvents);
      dom.message.addEventListener('keypress', composeKeyEvents);

      dom.message.addEventListener('click',
        this.onAttachmentClick.bind(this));

      dom.optionsMenu.addEventListener('click',
        this.onAttachmentMenuClick.bind(this));

      dom.attachButton.addEventListener('click',
        this.onAttachClick.bind(this));

      this.clearListeners();
      this.clear();

      this.on('type', this.onTypeChange);

      /* Bug 1040144: replace ThreadUI direct invocation by a instanciation-time
       * property */
      ThreadUI.on('recipientschange', this.updateSendButton.bind(this));
      // Bug 1026384: call updateType as well when the recipients change

      return this;
    },

    on: function(type, handler) {
      if (handlers[type]) {
        handlers[type].push(handler);
      }
      return this;
    },

    off: function(type, handler) {
      if (handlers[type]) {
        var index = handlers[type].indexOf(handler);
        if (index !== -1) {
          handlers[type].splice(index, 1);
        }
      }
      return this;
    },

    clearListeners: function() {
      for (var type in handlers) {
        handlers[type] = [];
      }
    },

    getContent: function() {
      return getContentFromDOM(dom.message);
    },

    getSubject: function() {
      return subject.getContent();
    },

    isSubjectMaxLength: function() {
      return subject.getContent().length >= subject.getMaxLength();
    },

    isSubjectEmpty: function() {
      return subject.isEmpty;
    },

    isMultilineSubject: function() {
      return subject.isMultiline();
    },

    toggleSubject: function() {
      subject.toggle();
    },
    /** Render draft
     *
     * @param {Draft} draft Draft to be loaded into the composer.
     *
     */
    fromDraft: function(draft) {
      // Clear out the composer
      this.clear();

      // If we don't have a draft, return only having cleared the composer
      if (!draft) {
        return;
      }

      if (draft.subject) {
        subject.setContent(draft.subject);
        subject.toggle();
      }

      // draft content is an array
      draft.content.forEach(function(fragment) {
        // If the fragment is an attachment
        // use the stored content to instantiate a new Attachment object
        // to be properly rendered after a cold start for the app
        if (fragment.blob) {
          fragment = new Attachment(fragment.blob, {
            isDraft: true
          });
        }
        // Append each fragment in order to the composer
        Compose.append(fragment);
      }, Compose);

      this.focus();

      // Put the cursor at the end of the message
      var selection = window.getSelection();
      selection.selectAllChildren(dom.message);
      selection.collapseToEnd();
    },

    /** Render message (sms or mms)
     *
     * @param {message} message Full message to be loaded into the composer.
     *
     */
    fromMessage: function(message) {
      this.clear();

      if (message.type === 'mms') {
        if (message.subject) {
          subject.setContent(message.subject);
          subject.show();
        }
        SMIL.parse(message, function(elements) {
          elements.forEach(function(element) {
            if (element.blob) {
              var attachment = new Attachment(element.blob, {
                name: element.name,
                isDraft: true
              });
              this.append(attachment);
            }
            if (element.text) {
              this.append(element.text);
            }
          }, this);
          this.ignoreEvents = false;
          this.focus();
        }.bind(this));
        this.ignoreEvents = true;
      } else {
        this.append(message.body);
        this.focus();
      }
    },

    getText: function() {
      var out = this.getContent().filter(function(elem) {
        return (typeof elem === 'string');
      });
      return out.join('');
    },

    isEmpty: function() {
      return state.empty;
    },

    /** Stop further input because the max size is exceded
     */
    lock: false,

    disable: function(state) {
      dom.sendButton.disabled = state;
      return this;
    },

    scrollToTarget: function(target) {
      // target can be an element or a selection range
      var targetRect = target.getBoundingClientRect();

      // put the middle of the target at the middle of the container box
      var containerRect = dom.message.getBoundingClientRect();
      var offset = (targetRect.top + targetRect.height / 2) -
          (containerRect.top + containerRect.height / 2);

      // we += because the scrollTop that was set is already compensated
      // with the getBoundingClientRect()
      dom.message.scrollTop += offset;
    },

    scrollMessageContent: function() {
      if (document.activeElement === dom.message) {
        // we just got the focus: ensure the caret is visible
        var range = window.getSelection().getRangeAt(0);
        if (range.collapsed) {
          // We can't get the bounding client rect of a collapsed range,
          // so let's insert a temporary node to get the caret position.
          range.insertNode(document.createElement('span'));
          this.scrollToTarget(range);
          range.deleteContents();
        } else {
          this.scrollToTarget(range);
        }
        state.lastScrollPosition = dom.message.scrollTop;
      } else {
        // we just lost the focus: restore the last scroll position
        dom.message.scrollTop = state.lastScrollPosition;
      }
    },

    /** Writes node to composition element
     * @param {mixed} item Html, DOMNode, or attachment to add
     *                     to composition element.
     * @param {Boolean} position True to append, false to prepend or
     *                           undefined/null for auto (at cursor).
     */
    prepend: function(item) {
      var fragment = insert(item);
      if (!fragment) {
        return this;
      }

      // If the first element is a <br>, it needs to stay first
      // insert after it but before everyting else
      if (dom.message.firstChild && dom.message.firstChild.nodeName === 'BR') {
        dom.message.insertBefore(fragment, dom.message.childNodes[1]);
      } else {
        dom.message.insertBefore(fragment, dom.message.childNodes[0]);
      }

      onContentChanged(item);
      return this;
    },

    // if item is an array,ignore calling onContentChanged for each item
    append: function(item, options) {
      options = options || {};
      if (Array.isArray(item)) {
        var containsImage = false;
        item.forEach(function(content) {
          if (content.type === 'img') {
            containsImage = true;
          }
          this.append(content, {ignoreChange: true});
        }, this);
        onContentChanged({containsImage: containsImage});
      } else {
        var fragment = insert(item);
        if (!fragment) {
          return this;
        }

        if (document.activeElement === dom.message) {
          // insert element at caret position
          var range = window.getSelection().getRangeAt(0);
          var firstNodes = fragment.firstChild;
          range.deleteContents();
          range.insertNode(fragment);
          this.scrollToTarget(range);
          dom.message.focus();
          range.setStartAfter(firstNodes);
        } else {
          // insert element at the end of the Compose area
          dom.message.insertBefore(fragment, dom.message.lastChild);
          this.scrollToTarget(dom.message.lastChild);
        }
        if (!options.ignoreChange) {
          onContentChanged(item);
        }
      }
      return this;
    },

    clear: function() {
      // changing the type here prevents the "type" event from being fired
      state.type = 'sms';
      this.onTypeChange();

      dom.message.innerHTML = '<br>';
      subject.clear().hide();
      state.resizing = false;
      state.size = 0;
      state.segmentInfo = {
        segments: 0,
        charsAvailableInLastSegment: 0
      };
      segmentInfoTimeout = null;
      onContentChanged();
      return this;
    },

    focus: function() {
      dom.message.focus();
      return this;
    },

    updateType: function() {
      var isTextTooLong =
        state.segmentInfo.segments > Settings.maxConcatenatedMessages;
      /* Bug 1026384: if a recipient is a mail, the type must be MMS
       * Bug 1040144: replace ThreadUI direct invocation by a instanciation-time
       * property
      var hasEmailRecipient = ThreadUI.recipients.list.some(
        function(recipient) { return recipient.isEmail; }
      );
      */

      /* Note: in the future, we'll maybe want to force 'mms' from the UI */
      var newType =
        hasAttachment() || hasSubject() || isTextTooLong ?
        'mms' : 'sms';

      if (newType !== state.type) {
        state.type = newType;
        trigger.call(this, 'type');
      }
    },

    updateEmptyState: function() {
      state.empty = state.emptyMessage && !hasSubject();
    },

    // Send button management
    /* The send button should be enabled only in the situations where:
     * - The subject is showing and is not empty (it has text)
     * - The message is not empty (it has text or attachment)
    */
    updateSendButton: function() {
      // should disable if we have no message input
      var disableSendMessage = state.empty || state.resizing;
      var messageNotLong = compose.size <= Settings.mmsSizeLimitation;

      /* Bug 1040144: replace ThreadUI direct invocation by a instanciation-time
       * property */
      var recipients = ThreadUI.recipients;
      var recipientsValue = recipients.inputValue;
      var hasRecipients = false;

      // Set hasRecipients to true based on the following conditions:
      //
      //  1. There is a valid recipients object
      //  2. One of the following is true:
      //      - The recipients object contains at least 1 valid recipient
      //        - OR -
      //      - There is >=1 character typed and the value is a finite number
      //
      if (recipients &&
          (recipients.numbers.length ||
            (recipientsValue && isFinite(recipientsValue)))) {

        hasRecipients = true;
      }

      // should disable if the message is too long
      disableSendMessage = disableSendMessage || !messageNotLong;

      // should disable if we have no recipients in the "new thread" view
      disableSendMessage = disableSendMessage ||
        (Navigation.isCurrentPanel('composer') && !hasRecipients);

      this.disable(disableSendMessage);
    },

    _onAttachmentRequestError: function c_onAttachmentRequestError(err) {
      if (err === 'file too large') {
        alert(navigator.mozL10n.get('files-too-large', { n: 1 }));
      } else {
        console.warn('Unhandled error spawning activity:', err);
      }
    },

    onAttachClick: function thui_onAttachClick(event) {
      var request = this.requestAttachment();
      request.onsuccess = this.append.bind(this);
      request.onerror = this._onAttachmentRequestError;
    },

    onAttachmentClick: function thui_onAttachmentClick(event) {
      if (event.target.classList.contains(attachmentClass) && !state.resizing) {
        this.currentAttachmentDOM = event.target;
        this.currentAttachment = attachments.get(event.target);
        AttachmentMenu.open(this.currentAttachment);
      }
    },

    onAttachmentMenuClick: function thui_onAttachmentMenuClick(event) {
      event.preventDefault();
      switch (event.target.id) {
        case 'attachment-options-view':
          this.currentAttachment.view();
          break;
        case 'attachment-options-remove':
          attachments.delete(this.currentAttachmentDOM);
          dom.message.removeChild(this.currentAttachmentDOM);
          state.size = null;
          onContentChanged();
          AttachmentMenu.close();
          break;
        case 'attachment-options-replace':
          var request = this.requestAttachment();
          request.onsuccess = (function replaceAttachmentWith(newAttachment) {
            var fragment = insert(newAttachment);

            dom.message.insertBefore(fragment, this.currentAttachmentDOM);
            dom.message.removeChild(this.currentAttachmentDOM);

            onContentChanged(newAttachment);
            AttachmentMenu.close();
          }).bind(this);
          request.onerror = this._onAttachmentRequestError;
          break;
        case 'attachment-options-cancel':
          AttachmentMenu.close();
          break;
      }
    },

    onTypeChange: function c_onTypeChange() {
      if (this.type === 'sms') {
        dom.message.setAttribute('x-inputmode', '-moz-sms');
      } else {
        dom.message.removeAttribute('x-inputmode');
      }

      dom.form.dataset.messageType = this.type;
    },

    /** Initiates a 'pick' MozActivity allowing the user to create an
     * attachment
     * @return {Object} requestProxy A proxy for the underlying DOMRequest API.
     *                               An "onsuccess" and/or "onerror" callback
     *                               method may optionally be defined on this
     *                               object.
     */
    requestAttachment: function() {
      // Mimick the DOMRequest API
      var requestProxy = {};
      var activityData = {
        type: ['image/*', 'audio/*', 'video/*']
      };
      var activity;

      if (Settings.mmsSizeLimitation) {
        activityData.maxFileSizeBytes = Settings.mmsSizeLimitation;
      }

      activity = new MozActivity({
        name: 'pick',
        data: activityData
      });

      activity.onsuccess = function() {
        var result = activity.result;

        if (Settings.mmsSizeLimitation &&
          result.blob.size > Settings.mmsSizeLimitation &&
          Utils.typeFromMimeType(result.blob.type) !== 'img') {
          if (typeof requestProxy.onerror === 'function') {
            requestProxy.onerror('file too large');
          }
          return;
        }

        if (typeof requestProxy.onsuccess === 'function') {
          requestProxy.onsuccess(new Attachment(result.blob, {
            name: result.name,
            isDraft: true
          }));
        }
      };

      // Re-throw Gecko-level errors
      activity.onerror = function() {
        if (typeof requestProxy.onerror === 'function') {
          requestProxy.onerror.apply(requestProxy, arguments);
        }
      };

      return requestProxy;
    }

  };

  Object.defineProperty(compose, 'type', {
    get: function composeGetType() {
      return state.type;
    }
  });

  Object.defineProperty(compose, 'size', {
    get: function composeGetSize() {
      if (state.size === null) {
        state.size = this.getContent().reduce(function(sum, content) {
          if (typeof content === 'string') {
            return sum + content.length;
          } else {
            return sum + content.size;
          }
        }, 0);
      }

      return state.size;
    }
  });

  Object.defineProperty(compose, 'segmentInfo', {
    get: function composeGetSegmentInfo() {
      return state.segmentInfo;
    }
  });

  Object.defineProperty(compose, 'isResizing', {
    get: function composeGetResizeState() {
      return state.resizing;
    }
  });

  Object.defineProperty(compose, 'isSubjectVisible', {
    get: function composeGetResizeState() {
      return subject.isShowing;
    }
  });

  Object.defineProperty(compose, 'subjectMaxLength', {
    get: function composeGetResizeState() {
      return subject.getMaxLength();
    }
  });

  Object.defineProperty(compose, 'ignoreEvents', {
    set: function composeIgnoreEvents(value) {
      dom.message.classList.toggle('ignoreEvents', value);
    }
  });

  return compose;
}());
