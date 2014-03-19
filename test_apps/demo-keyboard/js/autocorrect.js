'use strict';

(function(exports) {

  function AutoCorrect(app) {
    this._started = false;
    this.app = app;
    this.touchHandler = app.touchHandler;
  };

  AutoCorrect.prototype.KEYCODE_SPACE = 32;
  AutoCorrect.prototype.KEYCODE_BACKSPACE = 8;
  // return keycode code isn't the same as newline charcode
  AutoCorrect.prototype.KEYCODE_RETURN = 13;
  AutoCorrect.prototype.KEYCODE_PERIOD = 46;
  AutoCorrect.prototype.KEYCODE_QUESTION = 63;
  AutoCorrect.prototype.KEYCODE_EXCLAMATION = 33;
  AutoCorrect.prototype.KEYCODE_COMMA = 44;
  AutoCorrect.prototype.KEYCODE_COLON = 58;
  AutoCorrect.prototype.KEYCODE_SEMICOLON = 59;

  AutoCorrect.prototype.WORKER_PATH = 'js/worker.js';

  AutoCorrect.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    this.predictionStartTime = undefined;
    this.correction = null;  // A pending correction
    this.reversion = null;   // A pending reversion
    this.autocorrectDisabled = false;
    this.container = this.app.container;

    // worker for predicting the next char and getting word suggestions
    var worker = this.worker = new Worker(this.WORKER_PATH);
    // XXX: english hardcoded for now
    worker.postMessage({ cmd: 'setLanguage', args: ['en_us']});
    // XXX: get real key data
    // XXX: should I have the keyboard generate an event when the
    // current pageview changes?
    worker.postMessage({ cmd: 'setNearbyKeys', args: [{}]});

    worker.addEventListener('message', this);

    // XXX
    // There is a problem here: InputField is not dispatching either event
    // when the user taps in the input field to move the cursor, so the
    // word suggestions are not being cleared or changed.
    this.app.inputField.addEventListener('inputstatechanged', this);
    this.app.inputField.addEventListener('inputfieldchanged', this);

    this.suggestions = new Suggestions(this);
    this.suggestions.start();
    this.suggestions.addEventListener('suggestionselected', this);
    this.suggestions.addEventListener('suggestionsdismissed', this);

    this.touchHandler.addEventListener('key', this);
  };

  AutoCorrect.prototype.stop = function stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    this.app.inputField.removeEventListener('inputstatechanged', this);
    this.app.inputField.removeEventListener('inputfieldchanged', this);
    this.worker.removeEventListener('message', this);

    this.suggestions.removeEventListener('suggestionselected', this);
    this.suggestions.removeEventListener('suggestionsdismissed', this);

    this.touchHandler.removeEventListener('key', this);

    this.predictionStartTime = undefined;
    this.correction = null;  // A pending correction
    this.reversion = null;   // A pending reversion
    this.autocorrectDisabled = false;

    this.worker = null;

    this.suggestions.stop();
    this.suggestions = null;

    this.container = null;
  };

  AutoCorrect.prototype.handleEvent = function handleEvent(evt) {
    switch (evt.type) {
      case 'key':
        // XXX: pass event object here.
        this.handleKey(evt);
        break;

      case 'message':
        this.handleWorkerMessage(evt.data);
        break;

      case 'inputfieldchanged':
      case 'inputstatechanged':
        this.requestPredictions();
        break;

      case 'suggestionselected':
        this.handleSelectionSelected(evt.detail);
        break;

      case 'suggestionsdismissed':
        this.handleSelectionDismissed();
        break;
    }
  };

  AutoCorrect.prototype.handleWorkerMessage =
    function handleWorkerMessage(data) {
      switch (data.cmd) {
        case 'log':
          console.log(data.message);
          break;
        case 'error':
          console.error(data.message);
          break;
        case 'chars':
          // Make sure the prediction is still valid
          if (data.input === this.app.inputField.wordBeforeCursor()) {
            //console.log("char predictions in",
            //            performance.now() - this.predictionStartTime);
            this.touchHandler.setExpectedChars(data.chars);
          }
          break;
        case 'predictions':
          // console.log("word suggestions in",
          //             performance.now() - this.predictionStartTime);
          // The worker is suggesting words: ask the keyboard to display them
          this.handleSuggestions(data.input, data.suggestions);
          break;
      }
    };

  AutoCorrect.prototype.requestPredictions = function requestPredictions() {
    // Undo the result of any previous predictions
    // Change hit target resizing
    this.touchHandler.setExpectedChars([]);

    // Once we start requesting new suggestions, the old ones
    // are no longer valid, and we should hide them now. But if we do that
    // there is a visible flash while we search for the new suggestions
    // before we draw them again. So we don't clear them here and instead
    // allow invalid suggestions to be displayed for 20 to 100ms.
    // We do prevent autocorrection, however, even if the autocorrection
    // is still displayed.
    this.correction = null;

    // If we're at the end of a word, ask the worker to predict
    // what charcters are most likely next and what words we should suggest
    if (this.app.inputField.atWordEnd()) {
      var word = this.app.inputField.wordBeforeCursor();
      this.predictionStartTime = performance.now();
      // XXX: combine these two into a single call
      this.worker.postMessage({ cmd: 'predictNextChar', args: [word] });
      this.worker.postMessage({ cmd: 'predict', args: [word]});
    } else {
      this.suggestions.display([]);
    }
  };

  AutoCorrect.prototype.handleSelectionSelected = function(suggestion) {
    var current = this.app.inputField.wordBeforeCursor();
    this.app.inputField.replaceSurroundingText(suggestion, current.length, 0);
    this.reversion = {
      from: suggestion,
      to: current
    };
    this.correction = null;
    this.autocorrectDisabled = false;
  };

  AutoCorrect.prototype.handleSelectionDismissed = function() {
    this.suggestions.display([]); // clear the suggestions

    // Send a space character
    this.app.inputField.sendKey(0, this.KEYCODE_SPACE, 0);

    // Get rid of pending autocorrection and reset other state
    this.correction = null;
    this.reversion = null;
    this.autocorrectDisabled = false;
  };

  AutoCorrect.prototype.handleKey = function handleKey(evt) {
    var currentPage = this.app.currentPage;
    var inputField = this.app.inputField;

    // autocorrect on space, or re-enable corrections.
    // revert on backspace and temporarily block corrections
    var keyname = evt.detail;
    // XXX: pass the page view with the event
    var keyobj = currentPage.keys[keyname];

    switch (keyobj.keycode) {
    case this.KEYCODE_SPACE:
    case this.KEYCODE_RETURN:
    case this.KEYCODE_PERIOD:
    case this.KEYCODE_QUESTION:
    case this.KEYCODE_EXCLAMATION:
    case this.KEYCODE_COMMA:
    case this.KEYCODE_COLON:
    case this.KEYCODE_SEMICOLON:
      // These characters trigger autocorrection or re-enable autocorrection
      // if it was disabled
      if (this.autocorrectDisabled) {
        this.autocorrectDisabled = false;
      } else if (this.correction &&
                 this.correction.from === inputField.wordBeforeCursor()) {
        var charcode = keyobj.keycode;
        if (charcode === this.KEYCODE_RETURN) {
          charcode = 10;  // Use newline, not carriage return
        }
        var s = this.correction.to + String.fromCharCode(charcode);
        inputField.replaceSurroundingText(s,
                                          this.correction.from.length, 0);

        this.reversion = { from: s, to: this.correction.from };
        this.correction = null;
        evt.stopImmediatePropagation();
      } else {
        this.reversion = null;
      }
      break;

    case this.KEYCODE_BACKSPACE:
      if (this.reversion) {
        if (inputField.textBeforeCursor.endsWith(this.reversion.from)) {
          inputField.replaceSurroundingText(this.reversion.to,
                                            this.reversion.from.length, 0);
          // XXX:
          // if the reversion was from a word suggestion not an autocorrection
          // then we probably should not disable autocorrect
          this.autocorrectDisabled = true;
          evt.stopImmediatePropagation();
        }
        this.reversion = null;
      }
      break;

    default:
      this.reversion = null;
      break;
    }
  };

  // When the worker sends us back word suggestions, we handle them here.
  // The argument is an array of arrays [[word1, weight1], [word2, weight2]...]
  AutoCorrect.prototype.handleSuggestions =
    function handleSuggestions(input, suggestions) {
      if (input !== this.app.inputField.wordBeforeCursor()) {
        // If these suggestions no longer match what is in the input field
        // ignore them
        this.suggestions.display([]);
        return;
      }

      // See if the user's input is a valid word on the list of suggestions
      var inputIsSuggestion = false;
      var inputWeight = 0;
      var inputIndex;
      for (inputIndex = 0; inputIndex < suggestions.length; inputIndex++) {
        if (suggestions[inputIndex][0] === input) {
          inputIsSuggestion = true;
          inputWeight = suggestions[inputIndex][1];
          break;
        }
      }

      // We never want to display the user's input as a suggestion so
      // remove it from the list if it is there.
      if (inputIsSuggestion) {
        suggestions.splice(inputIndex, 1);
      }

      // If we don't have any suggestions we're done
      if (suggestions.length === 0) {
        this.suggestions.display([]);
        return;
      }

      // Make sure we have no more than three words
      if (suggestions.length > 3)
        suggestions.length = 3;

      // Now get an array of just the suggested words
      var words = suggestions.map(function(x) { return x[0]; });

      // Decide whether the first word is going to be an autocorrection.
      // If the user's input is already a valid word, then don't
      // autocorrect Unless the first suggested word is more common than
      // the input.  Note that if the first suggested word has a higher
      // weight even after whatever penalty is applied for not matching
      // exactly, then it is significantly more common than the actual input.
      // (This rule means that "ill" will autocorrect to "I'll",
      // "wont" to "won't", etc.)
      if (!this.autocorrectDisabled &&
          (!inputIsSuggestion || suggestions[0][1] > inputWeight)) {
        this.correction = { from: input, to: words[0] };
        words[0] = '*' + words[0]; // Special code for the Suggestions module
      } else {
        this.correction = null;
      }

      this.suggestions.display(words);
    };

  /*
    I thought about setting this up as a state machine. The states would
    be something like this. Maybe that is overkill.

    State machine:

    State 0: initial state: no suggestions displayed
       oninputstatechange:
       oninputfieldchange:
         if we're at the end of a word ask for suggestions

       onmessage:
         when we get suggestions, display them, decide whether
         we are autocorrecting and switch to state 1

    State 1: suggestions displayed (possibly with autocorrect ready)

       ontouchend:
         if a suggestion was touched, insert it, clear, and go to state 2
         if the cancel button was touched, clear suggestions and go to state 3

       onkey:
         if we are autocorrecting and space or punctuation is pressed
           insert the autocorrection, clear and go to state 2
         otherwise switch back to state 0

       oninputstatechanged:
         this happens synchronously after we insert a suggestion or make
         an autocorrection. Ignore it if we just did that. Otherwise
         switch to state 0 and process.

       oninputfieldchanged:
         this probably means the user tapped somewhere in the field
         switch to state 0 and handle the event in that state

    State 2: just autocorrected (possible to revert)

       onkey:
         If the key is backspace, revert the change and go to state 3.
         Otherwise, go to state 0.

       oninputstatechanged:
         Ignore it if it follows the revert. Otherwise process in state 0

       oninputfieldchanged:
         switch to state 0 and handle the event in that state

    State 3: disabled (because just reverted, or cancelled)
       onkey:
         if the key is space (or return) or punctuation, switch to state 0
         otherwise: do nothing

       oninputfieldchanged:
         switch to state 0 and handle the event in that state



   */

  exports.AutoCorrect = AutoCorrect;
}(window));
