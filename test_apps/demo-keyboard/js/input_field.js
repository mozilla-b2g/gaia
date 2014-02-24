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
  if (navigator.mozInputMethod.inputcontext) {
    handleInputFieldChanged();
  }

  // A dummy element that we use as EventTarget.
  var dispatcher = document.createElement('div');

  // OK. No clue WTF is going on here, but if I don't put this line here
  // my event handlers don't fire. Need to ask :yxl.
  // Also the event handlers not always work, which is crazy because in mochi
  // they work fine. Needs investigation.
  navigator.mozInputMethod.oninputcontextchange = function() {};

  // Any time the input context changes, sync our state with it
  navigator.mozInputMethod.addEventListener('inputcontextchange',
                                            handleInputFieldChanged);

  function handleInputFieldChanged() {
    context = navigator.mozInputMethod.inputcontext;
    if (context) {
      context.addEventListener('selectionchange', dispatchInputStateChanged);
      context.addEventListener('surroundingtextchange',
        dispatchInputStateChanged);
    }
    dispatcher.dispatchEvent(new Event('inputfieldchanged'));
  }

  function sendKey(keycode, charcode, modifiers) {
    return context.sendKey(keycode, charcode, modifiers);
  }

  function replaceSurroundingText(text, offset, length) {
    return context.replaceSurroundingText(text, offset, length);
  }

  function deleteSurroundingText(offset, length) {
    return context.deleteSurroundingText(offset, length);
  }

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

  const SENTENCE_START_BEFORE = /^$|[\.?!]\s{1,2}$/;
  const SENTENCE_START_AFTER = /^$|^\s/;

  function atSentenceStart() {
    if (!context) return false;

    return context.textBeforeCursor.match(SENTENCE_START_BEFORE) &&
      context.textAfterCursor.match(SENTENCE_START_AFTER);
  }

  // We're at the end of a word if the character before the cursor is not
  // a word separator and if there is nothing or a space after the cursor.
  const WORD_END_BEFORE = /[^\s.,?!;:]$/;
  const WORD_END_AFTER = /^$|^\s/;

  function atWordEnd() {
    // If there is a selection don't look at words
    if (!context || context.selectionStart !== context.selectionEnd)
      return false;
    return context.textBeforeCursor.match(WORD_END_BEFORE) &&
      context.textAfterCursor.match(WORD_END_AFTER);
  }

  // One or more non-space, non-punctuation characters right before the cursor
  const WORD_BEFORE_CURSOR = /[^\s.,?!;:]+$/;

  function wordBeforeCursor() {
    var match = context && context.textBeforeCursor.match(WORD_BEFORE_CURSOR);
    if (match)
      return match[0];
    else
      return '';
  }

  exports.InputField = {
    get inputType() { return context && context.inputType; },
    get inputMode() { return context && context.inputMode; },
    get selectionStart() { return context && context.selectionStart; },
    get selectionEnd() { return context && context.selectionEnd; },
    get textBeforeCursor() { return context && context.textBeforeCursor; },
    get textAfterCursor() { return context && context.textAfterCursor; },

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
