/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* global InputMethods, KeyEvent */
/*
 * This file implements a "glue" between FxOS Keyboard app UI and
 * the handwriting recognition library. The recognition engine works
 * in a web worker, it could support multiple languages, and communicates
 * with this "glue" with messages.
 */

var HandwritingGaiaKeyboardGlue = function HandwritingGaiaKeyboardGlue() {
  this.callbacks = null;
  this.worker = null;

  // The state of handwriting recognition engine module,
  // whether it has been loaded into web worker completely.
  this.moduleLoaded = false;
  // The state of handwriting recognition engine,
  // whether it's ready for for recognition.
  this.isReady = false;

  this.firstCandidate = '';
  this.keypressQueue = [];

  this.isWorking = false;
  this.isActive = false;

  // Current language
  this.language = '';

  this.isPredicting = false;

  // For prediction
  this.words = '';

  this.cachedPoints = [];

  this.unloadWorkerTimer = undefined;
};

HandwritingGaiaKeyboardGlue.prototype.DEACTIVATE_TIME = 60000; // 1 minute

HandwritingGaiaKeyboardGlue.prototype.init = function hr_init(callbacks) {
  this.callbacks = callbacks;
};

HandwritingGaiaKeyboardGlue.prototype.uninit = function hr_uninit(callbacks) {
  this._unloadWorker();
  this.callbacks = null;
};

HandwritingGaiaKeyboardGlue.prototype._loadWorker = function hr_loadWorker() {
  if (this.worker) {
    return;
  }

  this.worker = new Worker(this.callbacks.path + '/hwr/worker.js');

  this.worker.onmessage = function(evt) {
    var data = evt.data;

    switch (data.id) {
      case 'init':
        this.moduleLoaded = true;
        this.postMessage('setLang', this.language);
        break;
      case 'setLang':
        this.isReady = data.value;
        if (this.isReady) {
          this._handleCachedStrokePoints();
        }
        break;
      case 'recognize':
        this.isPredicting = false;
        this._sendCandidates(JSON.parse(data.value));
        break;
      case 'getPrediction':
        this.isPredicting = true;
        var predictions = data.value;
        if (predictions) {
          this._sendCandidates(predictions.split(' '));
        }
        break;
      default:
        break;
    }
  }.bind(this);
};

HandwritingGaiaKeyboardGlue.prototype._unloadWorker =
  function hr_unloadWorker() {
    if (this.worker) {
      this.worker.terminate();
    }

    this.handlers = null;
    this.worker = null;
    this.moduleLoaded = false;
    this.isReady = false;
  };

HandwritingGaiaKeyboardGlue.prototype.select = function hr_select(text, data) {
  this.callbacks.sendString(text);
  this.empty();
  this._start();

  if (this.isPredicting) {
    this.words += text;
  } else {
    this.words = text;
    this.isPredicting = true;
  }

  this.postMessage('getPrediction', this.words);
};

HandwritingGaiaKeyboardGlue.prototype.click = function hr_click(keyCode) {
  this.keypressQueue.push(keyCode);

  this._start();
};

HandwritingGaiaKeyboardGlue.prototype.activate =
  function hr_activate(language, state, options) {
    var needsSetLang = this.language != language;
    this.language = language;

    if (!this.worker) {
      this._loadWorker();
    }
    clearTimeout(this.unloadWorkerTimer);

    // The handwriting recognition engine may be used by multiple IMEs,
    // we need set language for different IMEs.
    if (this.moduleLoaded && needsSetLang) {
      this.isReady = false;
      this.postMessage('setLang', language);
    }

    this.isActive = true;
  };

HandwritingGaiaKeyboardGlue.prototype.deactivate = function hr_deactivate() {
  if (!this._isActive) {
    return;
  }

  this.isActive = false;

  this._resetKeypressQueue();
  this.empty();

  clearTimeout(this.unloadWorkerTimer);
  this.unloadWorkerTimer =
    setTimeout(this._unloadWorker.bind(this), this.DEACTIVATE_TIME);
};

HandwritingGaiaKeyboardGlue.prototype.empty = function hr_empty() {
  this.firstCandidate = '';
  this.callbacks.sendCandidates([]);
  this.callbacks.endComposition();
  this.callbacks.app.handwritingPadsManager.clear();
};

HandwritingGaiaKeyboardGlue.prototype.postMessage = function(id, param) {
  if (!this.moduleLoaded) {
    return;
  }

  this.worker.postMessage({
    id: id,
    param: param
  });
};

/**
 * Send candidates list and change composition.
 * @param {Array.<string>} candidates The candidates to be sent.
 * @return {void}  No return value.
 */
HandwritingGaiaKeyboardGlue.prototype._sendCandidates =
  function hr_sendCandidates(candidates) {
    var list = [];
    var len = candidates.length;
    for (var id = 0; id < len; id++) {
      var cand = candidates[id];
      list.push([cand, id]);
    }

    if (len > 0) {
      this.firstCandidate = candidates[0];
    }

    this.callbacks.sendCandidates(list);

    if (this.isPredicting) {
      return;
    }

    if (this.firstCandidate) {
      this.callbacks.setComposition(this.firstCandidate);
    }
  };

HandwritingGaiaKeyboardGlue.prototype._start = function hr_start() {
  if (this.isWorking) {
    return;
  }

  this.isWorking = true;
  this._next();
};

HandwritingGaiaKeyboardGlue.prototype._next = function hr_next() {
  if (!this.keypressQueue.length) {
    this.isWorking = false;
    return;
  }

  var code = this.keypressQueue.shift();

  var sendKey = true;

  if (this.firstCandidate) {
    switch (code) {
      case KeyEvent.DOM_VK_BACK_SPACE:
        sendKey = false;
        this.empty();
        break;
      case KeyEvent.DOM_VK_RETURN:
      case KeyEvent.DOM_VK_SPACE:
        // candidate list exists; output the first candidate
        this.select(this.firstCandidate);
        this.callbacks.app.handwritingPadsManager.clear();
        sendKey = false;
        break;
      default:
        this.callbacks.endComposition(this.firstCandidate);
        this.empty();
        break;
    }
  }

  //pass the key to IMEManager for default action
  if (sendKey) {
    this.callbacks.sendKey(code);
  }
  this._next();
};

HandwritingGaiaKeyboardGlue.prototype._resetKeypressQueue =
  function hr_resetKeypressQueue() {
    this.keypressQueue = [];
    this.isWorking = false;
  };

// If handwriting recognition engine is loaded or initialized later
// than user writing, there are some cached stroke points, do
// recognition for cached stroke points.
HandwritingGaiaKeyboardGlue.prototype._handleCachedStrokePoints =
  function hr_handleCachedStrokePoints() {
    if (this.cachedPoints.length === 0) {
      return;
    }

    this.postMessage('recognize', JSON.stringify(this.cachedPoints));
    this.cachedPoints = [];
  };

HandwritingGaiaKeyboardGlue.prototype.sendStrokePoints =
  function hr_sendStrokePoints(strokePoints) {
    // If handwriting recognition engine is not loaded or is not ready for
    // recognition, cache the stroke points.
    if (!this.moduleLoaded || !this.isReady) {
      this.cachedPoints = strokePoints;
      return;
    }

    this.postMessage('recognize', JSON.stringify(strokePoints));
  };

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.handwriting = new HandwritingGaiaKeyboardGlue();
}
