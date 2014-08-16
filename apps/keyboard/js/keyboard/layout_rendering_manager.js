'use strict';

/* global IMERender, Promise */

(function(exports) {

var LayoutRenderingManager = function(app) {
  this.app = app;

  this._resizeListenerTimer = undefined;
};

LayoutRenderingManager.prototype.start = function() {
  // We cannot listen to resize event right at start because of
  // https://bugzil.la/1007595 ;
  // only attach the event listener after 2000ms.
  this._resizeListenerTimer = setTimeout(function attachResizeListener() {
    this.app.perfTimer.printTime('attachResizeListener');
    // Handle resize events
    window.addEventListener('resize', this);
  }.bind(this), 2000);
};

LayoutRenderingManager.prototype.stop = function() {
  clearTimeout(this._resizeListenerTimer);
  this._resizeListenerTimer = undefined;

  window.removeEventListener('resize', this);
};

LayoutRenderingManager.prototype.handleEvent = function() {
  this.app.perfTimer.printTime('layoutRenderingManager.handleEvent');
  if (document.hidden) {
    return;
  }

  IMERender.resizeUI(this.app.layoutManager.currentModifiedLayout);
  this._updateHeight();

  // TODO: need to check how to handle orientation change case to
  // show current word suggestions
  this._updateLayoutParams();
};

// This function asks render.js to create an HTML layout for the keyboard.
//
// This should be called when the keyboard changes or when the layout page
// changes in order to actually render the layout.
LayoutRenderingManager.prototype.updateLayoutRendering = function() {
  this.app.perfTimer.printTime('layoutRenderingManager.updateLayoutRendering');
  this.app.perfTimer.startTimer('updateLayoutRendering');

  var currentLayout = this.app.layoutManager.currentLayout;
  var currentModifiedLayout = this.app.layoutManager.currentModifiedLayout;
  var currentIMEngine = this.app.inputMethodManager.currentIMEngine;

  // Determine if the candidate panel for word suggestion is needed
  // If currentIMEngine.displaysCandidates() returns a thenable,
  // we will wait for it to resolve.
  var needsCandidatePanel =
    (currentLayout.autoCorrectLanguage || currentLayout.needsCandidatePanel) &&
    ((typeof currentIMEngine.displaysCandidates !== 'function') ||
      currentIMEngine.displaysCandidates()) || false;

  // Rule of thumb: always render uppercase, unless secondLayout has been
  // specified (for e.g. arabic, then depending on shift key)
  var needsUpperCase = currentModifiedLayout.secondLayout ?
      this.app.upperCaseStateManager.isUpperCase : true;
  var p = Promise.resolve(needsCandidatePanel).catch(function(e) {
        console.error(e);
        return false;
      }).then(function(needsCandidatePanel) {
        return new Promise(function(resolve) {
          IMERender.draw(currentModifiedLayout, {
            uppercase: needsUpperCase,
            inputType: this.app.getBasicInputType(),
            showCandidatePanel: needsCandidatePanel
          }, resolve);

          // Tell the renderer what input method we're using. This will set
          // a CSS classname that can be used to style the keyboards differently
          IMERender.setInputMethodName(
            this.app.layoutManager.currentModifiedLayout.imEngine || 'default');
        }.bind(this));
    }.bind(this)).then(this._afterRenderDrew.bind(this));

  this.app.perfTimer.printTime(
    'BLOCKING layoutRenderingManager.updateLayoutRendering',
    'updateLayoutRendering');

  return p;
};

// So there are a couple of things that we want don't want to block
// on here, so we can do it if resizeUI is fully finished
LayoutRenderingManager.prototype._afterRenderDrew = function() {
  this.app.perfTimer.printTime('layoutRenderingManager._afterRenderDrew');
  this.app.perfTimer.startTimer('_afterRenderDrew');

  IMERender.setUpperCaseLock(this.app.upperCaseStateManager);

  // Tell the input method about the new keyboard layout
  this._updateLayoutParams();

  // Show the keyboard or update to the current height.
  this._updateHeight();

  this.app.candidatePanelManager.showCandidates();
  this.app.perfTimer.printTime(
    'BLOCKING layoutRenderingManager._afterRenderDrew', '_afterRenderDrew');
};

// If the input method cares about layout details, get those details
// from the renderer and pass them on to the input method. This is called
// from renderKeyboard() each time the keyboard layout changes.
// As an optimzation, however, we only send parameters if layoutPage is
// the default, since the input methods we support don't do anything special
// for symbols.
LayoutRenderingManager.prototype._updateLayoutParams = function() {
  var currentIMEngine = this.app.inputMethodManager.currentIMEngine;
  var layoutManager = this.app.layoutManager;

  if ((typeof currentIMEngine.setLayoutParams !== 'function') ||
      layoutManager.currentLayoutPage !== layoutManager.LAYOUT_PAGE_DEFAULT) {
    return;
  }

  var candidatePanel = IMERender.candidatePanel;
  var yBias = candidatePanel ? candidatePanel.clientHeight : 0;

  currentIMEngine.setLayoutParams({
    keyboardWidth: IMERender.getWidth(),
    keyboardHeight: (IMERender.getHeight() - yBias),
    keyArray: IMERender.getKeyArray(),
    keyWidth: IMERender.getKeyWidth(),
    keyHeight: IMERender.getKeyHeight()
  });
};

LayoutRenderingManager.prototype._updateHeight = function() {
  this.app.perfTimer.printTime(
    'layoutRenderingManager._updateHeight');
  // height of the current active IME + 1px for the borderTop
  var imeHeight = IMERender.getHeight() + 1;
  var imeWidth = IMERender.getWidth();
  window.resizeTo(imeWidth, imeHeight);
};

exports.LayoutRenderingManager = LayoutRenderingManager;

})(window);
