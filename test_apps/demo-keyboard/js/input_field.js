/*
 * This module defines an InputField object that represents the text field
 * textarea, or content editable element that they keyboard is interacting with.
 * The properties of the object give the type and state of the input field.
 * The methods of the InputField object modify the text in the input field.
 *
 * The InputField object fires a 'inputstatechanged' event when the text
 * or the cursor position of the input field has changed. This happens
 * immediately in response to sendKey() or other mutatation methods.
 *
 * The object fires an 'inputfieldchanged' event if the input field (or the
 * type or inputmode of the field) changes.
 *
 * This is a wrapper around navigator.mozInputMethod.inputcontext.
 * The inputcontext defines the API that a keyboard uses to interact with
 * an HTML input field (input element, textarea element or any contenteditable
 * element).  This class wraps sendKey and other methods used to alter the
 * text in the input field. And it wraps textBeforeCursor and other properties
 * used to retreive the text (and the cursor position) from the input field.
 *
 * The reason that this wrapper exists is that the raw inputcontext object
 * does not immediately reflect state changes. If you call sendKey() on an
 * input context, the newly sent key does not get appended to textBeforeCursor
 * until a round-trip occurs between the keyboard app and the system, so
 * there can be a ~100ms delay before the inputcontext dispatches
 * selectionchanged and surroundingtextchanged events and the inputcontext
 * properties are updated.
 *
 * What this wrapper does is maintain a local copy of the input field
 * state and updates the local state synchronously when sendKey and other
 * mutation methods are called. It then sends out its own inputstatechanged
 * event, anticipating the inputcontext events that will occur asynchonously.
 *
 * The wrapper monitors the asynchonous changes to the state of the
 * input context, and if it finds that its local copy of the state
 * does not match the true state (perhaps the target input field has
 * event handlers that modify state on incoming events) then it syncs
 * the state and sends a new inputstatechanged event.
 */
(function(exports) {
  'use strict';

  // Our local copy of navigator.mozInputMethod.inputcontext
  var context;

  // Our local copy of the input state from the input context
  var inputType = null, inputMode = null;
  var selectionStart = 0, selectionEnd = 0;
  var textBeforeCursor = '', textAfterCursor = '';

  // A dummy element that we use as EventTarget.
  var dispatcher = document.createElement('div');

  // This is the Promise object from the most recent, if it has not
  // resolved yet.
  var pendingPromise;

  // Set our initial state
  syncState();

  // Any time the input context changes, sync our state with it
  navigator.mozInputMethod.addEventListener('inputcontextchange',
                                            handleChangeEvent);

  // Get our internal state in sync with the inputcontext, and trigger
  // appropriate events if we are out of sync. This is called when we
  // get events, and also when promises resolve to make sure that the state
  // we anticipated matches the actual state.
  function syncState() {
    var statechanged = false;
    var contextchanged = false;

    var c = navigator.mozInputMethod.inputcontext;

    // If we changed to or from undefined
    // navigator.mozInputMethod.inputcontext returns a different
    // object each time so we can't compare two contexts, but if we've changed
    // to or from null or undefined, then this is a context change
    if (!context && c || context && !c) {
      contextchanged = true;
      context = c;
      if (c) {
        c.addEventListener('selectionchange', handleChangeEvent);
        c.addEventListener('surroundingtextchange', handleChangeEvent);
      }
    }

    if (c) {
      if (inputMode !== c.inputMode) {
        contextchanged = true;
        inputMode = c.inputMode;
      }

      if (inputType !== c.inputType) {
        contextchanged = true;
        inputType = c.inputType;
      }

      if (textBeforeCursor !== c.textBeforeCursor) {
        statechanged = true;
        textBeforeCursor = c.textBeforeCursor;
      }
      if (textAfterCursor !== c.textAfterCursor) {
        statechanged = true;
        textAfterCursor = c.textAfterCursor;
      }
      if (selectionStart !== c.selectionStart) {
        statechanged = true;
        selectionStart = c.selectionStart;
      }
      if (selectionEnd !== c.selectionEnd) {
        statechanged = true;
        selectionEnd = c.selectionStart;
      }
    }
    else {
      inputType = inputMode = null;
      selectionStart = selectionEnd = 0;
      textBeforeCursor = textAfterCursor = '';
    }

    if (contextchanged) {
      dispatchInputFieldChanged();
    }
    else if (statechanged) {
      dispatchInputStateChanged();
    }
  }

  // Handles inputcontextchange events from navigator.mozInputMethod
  // And selectionchange and surroundingtextchange events from the inputcontext.
  // In all of these cases we just call _syncState to update our state and
  // generate the appropriate events.
  function handleChangeEvent(e) {
    // We always handle inputcontextchange events But only handle
    // selectionchange and surroundingtextchange events if there is
    // not a pendingPromise. This presumably means they were
    // user-initiated and not just responses to mutations cased
    // here. If there is a pending promise, then we sync our state
    // when the promise resolves instead of doing it here. (Otherwise
    // if the user types really quickly we could modify the state a
    // second time before the first events were generated and would
    // think we were out of sync when we weren't.  Notice that this
    // requires that the inputcontext dispaches events before
    // resolving its promises.
    if (e.type === 'inputcontextchange') {
      syncState();
    }
    else if (!pendingPromise) {
      syncState();
    }
  }

  function sendKey(keycode, charcode, modifiers) {
    monitor(context.sendKey(keycode, charcode, modifiers));

    if (charcode) {
      textBeforeCursor += String.fromCharCode(charcode);
      selectionStart = selectionEnd = selectionStart + 1;
    }
    else if (keycode === 8 && textBeforeCursor) {
      textBeforeCursor = textBeforeCursor.slice(0, -1);
      selectionStart = selectionEnd = selectionStart - 1;
    }
    else if (keycode === 13) {
      textBeforeCursor += '\n';
      selectionStart = selectionEnd = selectionStart + 1;
    }
    else {
      // No state change so return before dispatching an event
      // XXX: If we ever do cursor movement, handle that here?
      return;
    }

    dispatchInputStateChanged();
  }

  function replaceSurroundingText(text, numBefore, numAfter) {
    monitor(context.replaceSurroundingText(text, -numBefore,
                                           numBefore + numAfter));

    textBeforeCursor = textBeforeCursor.slice(0, -numBefore) + text;
    if (numAfter)
      textAfterCursor = textAfterCursor.substring(numAfter);
    selectionStart = selectionEnd = textBeforeCursor.length;

    dispatchInputStateChanged();
  }

  function deleteSurroundingText(numBefore, numAfter) {
    monitor(context.deleteSurroundingText(-numBefore, numBefore + numAfter));
  }

  function monitor(promise) {
    pendingPromise = promise;
    promise.then(fulfilled, rejected);

    function fulfilled() {
      // If the user is typing really fast, there might be a new pending promise
      // by the time this one is fulfilled. If so, we just ignore this.
      if (promise === pendingPromise) {
        pendingPromise = null;

        // Otherwise make sure that the real input field state matches
        // the state we anticipated.
        syncState();
      }
    }

    function rejected(e) {
      console.error('Promise rejected:', e);
      if (promise === pendingPromise)
        pendingPromise = null;
    }
  };

  // EventTarget methods
  function addEventListener(type, handler) {
    dispatcher.addEventListener(type, handler);
  }

  function removeEventListener(type, handler) {
    dispatcher.removeEventListener(type, handler);
  }

  function dispatchInputStateChanged() {
    // XXX: set a flag while dispatching this event to prevent
    // mutation methods from being called?
    dispatcher.dispatchEvent(new Event('inputstatechanged'));
  }

  function dispatchInputFieldChanged() {
    dispatcher.dispatchEvent(new Event('inputfieldchanged'));
  };

  const SENTENCE_START_BEFORE = /^$|[\.?!]\s{1,2}$/;
  const SENTENCE_START_AFTER = /^$|^\s/;

  function atSentenceStart() {
    return textBeforeCursor.match(SENTENCE_START_BEFORE) &&
      textAfterCursor.match(SENTENCE_START_AFTER);
  }

  // We're at the end of a word if the character before the cursor is not
  // a word separator and if there is nothing or a space after the cursor.
  const WORD_END_BEFORE = /[^\s.,?!;:]$/;
  const WORD_END_AFTER = /^$|^\s/;

  function atWordEnd() {
    // If there is a selection don't look at words
    if (selectionStart !== selectionEnd)
      return false;
    return textBeforeCursor.match(WORD_END_BEFORE) &&
      textAfterCursor.match(WORD_END_AFTER);
  }

  // One or more non-space, non-punctuation characters right before the cursor
  const WORD_BEFORE_CURSOR = /[^\s.,?!;:]+$/;

  function wordBeforeCursor() {
    var match = textBeforeCursor.match(WORD_BEFORE_CURSOR);
    if (match)
      return match[0];
    else
      return '';
  }

  exports.InputField = {
    get inputType() { return inputType; },
    get inputMode() { return inputMode; },
    get selectionStart() { return selectionStart; },
    get selectionEnd() { return selectionEnd; },
    get textBeforeCursor() { return textBeforeCursor; },
    get textAfterCursor() { return textAfterCursor; },

    sendKey: sendKey,
    replaceSurroundingText: replaceSurroundingText,
    deleteSurroundingText: deleteSurroundingText,

    addEventListener: addEventListener,
    removeEventListener: removeEventListener,

    // Utilities specific to latin keyboards
    // These can move to a separate file if need be
    atSentenceStart: atSentenceStart,
    atWordEnd: atWordEnd,
    wordBeforeCursor: wordBeforeCursor
  };
}(window));
