/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Settings, Utils, Attachment, MozActivity, SMIL,
        MessageManager,
        SubjectComposer,
        Navigation,
        Promise,
        ConversationView,
        Threads,
        EventDispatcher,
        DOMError,
        OptionMenu
*/
/*exported Compose */

'use strict';

const TYPES = ['image', 'audio', 'video'];

/**
 * Handle UI specifics of message composition. Namely,
 * resetting (auto manages placeholder text), getting
 * message content, and message size
 */
var Compose = (function() {
  // delay between 2 counter updates while composing a message
  const UPDATE_DELAY = 500;

  // Min available chars count that triggers available chars counter
  const MIN_AVAILABLE_CHARS_COUNT = 20;

  var placeholderClass = 'placeholder';
  var attachmentClass = 'attachment-container';

  var attachments = new Map();

  // will be defined in init
  var dom = {
    form: null,
    message: null,
    sendButton: null,
    attachButton: null,
    counter: null
  };

  var state = {
    empty: true,
    maxLength: null,
    size: null,
    lastScrollPosition: 0,
    resizing: false,

    // Stop further input because the max size is exceeded
    locked: false,

    // 'sms' or 'mms'
    type: 'sms',

    segmentInfo: {
      segments: 0,
      charsAvailableInLastSegment: 0
    }
  };

  var subject = null;

  // Given a DOM element, we will extract an array of the
  // relevant nodes as attachment or text
  function getContentFromDOM(domElement) {
    var content = [];
    var node;

    for (node = domElement.firstChild; node; node = node.nextSibling) {
      // hunt for an attachment in the Map and append it
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

  // anytime content changes - takes a parameter to check for image resizing
  function onContentChanged(duck) {
    // Track when content is edited for draft replacement case
    if (ConversationView.draft) {
      ConversationView.draft.isEdited = true;
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

    Compose.emit('input');
  }

  function onSubjectChanged() {
    // Track when content is edited for draft replacement case
    if (ConversationView.draft) {
      ConversationView.draft.isEdited = true;
    }

    Compose.updateEmptyState();
    Compose.updateSendButton();
    Compose.updateType();

    Compose.emit('subject-change');
  }

  function onSubjectVisibilityChanged() {
    if (subject.isVisible()) {
      subject.focus();
      dom.form.classList.add('subject-composer-visible');
    } else {
      dom.message.focus();
      dom.form.classList.remove('subject-composer-visible');
    }
  }

  function hasAttachment() {
    return !!dom.message.querySelector('iframe');
  }

  function hasSubject() {
    return subject.isVisible() && !!subject.getValue();
  }

  function composeKeyEvents(e) {
    // if locking and no-backspace pressed, cancel
    if (state.locked && e.which !== 8) {
      e.preventDefault();
    } else {
      // trigger a recompute of size on the keypresses
      state.size = null;
      compose.unlock();
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

    var imgNodes = [];
    attachments.forEach((attachment, node) => {
      if (attachment.type === 'img') {
        imgNodes.push(node);
      }
    });

    var done = 0;

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
          item.updateFileSize();

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
      return resetSegmentInfo();
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
      }, resetSegmentInfo
    ).then(compose.updateType.bind(Compose))
    .then(compose.emit.bind(compose, 'segmentinfochange'));
  }

  function resetSegmentInfo() {
    state.segmentInfo = {
      segments: 0,
      charsAvailableInLastSegment: 0
    };
  }

  function disposeAttachmentNode(attachmentNode) {
    var thumbnailURL = attachmentNode.dataset.thumbnail;
    if (thumbnailURL) {
      window.URL.revokeObjectURL(thumbnailURL);
    }
    attachments.delete(attachmentNode);
  }

  var compose = {
    init: function composeInit(formId) {
      dom.form = document.getElementById(formId);
      dom.message = document.getElementById('messages-input');
      dom.sendButton = document.getElementById('messages-send-button');
      dom.attachButton = document.getElementById('messages-attach-button');
      dom.counter = dom.form.querySelector('.js-message-counter');
      dom.messagesAttach = dom.form.querySelector('.messages-attach-container');
      dom.composerButton = dom.form.querySelector('.composer-button-container');

      subject = new SubjectComposer(
        dom.form.querySelector('.js-subject-composer')
      );

      subject.on('change', onSubjectChanged);
      subject.on('visibility-change', onSubjectChanged);
      subject.on('visibility-change', onSubjectVisibilityChanged);

      // update the placeholder, send button and Compose.type
      dom.message.addEventListener('input', onContentChanged);

      // we need to bind to keydown & keypress because of #870120
      dom.message.addEventListener('keydown', composeKeyEvents);
      dom.message.addEventListener('keypress', composeKeyEvents);

      dom.message.addEventListener('click',
        this.onAttachmentClick.bind(this));

      dom.attachButton.addEventListener('click',
        this.onAttachClick.bind(this));

      this.offAll();
      this.clear();

      this.on('type', this.onTypeChange.bind(this));
      this.on('type', this.updateMessageCounter.bind(this));
      this.on('segmentinfochange', this.updateMessageCounter.bind(this));

      /* Bug 1040144: replace ConversationView direct invocation by a
       * instantiation-tim property */
      ConversationView.on('recipientschange', this.updateSendButton.bind(this));
      // Bug 1026384: call updateType as well when the recipients change

      if (Settings.supportEmailRecipient) {
        ConversationView.on('recipientschange', this.updateType.bind(this));
      }

      var onInteracted = this.emit.bind(this, 'interact');

      dom.message.addEventListener('focus', onInteracted);
      dom.message.addEventListener('click', onInteracted);
      dom.messagesAttach.addEventListener('click', onInteracted);
      dom.composerButton.addEventListener('click', onInteracted);
      subject.on('focus', onInteracted);

      return this;
    },

    getContent: function() {
      return getContentFromDOM(dom.message);
    },

    getSubject: function() {
      return subject.getValue();
    },

    setSubject: function(value) {
      return subject.setValue(value);
    },

    isSubjectMaxLength: function() {
      return subject.getValue().length >= subject.getMaxLength();
    },

    showSubject: function() {
      subject.show();
    },

    hideSubject: function() {
      subject.hide();
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
        this.setSubject(draft.subject);
        this.showSubject();
      }

      // draft content is an array
      draft.content.forEach(function(fragment) {
        // If the fragment is an attachment
        // use the stored content to instantiate a new Attachment object
        // to be properly rendered after a cold start for the app
        if (fragment.blob) {
          fragment = new Attachment(fragment.blob, {
            name: fragment.name,
            isDraft: true
          });
        }
        // Append each fragment in order to the composer
        Compose.append(fragment);
      }, Compose);

      this.focus();
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
          this.setSubject(message.subject);
          this.showSubject();
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
        }.bind(this));
        this.ignoreEvents = true;
      } else {
        this.append(message.body);
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

    /**
     * Lock composer when size limit is reached.
     */
    lock: function() {
      state.locked = true;
      dom.attachButton.disabled = true;
    },

    /**
     * Unlock composer when size is decreased again.
     */
    unlock: function() {
      state.locked = false;
      dom.attachButton.disabled = false;
    },

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

      // Dispose attachments
      attachments.forEach((attachment, node) => disposeAttachmentNode(node));

      dom.message.innerHTML = '<br>';

      subject.reset();

      state.resizing = false;
      state.size = 0;

      resetSegmentInfo();
      segmentInfoTimeout = null;

      onContentChanged();
      return this;
    },

    focus: function() {
      dom.message.focus();

      // Put the cursor at the end of the message
      var selection = window.getSelection();
      var range = document.createRange();
      var lastChild = dom.message.lastChild;
      if (lastChild.tagName === 'BR') {
        range.setStartBefore(lastChild);
      } else {
        range.setStartAfter(lastChild);
      }
      selection.removeAllRanges();
      selection.addRange(range);

      return this;
    },

    updateType: function() {
      var isTextTooLong =
        state.segmentInfo.segments > Settings.maxConcatenatedMessages;

      /* Bug 1040144: replace ConversationView direct invocation by a
       * instantiation-time property
       */
      var threadPromise = Threads.active || Promise.resolve();
      threadPromise.then((thread) => {
        var recipients = thread ?
          thread.participants :
          ConversationView.recipients && ConversationView.recipients.numbers;
        var hasEmailRecipient = recipients ?
          recipients.some(Utils.isEmailAddress) :
          false;

        /* Note: in the future, we'll maybe want to force 'mms' from the UI */
        var newType =
          hasAttachment() || hasSubject() ||
          hasEmailRecipient || isTextTooLong ?
          'mms' : 'sms';

        if (newType !== state.type) {
          state.type = newType;
          this.emit('type');
        }
      });
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

      /* Bug 1040144: replace ConversationView direct invocation by a
       * instantiation-time property */
      var recipients = ConversationView.recipients;
      var recipientsValue = recipients && recipients.inputValue;
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
      var errId = err instanceof DOMError ? err.name : err.message;
      if (errId === 'file too large') {
        Utils.alert({
          id: 'attached-files-too-large',
          args: {
            n: 1,
            mmsSize: (Settings.mmsSizeLimitation / 1024).toFixed(0)
          }
        });

      //'pick cancelled' is the error thrown when the pick activity app is
      // canceled normally
      } else if (errId !== 'ActivityCanceled' && errId !== 'pick cancelled') {
        console.warn('Unhandled error: ', err);
      }
    },

    onAttachClick: function c_onAttachClick(event) {
      this.requestAttachment().then(
        this.append.bind(this),
        this._onAttachmentRequestError
      );
    },

    onAttachmentClick: function c_onAttachmentClick(event) {
      if (!event.target.classList.contains(attachmentClass) || state.resizing) {
        return;
      }

      var currentAttachmentDOM = event.target;
      var currentAttachment = attachments.get(event.target);
      var name = currentAttachment.name;
      var blob = currentAttachment.blob;
      var options = {
        header: name.substr(name.lastIndexOf('/') + 1)
      };

      // Localize the name of the file type
      var mimeFirstPart = blob.type.substr(0, blob.type.indexOf('/'));
      var fileType = (TYPES.indexOf(mimeFirstPart) > -1) ?
        mimeFirstPart: 'other';

      var onView = () => { currentAttachment.view(); };

      function onRemove() {
        dom.message.removeChild(currentAttachmentDOM);
        disposeAttachmentNode(currentAttachmentDOM);
        state.size = null;
        onContentChanged();
      }

      var onReplace = () => {
        this.requestAttachment().then((newAttachment) => {
          var fragment = insert(newAttachment);

          dom.message.insertBefore(fragment, currentAttachmentDOM);
          dom.message.removeChild(currentAttachmentDOM);
          disposeAttachmentNode(currentAttachmentDOM);
          onContentChanged(newAttachment);
        }, this._onAttachmentRequestError);
      };

      options.items = [
        { l10nId: `view-attachment-${fileType}`, method: onView },
        { l10nId: `remove-attachment-${fileType}`, method: onRemove },
        { l10nId: `replace-attachment-${fileType}`, method: onReplace },
        { l10nId: 'cancel' }
      ];

      new OptionMenu(options).show();
    },

    onTypeChange: function c_onTypeChange() {
      if (this.type === 'sms') {
        dom.message.setAttribute('x-inputmode', '-moz-sms');
      } else {
        dom.message.removeAttribute('x-inputmode');
      }

      dom.form.dataset.messageType = this.type;
    },

    updateMessageCounter: function c_updateMessageCounter() {
      var counterValue = '';

      if (this.type === 'sms') {
        var segments = state.segmentInfo.segments;
        var availableChars = state.segmentInfo.charsAvailableInLastSegment;

        if (segments && (segments > 1 ||
            availableChars <= MIN_AVAILABLE_CHARS_COUNT)) {
          counterValue = availableChars + '/' + segments;
        }
      }

      if (counterValue !== dom.counter.textContent) {
        dom.counter.textContent = counterValue;
      }
    },

    /** Initiates a 'pick' MozActivity allowing the user to create an
     * attachment
     * @return {Promise}  A Promise for the underlying DOMRequest API.
     *                    Resolve will be triggered when activity returns
     *                    successfully with result blob size smaller than limit.
     *                    Reject will be triggered when activity returns error
     *                    or blob size exceeds limit.
     */
    requestAttachment: function() {
      var activityData = {
        type: ['image/*', 'audio/*', 'video/*', 'text/vcard']
      };
      var activity;
      var defer = Utils.Promise.defer();

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

          defer.reject(new Error('file too large'));
        }

        defer.resolve(new Attachment(result.blob, {
          name: result.name,
          isDraft: true
        }));
      };

      // Re-throw Gecko-level errors
      activity.onerror = () => {
        defer.reject(activity.error);
      };

      return defer.promise;
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
    get: function composeIsSubjectVisible() {
      return subject.isVisible();
    }
  });

  Object.defineProperty(compose, 'ignoreEvents', {
    set: function composeIgnoreEvents(value) {
      dom.message.classList.toggle('ignoreEvents', value);
    }
  });

  return EventDispatcher.mixin(compose, [
    'input',
    'type',
    'segmentinfochange',
    'interact',
    'subject-change'
  ]);
}());
