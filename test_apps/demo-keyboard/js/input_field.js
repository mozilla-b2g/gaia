'use strict';

/* global Event */

(function(exports) {
  /**
   * This module defines an InputField instance that represents the text field
   * textarea, or content editable element that they keyboard is interacting
   * with.
   * The properties of the instance give the type and state of the input field.
   * The methods of the InputField instance modify the text in the input field.
   *
   * The InputField instance fires a 'inputstatechanged' event when the text
   * or the cursor position of the input field has changed. This happens
   * immediately in response to sendKey() or other mutatation methods.
   *
   * The instance fires an 'inputfieldchanged' event if the input field (or the
   * type or inputmode of the field) changes.
   *
   * This is a wrapper around navigator.mozInputMethod.inputcontext.
   * The inputcontext defines the API that a keyboard uses to interact with
   * an HTML input field (input element, textarea element or any contenteditable
   * element).  This class wraps sendKey and other methods used to alter the
   * text in the input field. And it wraps textBeforeCursor and other properties
   * used to retreive the text (and the cursor position) from the input field.
   *
   * The reason that this wrapper exists is that the raw inputcontext instance
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
   *
   * @class InputField
   */
  function InputField() {
    this._started = false;
  }

  InputField.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    if (!navigator.mozInputMethod) {
      throw 'No navigator.mozInputMethod!';
    }
    this._started = true;

    // Our local copy of navigator.mozInputMethod.inputcontext
    this._context = undefined;

    // Our local copy of the input state from the input context
    this.inputType = undefined;
    this.inputMode = undefined;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.textBeforeCursor = '';
    this.textAfterCursor = '';

    // A dummy element that we use as EventTarget.
    this.dispatcher = document.createElement('div');

    // This is the Promise object from the most recent, if it has not
    // resolved yet.
    this.pendingPromise = undefined;

    // Set our initial state
    this._syncState();

    // Any time the input context changes, sync our state with it
    navigator.mozInputMethod.addEventListener('inputcontextchange', this);
  };

  InputField.prototype.stop = function stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    if (this._context) {
      this._context.removeEventListener('selectionchange', this);
      this._context.removeEventListener('surroundingtextchange', this);
    }

    this._context =
      this.inputType =
      this.inputMode =
      this.selectionStart =
      this.selectionEnd =
      this.textBeforeCursor =
      this.textAfterCursor = undefined;

    this.dispatcher = undefined;

    this.pendingPromise = undefined;

    navigator.mozInputMethod.removeEventListener('inputcontextchange', this);
  };

  // Get our internal state in sync with the inputcontext, and trigger
  // appropriate events if we are out of sync. This is called when we
  // get events, and also when promises resolve to make sure that the state
  // we anticipated matches the actual state.
  InputField.prototype._syncState = function _syncState() {
    var statechanged = false;
    var contextchanged = false;

    var c = navigator.mozInputMethod.inputcontext;

    // If we changed to or from undefined
    // navigator.mozInputMethod.inputcontext returns a different
    // object each time so we can't compare two contexts, but if we've changed
    // to or from null or undefined, then this is a context change
    if (!this._context && c || this._context && !c) {
      contextchanged = true;
      if (this._context) {
        this._context.removeEventListener('selectionchange', this);
        this._context.removeEventListener('surroundingtextchange', this);
      }
      this._context = c;
      if (c) {
        c.addEventListener('selectionchange', this);
        c.addEventListener('surroundingtextchange', this);
      }
    }

    if (c) {
      if (this.inputMode !== c.inputMode) {
        contextchanged = true;
        this.inputMode = c.inputMode;
      }

      if (this.inputType !== c.inputType) {
        contextchanged = true;
        this.inputType = c.inputType;
      }

      if (this.textBeforeCursor !== c.textBeforeCursor) {
        statechanged = true;
        this.textBeforeCursor = c.textBeforeCursor;
      }
      if (this.textAfterCursor !== c.textAfterCursor) {
        statechanged = true;
        this.textAfterCursor = c.textAfterCursor;
      }
      if (this.selectionStart !== c.selectionStart) {
        statechanged = true;
        this.selectionStart = c.selectionStart;
      }
      if (this.selectionEnd !== c.selectionEnd) {
        statechanged = true;
        this.selectionEnd = c.selectionStart;
      }
    } else {
      this.inputType = this.inputMode = undefined;
      this.selectionStart = this.selectionEnd = 0;
      this.textBeforeCursor = this.textAfterCursor = '';
    }

    if (contextchanged) {
      this._dispatchInputFieldChanged();
    } else if (statechanged) {
      this._dispatchInputStateChanged();
    }
  };

  // Handles inputcontextchange events from navigator.mozInputMethod
  // And selectionchange and surroundingtextchange events from the inputcontext.
  // In all of these cases we just call _syncState to update our state and
  // generate the appropriate events.
  InputField.prototype.handleEvent = function handleEvent(evt) {
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
    if (evt.type === 'inputcontextchange') {
      this._syncState();
    } else if (!this.pendingPromise) {
      this._syncState();
    }
  };

  InputField.prototype.sendKey = function sendKey(keycode, charcode,
                                                  modifiers) {
    this._monitor(this._context.sendKey(keycode, charcode, modifiers));

    if (charcode) {
      this.textBeforeCursor += String.fromCharCode(charcode);
      this.selectionStart = this.selectionEnd = this.selectionStart + 1;
    } else if (keycode === 8 && this.textBeforeCursor) {
      this.textBeforeCursor = this.textBeforeCursor.slice(0, -1);
      this.selectionStart = this.selectionEnd = this.selectionStart - 1;
    } else if (keycode === 13) {
      this.textBeforeCursor += '\n';
      this.selectionStart = this.selectionEnd = this.selectionStart + 1;
    } else {
      // No state change so return before dispatching an event
      // XXX: If we ever do cursor movement, handle that here?
      return;
    }

    this._dispatchInputStateChanged();
  };

  InputField.prototype.replaceSurroundingText =
    function replaceSurroundingText(text, numBefore, numAfter) {
      this._monitor(this._context.replaceSurroundingText(text, -numBefore,
                                                         numBefore + numAfter));

      this.textBeforeCursor =
        this.textBeforeCursor.slice(0, -numBefore) + text;
      if (numAfter) {
        this.textAfterCursor = this.textAfterCursor.substring(numAfter);
      }
      this.selectionStart = this.selectionEnd = this.textBeforeCursor.length;

      this._dispatchInputStateChanged();
    };

  InputField.prototype.deleteSurroundingText =
    function deleteSurroundingText(numBefore, numAfter) {
      this._monitor(this._context.deleteSurroundingText(-numBefore,
                                                       numBefore + numAfter));
    };

  InputField.prototype._monitor = function _monitor(promise) {
    this.pendingPromise = promise;
    promise.then(function fulfilled() {
      // If the user is typing really fast, there might be a new pending promise
      // by the time this one is fulfilled. If so, we just ignore this.
      if (promise === this.pendingPromise) {
        this.pendingPromise = null;

        // Otherwise make sure that the real input field state matches
        // the state we anticipated.
        this._syncState();
      }
    }.bind(this), function rejected(e) {
      console.error('Promise rejected:', e);
      if (promise === this.pendingPromise) {
        this.pendingPromise = null;
      }
    }.bind(this));
  };

  // EventTarget methods
  InputField.prototype.addEventListener =
    function addEventListener(type, handler) {
      this.dispatcher.addEventListener(type, handler);
    };

  InputField.prototype.removeEventListener =
    function removeEventListener(type, handler) {
      this.dispatcher.removeEventListener(type, handler);
    };

  InputField.prototype._dispatchInputStateChanged =
    function _dispatchInputStateChanged() {
      // XXX: set a flag while dispatching this event to prevent
      // mutation methods from being called?
      this.dispatcher.dispatchEvent(new Event('inputstatechanged'));
    };

  InputField.prototype._dispatchInputFieldChanged =
    function _dispatchInputFieldChanged() {
      this.dispatcher.dispatchEvent(new Event('inputfieldchanged'));
    };

  // Utilities specific to latin keyboards
  // These can move to a separate file if need be

  InputField.prototype.SENTENCE_START_BEFORE = /^$|[\.?!]\s{1,2}$/;
  InputField.prototype.SENTENCE_START_AFTER = /^$|^\s/;

  InputField.prototype.atSentenceStart = function atSentenceStart() {
    return (this.textBeforeCursor.match(this.SENTENCE_START_BEFORE) &&
      this.textAfterCursor.match(this.SENTENCE_START_AFTER));
  };

  // We're at the end of a word if the character before the cursor is not
  // a word separator and if there is nothing or a space after the cursor.
  InputField.prototype.WORD_END_BEFORE = /[^\s.,?!;:]$/;
  InputField.prototype.WORD_END_AFTER = /^$|^\s/;

  InputField.prototype.atWordEnd = function atWordEnd() {
    // If there is a selection don't look at words
    if (this.selectionStart !== this.selectionEnd) {
      return false;
    }
    return (this.textBeforeCursor.match(this.WORD_END_BEFORE) &&
      this.textAfterCursor.match(this.WORD_END_AFTER));
  };

  // One or more non-space, non-punctuation characters right before the cursor
  InputField.prototype.WORD_BEFORE_CURSOR = /[^\s.,?!;:]+$/;

  InputField.prototype.wordBeforeCursor = function wordBeforeCursor() {
    var match = this.textBeforeCursor.match(this.WORD_BEFORE_CURSOR);
    if (match) {
      return match[0];
    } else {
      return '';
    }
  };

  exports.InputField = InputField;
}(window));
