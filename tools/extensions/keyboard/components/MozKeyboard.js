/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/ObjectWrapper.jsm");
Cu.import("resource://gre/modules/DOMRequestHelper.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "cpmm",
  "@mozilla.org/childprocessmessagemanager;1", "nsIMessageSender");

XPCOMUtils.defineLazyServiceGetter(this, "tm",
  "@mozilla.org/thread-manager;1", "nsIThreadManager");

// -----------------------------------------------------------------------
// MozKeyboard
// -----------------------------------------------------------------------

function MozKeyboard() { }

MozKeyboard.prototype = {
  classID: Components.ID("{397a7fdf-2254-47be-b74e-76625a1a66d5}"),

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIB2GKeyboard, Ci.nsIDOMGlobalPropertyInitializer, Ci.nsIObserver
  ]),

  classInfo: XPCOMUtils.generateCI({
    "classID": Components.ID("{397a7fdf-2254-47be-b74e-76625a1a66d5}"),
    "contractID": "@mozilla.org/b2g-keyboard;1",
    "interfaces": [Ci.nsIB2GKeyboard],
    "flags": Ci.nsIClassInfo.DOM_OBJECT,
    "classDescription": "B2G Virtual Keyboard"
  }),

  init: function mozKeyboardInit(win) {
    let principal = win.document.nodePrincipal;
    let perm = Services.perms
               .testExactPermissionFromPrincipal(principal, "keyboard");
    if (perm != Ci.nsIPermissionManager.ALLOW_ACTION) {
      dump("No permission to use the keyboard API for " +
           principal.origin + "\n");
      return null;
    }

    Services.obs.addObserver(this, "inner-window-destroyed", false);
    cpmm.addMessageListener('Keyboard:FocusChange', this);
    cpmm.addMessageListener('Keyboard:SelectionChange', this);

    this._window = win;
    this._utils = win.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindowUtils);
    this.innerWindowID = this._utils.currentInnerWindowID;
    this._focusHandler = null;
    this._selectionHandler = null;
    this._selectionStart = -1;
    this._selectionEnd = -1;
  },

  uninit: function mozKeyboardUninit() {
    Services.obs.removeObserver(this, "inner-window-destroyed");
    cpmm.removeMessageListener('Keyboard:FocusChange', this);
    cpmm.removeMessageListener('Keyboard:SelectionChange', this);

    this._window = null;
    this._utils = null;
    this._focusHandler = null;
    this._selectionHandler = null;
  },

  sendKey: function mozKeyboardSendKey(keyCode, charCode) {
    charCode = (charCode == undefined) ? keyCode : charCode;

    let mainThread = tm.mainThread;
    let utils = this._utils;

    function send(type) {
      mainThread.dispatch(function() {
	      utils.sendKeyEvent(type, keyCode, charCode, null);
      }, mainThread.DISPATCH_NORMAL);
    }

    send("keydown");
    send("keypress");
    send("keyup");
  },

  setSelectedOption: function mozKeyboardSetSelectedOption(index) {
    cpmm.sendAsyncMessage('Keyboard:SetSelectedOption', {
      'index': index
    });
  },

  setValue: function mozKeyboardSetValue(value) {
    cpmm.sendAsyncMessage('Keyboard:SetValue', {
      'value': value
    });
  },

  setSelectedOptions: function mozKeyboardSetSelectedOptions(indexes) {
    cpmm.sendAsyncMessage('Keyboard:SetSelectedOptions', {
      'indexes': indexes
    });
  },

  set onselectionchange(val) {
    this._selectionHandler = val;
  },

  get onselectionchange() {
    return this._selectionHandler;
  },

  get selectionStart() {
    return this._selectionStart;
  },

  get selectionEnd() {
    return this._selectionEnd;
  },

  setSelectionRange: function mozKeyboardSetSelectionRange(start, end) {
    cpmm.sendAsyncMessage('Keyboard:SetSelectionRange', {
      'selectionStart': start,
      'selectionEnd': end
    });
  },

  removeFocus: function mozKeyboardRemoveFocus() {
    cpmm.sendAsyncMessage('Keyboard:RemoveFocus', {});
  },

  set onfocuschange(val) {
    this._focusHandler = val;
  },

  get onfocuschange() {
    return this._focusHandler;
  },

  replaceSurroundingText: function mozKeyboardReplaceSurroundingText(
    text, beforeLength, afterLength) {
    cpmm.sendAsyncMessage('Keyboard:ReplaceSurroundingText', {
      'text': text || '',
      'beforeLength': (typeof beforeLength === 'number' ? beforeLength : 0),
      'afterLength': (typeof afterLength === 'number' ? afterLength: 0)
    });
  },

  receiveMessage: function mozKeyboardReceiveMessage(msg) {
    if (msg.name == "Keyboard:FocusChange") {
       let msgJson = msg.json;
       if (msgJson.type != "blur") {
         this._selectionStart = msgJson.selectionStart;
         this._selectionEnd = msgJson.selectionEnd;
       } else {
         this._selectionStart = 0;
         this._selectionEnd = 0;
       }

      let handler = this._focusHandler;
      if (!handler || !(handler instanceof Ci.nsIDOMEventListener))
        return;

      let detail = {
        "detail": msgJson
      };

      let evt = new this._window.CustomEvent("focuschanged",
          ObjectWrapper.wrap(detail, this._window));
      handler.handleEvent(evt);
    } else if (msg.name == "Keyboard:SelectionChange") {
      let msgJson = msg.json;

      this._selectionStart = msgJson.selectionStart;
      this._selectionEnd = msgJson.selectionEnd;

      let handler = this._selectionHandler;
      if (!handler || !(handler instanceof Ci.nsIDOMEventListener))
        return;

      let evt = new this._window.CustomEvent("selectionchange",
          ObjectWrapper.wrap({}, this._window));
      handler.handleEvent(evt);
    }
  },

  observe: function mozKeyboardObserve(subject, topic, data) {
    let wId = subject.QueryInterface(Ci.nsISupportsPRUint64).data;
    if (wId == this.innerWindowID)
      this.uninit();
  }
};

/**
 * ==============================================
 * InputMethodManager
 * ==============================================
 */
function MozInputMethodManager() { }

MozInputMethodManager.prototype = {
  classID: Components.ID("{7e9d7280-ef86-11e2-b778-0800200c9a66}"),

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIInputMethodManager
  ]),

  classInfo: XPCOMUtils.generateCI({
    "classID": Components.ID("{7e9d7280-ef86-11e2-b778-0800200c9a66}"),
    "contractID": "@mozilla.org/b2g-imm;1",
    "interfaces": [Ci.nsIInputMethodManager],
    "flags": Ci.nsIClassInfo.DOM_OBJECT,
    "classDescription": "B2G Input Method Manager"
  }),

  showAll: function() {
    cpmm.sendAsyncMessage('Keyboard:ShowInputMethodPicker', {});
  },

  next: function() {
    cpmm.sendAsyncMessage('Keyboard:SwitchToNextInputMethod', {});
  },

  supportsSwitching: function() {
    return true;
  },

  hide: function() {
    cpmm.sendAsyncMessage('Keyboard:RemoveFocus', {});
  }
};

/**
 * ==============================================
 * InputMethod
 * ==============================================
 */
function MozInputMethod() { }

MozInputMethod.prototype = {
  _inputcontext: null,

  classID: Components.ID("{4607330d-e7d2-40a4-9eb8-43967eae0142}"),

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIInputMethod,
    Ci.nsIDOMGlobalPropertyInitializer,
    Ci.nsIObserver
  ]),

  classInfo: XPCOMUtils.generateCI({
    "classID": Components.ID("{4607330d-e7d2-40a4-9eb8-43967eae0142}"),
    "contractID": "@mozilla.org/b2g-inputmethod;1",
    "interfaces": [Ci.nsIInputMethod],
    "flags": Ci.nsIClassInfo.DOM_OBJECT,
    "classDescription": "B2G Input Method"
  }),

  init: function mozInputMethodInit(win) {
    let principal = win.document.nodePrincipal;
    let perm = Services.perms
               .testExactPermissionFromPrincipal(principal, "keyboard");
    if (perm != Ci.nsIPermissionManager.ALLOW_ACTION) {
      dump("No permission to use the keyboard API for " +
           principal.origin + "\n");
      return null;
    }

    this._window = win;
    this._mgmt = new MozInputMethodManager();
    this.innerWindowID = win.QueryInterface(Ci.nsIInterfaceRequestor)
                            .getInterface(Ci.nsIDOMWindowUtils)
                            .currentInnerWindowID;

    Services.obs.addObserver(this, "inner-window-destroyed", false);
    cpmm.addMessageListener('Keyboard:FocusChange', this);
    cpmm.addMessageListener('Keyboard:SelectionChange', this);
    cpmm.addMessageListener('Keyboard:GetContext:Result:OK', this);

    // If there already is an active context, then this will trigger
    // a GetContext:Result:OK event, and we can initialize ourselves.
    // Otherwise silently ignored.
    cpmm.sendAsyncMessage("Keyboard:GetContext", {});
  },

  uninit: function mozInputMethodUninit() {
    Services.obs.removeObserver(this, "inner-window-destroyed");
    cpmm.removeMessageListener('Keyboard:FocusChange', this);
    cpmm.removeMessageListener('Keyboard:SelectionChange', this);
    cpmm.removeMessageListener('Keyboard:GetContext:Result:OK', this);

    this._window = null;
    this._inputcontextHandler = null;
    this._mgmt = null;
  },

  receiveMessage: function mozInputMethodReceiveMsg(msg) {
    let json = msg.json;

    switch(msg.name) {
      case 'Keyboard:FocusChange':
        if (json.type !== 'blur') {
          this.setInputContext(json);
        }
        else {
          this.setInputContext(null);
        }
        break;
      case 'Keyboard:SelectionChange':
        this._inputcontext.updateSelectionContext(json);
        break;
      case 'Keyboard:GetContext:Result:OK':
        this.setInputContext(json);
        break;
    }
  },

  observe: function mozInputMethodObserve(subject, topic, data) {
    let wId = subject.QueryInterface(Ci.nsISupportsPRUint64).data;
    if (wId == this.innerWindowID)
      this.uninit();
  },

  get mgmt() {
    return this._mgmt;
  },

  get inputcontext() {
     return this._inputcontext;
  },

  set oninputcontextchange(val) {
    this._inputcontextHandler = val;
  },

  get oninputcontextchange() {
    return this._inputcontextHandler;
  },

  setInputContext: function mozKeyboardContextChange(data) {
    if (this._inputcontext) {
      this._inputcontext.destroy();
      this._inputcontext = null;
    }

    if (data) {
      this._inputcontext = new MozInputContext(data);
      this._inputcontext.init(this._window);
    }

    let handler = this._inputcontextHandler;
    if (!handler || !(handler instanceof Ci.nsIDOMEventListener))
      return;

    let evt = new this._window.CustomEvent("inputcontextchange",
        ObjectWrapper.wrap({}, this._window));
    handler.handleEvent(evt);
  }
};

 /**
 * ==============================================
 * InputContext
 * ==============================================
 */
function MozInputContext(ctx) {
  this._context = {
    inputtype: ctx.type,
    inputmode: ctx.inputmode,
    lang: ctx.lang,
    type: ["textarea", "contenteditable"].indexOf(ctx.type) > -1 ?
              ctx.type :
              "text",
    selectionStart: ctx.selectionStart,
    selectionEnd: ctx.selectionEnd,
    textBeforeCursor: ctx.textBeforeCursor,
    textAfterCursor: ctx.textAfterCursor
  };

  this._contextId = ctx.contextId;
}

MozInputContext.prototype = {
  __proto__: DOMRequestIpcHelper.prototype,

  _context: null,
  _contextId: -1,

  classID: Components.ID("{1e38633d-d08b-4867-9944-afa5c648adb6}"),

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIB2GInputContext,
    Ci.nsIObserver
  ]),

  classInfo: XPCOMUtils.generateCI({
    "classID": Components.ID("{1e38633d-d08b-4867-9944-afa5c648adb6}"),
    "contractID": "@mozilla.org/b2g-inputcontext;1",
    "interfaces": [Ci.nsIB2GInputContext],
    "flags": Ci.nsIClassInfo.DOM_OBJECT,
    "classDescription": "B2G Input Context"
  }),

  init: function ic_init(win) {
    this._window = win;
    this._utils = win.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindowUtils);

    this.initDOMRequestHelper(win,
      ["Keyboard:GetText:Result:OK",
       "Keyboard:GetText:Result:Error",
       "Keyboard:SetSelectionRange:Result:OK",
       "Keyboard:ReplaceSurroundingText:Result:OK",
       "Keyboard:SendKey:Result:OK",
       "Keyboard:SequenceError"]);
  },

  destroy: function ic_destroy() {
    let self = this;

    // All requests that are still pending need to be invalidated
    // because the context is no longer valid.
    Object.keys(self._requests).forEach(function(k) {
      // takeRequest also does a delete from context
      let req = self.takeRequest(k);
      Services.DOMRequest.fireError(req, "InputContext got destroyed");
    });

    this.destroyDOMRequestHelper();

    // A consuming application might still hold a cached version of this
    // object. After destroying the DOMRequestHelper all methods will throw
    // because we cannot create new requests anymore, but we still hold
    // (outdated) information in the context. So let's clear that out.
    for (var k in this._context)
      if (this._context.hasOwnProperty(k))
        this._context[k] = null;
  },

  receiveMessage: function ic_receiveMessage(msg) {
    if (!msg || !msg.json) {
      dump('InputContext received message without data\n');
      return;
    }

    let json = msg.json;
    let request = json.requestId ? this.takeRequest(json.requestId) : null;

    if (!request) {
      return;
    }

    switch (msg.name) {
      case "Keyboard:SendKey:Result:OK":
        Services.DOMRequest.fireSuccess(request, null);
        break;
      case "Keyboard:GetText:Result:OK":
        Services.DOMRequest.fireSuccess(request, json.text);
        break;
      case "Keyboard:GetText:Result:Error":
        Services.DOMRequest.fireError(request, json.error);
        break;
      case "Keyboard:SetSelectionRange:Result:OK":
      case "Keyboard:ReplaceSurroundingText:Result:OK":
        Services.DOMRequest.fireSuccess(request,
          ObjectWrapper.wrap(json.selectioninfo, this._window));
        break;
      case "Keyboard:SequenceError":
        // Occurs when a new element got focus, but the inputContext was
        // not invalidated yet...
        Services.DOMRequest.fireError(request, "InputContext has expired");
        break;
      default:
        Services.DOMRequest.fireError(request, "Could not find a handler for " +
          msg.name);
        break;
    }
  },

  updateSelectionContext: function ic_updateSelectionContext(ctx) {
    if (!this._context) {
      return;
    }

    let selectionDirty = this._context.selectionStart !== ctx.selectionStart ||
          this._context.selectionEnd !== ctx.selectionEnd;
    let surroundDirty = this._context.textBeforeCursor !== ctx.textBeforeCursor ||
          this._context.textAfterCursor !== ctx.textAfterCursor;

    this._context.selectionStart = ctx.selectionStart;
    this._context.selectionEnd = ctx.selectionEnd;
    this._context.textBeforeCursor = ctx.textBeforeCursor;
    this._context.textAfterCursor = ctx.textAfterCursor;

    if (selectionDirty) {
      this._fireEvent(this._onselectionchange, "selectionchange", {
        selectionStart: ctx.selectionStart,
        selectionEnd: ctx.selectionEnd
      });
    }

    if (surroundDirty) {
      this._fireEvent(this._onsurroundingtextchange, "surroundingtextchange", {
        beforeString: ctx.textBeforeCursor,
        afterString: ctx.textAfterCursor
      });
    }
  },

  _fireEvent: function ic_fireEvent(handler, eventName, aDetail) {
    if (!handler || !(handler instanceof Ci.nsIDOMEventListener))
      return;

    let detail = {
      detail: aDetail
    };

    let evt = new this._window.CustomEvent(eventName,
        ObjectWrapper.wrap(aDetail, this._window));
    handler.handleEvent(evt);
  },

  // tag name of the input field
  get type() {
    return this._context.type;
  },

  // type of the input field
  get inputType() {
    return this._context.inputtype;
  },

  get inputMode() {
    return this._context.inputmode;
  },

  get lang() {
    return this._context.lang;
  },

  getText: function ic_getText(offset, length) {
    let request = this.createRequest();

    cpmm.sendAsyncMessage('Keyboard:GetText', {
      contextId: this._contextId,
      requestId: this.getRequestId(request),
      offset: offset,
      length: length
    });

    return request;
  },

  get selectionStart() {
    return this._context.selectionStart;
  },

  get selectionEnd() {
    return this._context.selectionEnd;
  },

  get textBeforeCursor() {
    return this._context.textBeforeCursor;
  },

  get textAfterCursor() {
    return this._context.textAfterCursor;
  },

  setSelectionRange: function ic_setSelectionRange(start, length) {
    let request = this.createRequest();

    cpmm.sendAsyncMessage("Keyboard:SetSelectionRange", {
      contextId: this._contextId,
      requestId: this.getRequestId(request),
      selectionStart: start,
      selectionEnd: start + length
    });

    return request;
  },

  get onsurroundingtextchange() {
    return this._onsurroundingtextchange;
  },

  set onsurroundingtextchange(handler) {
    this._onsurroundingtextchange = handler;
  },

  get onselectionchange() {
    return this._onselectionchange;
  },

  set onselectionchange(handler) {
    this._onselectionchange = handler;
  },

  replaceSurroundingText: function ic_replaceSurrText(text, offset, length) {
    let request = this.createRequest();

    cpmm.sendAsyncMessage('Keyboard:ReplaceSurroundingText', {
      contextId: this._contextId,
      requestId: this.getRequestId(request),
      text: text,
      beforeLength: offset || 0,
      afterLength: length || 0
    });

    return request;
  },

  deleteSurroundingText: function ic_deleteSurrText(offset, length) {
    return this.replaceSurroundingText(null, offset, length);
  },

  sendKey: function ic_sendKey(keyCode, charCode, modifiers) {
    let request = this.createRequest();

    cpmm.sendAsyncMessage('Keyboard:SendKey', {
      contextId: this._contextId,
      requestId: this.getRequestId(request),
      keyCode: keyCode,
      charCode: charCode,
      modifiers: modifiers
    });

    return request;
  },

  setComposition: function ic_setComposition(text, cursor) {
    throw "Not implemented";
  },

  endComposition: function ic_endComposition(text) {
    throw "Not implemented";
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory(
  [MozKeyboard, MozInputMethodManager, MozInputMethod]);
