/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * This file implements a "glue" between FxOS Keyboard app UI and
 * the JSZhuyin library.
 */

var JSZhuyinGaiaKeyboardGlue = function JSZhuyinGaiaKeyboardGlue() {
  this.callbacks = null;
  this.worker = null;

  this.composing = false;
  this.hasCandidate = false;

  this.workerReady = false;
  this.messageQueue = [];

  this.requestId = 0;
  this.handledId = 0;

  this.unloadWorkerTimer = undefined;
};

JSZhuyinGaiaKeyboardGlue.prototype.kDEBUG = false;

JSZhuyinGaiaKeyboardGlue.prototype.DEACTIVATE_TIME = 60000; // 1 minute

JSZhuyinGaiaKeyboardGlue.prototype.init = function jszg_init(callbacks) {
  if (this.kDEBUG)
    console.log('zhuyin:init:' + Date.now());

  this.callbacks = callbacks;
};

JSZhuyinGaiaKeyboardGlue.prototype.uninit = function jszg_uninit() {
  if (this.kDEBUG)
    console.log('zhuyin:uninit:' + Date.now());

  this._unloadWorker();
  this.callbacks = null;
};

JSZhuyinGaiaKeyboardGlue.prototype._loadWorker = function jszg_loadWorker() {
  if (this.kDEBUG)
    console.log('zhuyin:loadWorker:' + Date.now());

  if (this.worker) {
    return;
  }

  var worker = this.worker = new Worker(this.callbacks.path + '/lib/worker.js');
  worker.addEventListener('error', this);
  worker.addEventListener('message', this);
  worker.postMessage({ 'type': 'load' });
};

JSZhuyinGaiaKeyboardGlue.prototype._unloadWorker =
  function jszg_unloadWorker() {
    if (this.kDEBUG)
      console.log('zhuyin:unloadWorker:' + Date.now());

    if (!this.worker) {
      return;
    }

    var worker = this.worker;
    worker.removeEventListener('error', this);
    worker.removeEventListener('message', this);
    worker.terminate();

    this.worker = null;

    this.composing = false;
    this.hasCandidate = false;

    this.workerReady = false;
    this.messageQueue = [];

    this.requestId = 0;
    this.handledId = 0;
  };

JSZhuyinGaiaKeyboardGlue.prototype.click = function jszg_click(code) {
  // Let's not use BopomofoEncoder.isBopomofoSymbol(code) here
  var BOPOMOFO_START = 0x3105;
  var BOPOMOFO_END = 0x3129;
  var BOPOMOFO_TONE_1 = 0x02c9;
  var BOPOMOFO_TONE_2 = 0x02ca;
  var BOPOMOFO_TONE_3 = 0x02c7;
  var BOPOMOFO_TONE_4 = 0x02cb;
  var BOPOMOFO_TONE_5 = 0x02d9;

  // We must handle Bopomofo symbols.
  if (code >= BOPOMOFO_START && code <= BOPOMOFO_END ||
      code === BOPOMOFO_TONE_1 || code === BOPOMOFO_TONE_2 ||
      code === BOPOMOFO_TONE_3 || code === BOPOMOFO_TONE_4 ||
      code === BOPOMOFO_TONE_5) {
    this.sendMessage('handleKeyEvent', code, ++this.requestId);
    return;
  }

  // Send BOPOMOFO_TONE_1 for the SPACE key.
  if (this.composing && code === KeyboardEvent.DOM_VK_SPACE) {
    this.sendMessage('handleKeyEvent', BOPOMOFO_TONE_1, ++this.requestId);
    return;
  }

  // Handle the key anyway if we might be currently composing.
  if (this.composing || this.requestId !== this.handledId) {
    this.sendMessage('handleKeyEvent', code, ++this.requestId);
    return;
  }

  // Before send the key out, remove suggestions.
  if (this.hasCandidate) {
    this.hasCandidate = false;
    this.callbacks.sendCandidates([]);
  }

  // Not handling the key; send it out directly.
  this.callbacks.sendKey(code);
};

JSZhuyinGaiaKeyboardGlue.prototype.select = function jszg_select(text, data) {
  this.sendMessage('selectCandidate', [text, data], ++this.requestId);
};

JSZhuyinGaiaKeyboardGlue.prototype.activate = function jszg_activate() {
  if (this.kDEBUG)
    console.log('zhuyin:activate:' + Date.now());

  if (!this.worker) {
    this._loadWorker();
  }
  clearTimeout(this.unloadWorkerTimer);

  this.empty();
};

JSZhuyinGaiaKeyboardGlue.prototype.deactivate = function jszg_deactivate() {
  if (this.kDEBUG)
    console.log('zhuyin:deactivate:' + Date.now());

  this.empty();

  clearTimeout(this.unloadWorkerTimer);
  this.unloadWorkerTimer =
    setTimeout(this._unloadWorker.bind(this), this.DEACTIVATE_TIME);
};

JSZhuyinGaiaKeyboardGlue.prototype.empty = function jszg_empty() {
  // Simply send escape.
  if (this.composing) {
    this.sendMessage('handleKeyEvent', KeyEvent.DOM_VK_ESCAPE,
                     ++this.requestId);
  }
};

JSZhuyinGaiaKeyboardGlue.prototype.handleEvent =
  function jszg_handleEvent(evt) {
    switch (evt.type) {
      case 'error':
        throw 'JSZhuyinGaiaKeyboardGlue: Worker error.';
        break;

      case 'message':
        this.handleMessage(evt.data);
        break;
    }
  };

JSZhuyinGaiaKeyboardGlue.prototype.handleMessage =
  function jszg_handleMessage(msg) {
    var data = msg.data;

    if (this.kDEBUG) {
      if (Array.isArray(data)) {
        console.log('zhuyin:msg:' + Date.now() +
                    ':' + msg.type + ':' + data.length);
      } else {
        console.log('zhuyin:msg:' + Date.now() + ':' + msg.type + ':' + data);
      }
    }

    switch (msg.type) {
      case 'actionhandled':
        this.handledId = data;
        break;

      case 'loadend':
        this.workerReady = true;
        var msg;
        while (msg = this.messageQueue.shift()) {
          this.sendMessage.apply(this, msg);
        }
        this.messageQueue = undefined;
        break;

      case 'candidateschange':
        this.hasCandidate = data && !!data.length;
        this.callbacks.sendCandidates(data);
        break;

      case 'compositionupdate':
        if (data) {
          // send compositionstart event
          this.callbacks.setComposition(data);
        } else {
          // send compositionend event if we are indeed is composing.
          // (do nothing if we aren't)
          if (this.composing) {
            this.callbacks.endComposition();
          }
        }

        this.composing = !!data;
        break;

      case 'compositionend':
        // We must manually start the composition
        // (i.e. send compositionstart event) first here if we haven't.
        if (!this.composing) {
          this.callbacks.setComposition(data);
        }

        // Send compositionend event.
        this.callbacks.endComposition(data);
        this.composing = false;
        break;
    }
  };

JSZhuyinGaiaKeyboardGlue.prototype.sendMessage =
  function jszg_sendMessage(type, data, reqId) {
    if (!this.worker) {
      throw 'JSZhuyinGaiaKeyboardGlue:' +
        ' attempt to send message w/o load the worker first.';
    }

    if (!this.workerReady) {
      this.messageQueue.push([type, data, reqId]);
      return;
    }

    this.worker.postMessage(
      { 'type': type, 'data': data, 'requestId': reqId });
  };

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.jszhuyin = new JSZhuyinGaiaKeyboardGlue();
}
