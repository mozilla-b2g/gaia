/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

var IMEngineBase = function engineBase_constructor() {
  this._glue = {};
};

IMEngineBase.prototype = {
  /**
   * Glue ojbect between the IMEngieBase and the IMEManager.
   */
  _glue: {
    /**
     * The source code path of the IMEngine
     * @type String
     */
    path: '',

    /**
     * Sends candidates to the IMEManager
     */
    sendCandidates: function(candidates) {},

    /**
     * Sends pending symbols to the IMEManager.
     */
    sendPendingSymbols: function(symbols) {},

    /**
     * Passes the clicked key to IMEManager for default action.
     * @param {number} keyCode The key code of an integer.
     */
    sendKey: function(keyCode) {},

    /**
     * Sends the input string to the IMEManager.
     * @param {String} str The input string.
     */
    sendString: function(str) {},

    /**
     * Change the keyboad
     * @param {String} keyboard The name of the keyboard.
     */
    alterKeyboard: function(keyboard) {}
  },

  /**
   * Initialization.
   * @param {Glue} glue Glue object of the IMManager.
   */
  init: function engineBase_init(glue) {
    this._glue = glue;
  },

  /**
   * Notifies when a keyboard key is clicked.
   * @param {number} keyCode The key code of an integer number.
   */
  click: function engineBase_click(keyCode) {
  },

  /**
   * Notifies when pending symbols need be cleared
   */
  empty: function engineBase_empty() {
  },

  /**
   * Notifies when a candidate is selected.
   * @param {String} text The text of the candidate.
   * @param {Object} data User data of the candidate.
   */
  select: function engineBase_select(text, data) {
  },

  /**
   * Notifies when the IM is shown
   */
  activate: function engineBase_activate(language, state, options) {
  },

  /**
   * Called when the keyboard is hidden
   */
  deactivate: function engineBase_deactivate() {
  },

  /**
   * Called some time later(depend on handwriting pad settings)
   * after user finished a single writing.
   */
  sendStrokePoints: function engineBase_sendStrokePoints() {
  }
};

var IMEngine = function engine_constructor() {
  IMEngineBase.call(this);
};

IMEngine.prototype = {
  // Implements IMEngineBase
  __proto__: new IMEngineBase(),

  _firstCandidate: '',
  _keypressQueue: [],
  _isWorking: false,
  _cachedPoints: [],

  _isActive: false,

  // Only after handwriting recogonition module is loaded,
  // it will be set to true.
  _isInited: false,

  // Current layout name
  _layoutName: '',

  /**
   * Send candidates list and change composition.
   * @param {Array.<string>} candidates The candidates to be sent.
   * @return {void}  No return value.
   */
  _sendCandidates: function engine_sendCandidates(candidates) {
    var list = [];
    var len = candidates.length;
    for (var id = 0; id < len; id++) {
      var cand = candidates[id];
      list.push([cand, id]);
    }

    if (len > 0) {
      this._firstCandidate = candidates[0];
    }

    this._glue.sendCandidates(list);

    // If candidates is not empty, set composition with its first element,
    // or end composition.
    if (this._firstCandidate) {
      this._glue.setComposition(this._firstCandidate);
    } else {
      this._glue.endComposition();
    }
  },

  _start: function engine_start() {
    if (this._isWorking) {
      return;
    }

    this._isWorking = true;
    this._next();
  },

  _next: function engine_next() {
    if (!this._keypressQueue.length) {
      this._isWorking = false;
      return;
    }

    var code = this._keypressQueue.shift();

    var sendKey = true;

    if (this._firstCandidate) {
      switch (code) {
        case KeyEvent.DOM_VK_BACK_SPACE:
          sendKey = false;
          break;
        case KeyEvent.DOM_VK_RETURN:
        case KeyEvent.DOM_VK_SPACE:
          // candidate list exists; output the first candidate
          this._glue.endComposition(this._firstCandidate);
          sendKey = false;
          break;
        default:
          this._glue.endComposition(this._firstCandidate);
          break;
      }
      this.empty();
    }

    //pass the key to IMEManager for default action
    if (sendKey) {
      this._glue.sendKey(code);
    }
    this._next();
  },

  _alterKeyboard: function engine_changeKeyboard(keyboard) {
    this._resetKeypressQueue();
    this.empty();

    this._glue.alterKeyboard(keyboard);
  },

  _resetKeypressQueue: function engine_abortKeypressQueue() {
    this._keypressQueue = [];
    this._isWorking = false;
  },

  // If handwriting recognition engine is loaded or initialized later
  // than user writing, there are some cached stroke points, do
  // recognition for cached stroke points.
  _handleCachedStrokePoints: function engine_handleCachedStrokePoints() {
    if (this._cachedPoints.length === 0) {
      return;
    }
    var str = Recognition.recognize(this._cachedPoints);
    this._sendCandidates(str);
    this._cachedPoints = [];
  },

  /**
   * Override
   */
  init: function engine_init(glue) {
    var self = this;

    IMEngineBase.prototype.init.call(this, glue);

    // Add event listener for handwriting recognition engine module
    window.addEventListener('hwr_module_is_ready', function moduleLoaded() {
      window.removeEventListener('hwr_module_is_ready', moduleLoaded);

      self._isInited = true;

      // Handle cached stroke points here
      if (self._layoutName && Recognition.setLang(self._layoutName)) {
        self._handleCachedStrokePoints();
      }
    });

    var script = document.createElement('script');
    script.src = 'js/imes/handwriting/hwr/recognition.js';
    document.body.appendChild(script);
  },

  /**
   *Override
   */
  click: function engine_click(keyCode) {
    IMEngineBase.prototype.click.call(this, keyCode);

    switch (keyCode) {
      case -31: // Switch to English Symbol Panel, Page 1
      case -32: // Switch to English Symbol Panel, Page 2
        var index = Math.abs(keyCode);
        var symbolPage = index % 10;
        this._alterKeyboard(
          'zh-Hans-Handwriting-Symbol-En-' + symbolPage);
        break;
      default:
        this._keypressQueue.push(keyCode);
        break;
    }

    this._start();
  },

  /**
   * Override
   */
  select: function engine_select(text, data) {
    IMEngineBase.prototype.select.call(this, text, data);

    this._glue.sendString(text);
    this.empty();
    this._start();
  },

  /**
   * Override
   */
  empty: function engine_empty() {
    IMEngineBase.prototype.empty.call(this);
    this._firstCandidate = '';
    this._sendCandidates([]);
  },

  /**
   * Override
   */
  activate: function engine_activate(language, state, options) {
    IMEngineBase.prototype.activate.call(this, language, state, options);

    // The handwriting recognition engine maybe used by multiple IMEs, we need
    // invoke setLang for different IMEs.
    if (this._isInited) {
      Recognition.setLang(options.layoutName);
    }

    this._layoutName = options.layoutName;
    this._isActive = true;
  },

  /**
   * Override
   */
  deactivate: function engine_deactivate() {
    IMEngineBase.prototype.deactivate.call(this);

    if (!this._isActive) {
      return;
    }

    this._isActive = false;

    this._resetKeypressQueue();
    this.empty();
  },

  sendStrokePoints: function engine_sendStrokePoints(strokePoints) {
    if (this._isInited) {
      var str = Recognition.recognize(strokePoints);
      if (this._firstCandidate) {
        this.select(this._firstCandidate, {});
      }
      this._sendCandidates(str);
      return;
    }

    // If handwriting recognition engine is not loaded or initialized,
    // just cache the stroke points.
    this._cachedPoints = strokePoints;
    return;
  }
};

var handwriting = new IMEngine();

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.handwriting = handwriting;
}
})();
