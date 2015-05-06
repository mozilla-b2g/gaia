'use strict';

/* global BaseView */

(function(exports) {

/**
 * CandidateView handles the rendering of each candidate, i.e.
 * the word suggestion.
 */
function CandidateView() {
  BaseView.apply(this, arguments);
}

CandidateView.prototype = Object.create(BaseView.prototype);

CandidateView.prototype.render = function render() {
  var span = document.createElement('span');
  span.textContent = this.target.text;
  span.style.flex = this.options.unit;
  // ui/integration test needs this
  span.dataset.data = this.target.data;

  this.element = span;

  this.viewManager.registerView(this.target, this);
};

/**
 * CandidateToggleButtonView represents the toggle button to show/hide
 * the full candidate panel.
 */
function CandidateToggleButtonView() {
  BaseView.apply(this, arguments);
}

CandidateToggleButtonView.prototype = Object.create(BaseView.prototype);

CandidateToggleButtonView.prototype.render = function() {
  var toggleButton = document.createElement('div');
  toggleButton.classList.add('keyboard-candidate-panel-toggle-button');
  toggleButton.classList.add('hide');

  this.element = toggleButton;

  this.viewManager.registerView(this.target, this);
};

CandidateToggleButtonView.prototype.show = function() {
  this.element.classList.remove('hide');
};

CandidateToggleButtonView.prototype.hide = function() {
  this.element.classList.add('hide');
};

/**
 * CandidatePanelView handles the rendering of candidate panel, used for showing
 * word suggestions.
 */
function CandidatePanelView(target, options, viewManager) {
  BaseView.apply(this, arguments);
}

// Default value for how many candidates shown in a row.
CandidatePanelView.prototype.countPerRow = 8;

CandidatePanelView.prototype.render = function render() {
  var candidatePanel = document.createElement('div');
  candidatePanel.setAttribute('role', 'group');
  candidatePanel.dataset.l10nId = 'wordSuggestions2';

  candidatePanel.classList.add('keyboard-candidate-panel');
  if (this.options.className) {
    candidatePanel.classList.add(this.options.className);
  }

  var suggestionsContainer = document.createElement('div');
  suggestionsContainer.classList.add('suggestions-container');
  suggestionsContainer.setAttribute('role', 'listbox');
  candidatePanel.appendChild(suggestionsContainer);
  this.suggestionsContainer = suggestionsContainer;

  // Create toggle button
  // we're not getting reference of LayoutManager, so define this manually
  var KEYCODE_TOGGLE_CANDIDATE_PANEL = -4;

  // TODO: we should not create a business logic object in the view,
  // let's move it to somewhere else.
  this.toggleButton = new CandidateToggleButtonView({
    keyCode: KEYCODE_TOGGLE_CANDIDATE_PANEL },
    null,
    this.viewManager);
  this.toggleButton.render();

  candidatePanel.appendChild(this.toggleButton.element);
  this.element = candidatePanel;
};

//
// Show candidates
// Each candidate is a string or an array of two strings
//
CandidatePanelView.prototype.showCandidates = function(candidates) {
  if (!this.element) {
    console.error('CandidatePanelView: CandidatePanel is not ready yet!');
    return;
  }

  var candidatePanel = this.element;
  candidatePanel.dataset.candidateIndicator = 0;
  this.suggestionsContainer.innerHTML = '';
  this.toggleButton.hide();

  var docFragment = this.renderCandidatePanel(1, candidates, true);

  this.suggestionsContainer.appendChild(docFragment);
};

CandidatePanelView.prototype.renderCandidatePanel = function(rowLimit,
                                                            candidates,
                                                            indentFirstRow) {
  var candidatePanel = this.element;

  var docFragment = document.createDocumentFragment();
  if (candidates.length === 0) {
    candidatePanel.dataset.rowCount = 0;
    return docFragment;
  }

  var rowDiv = document.createElement('div');
  rowDiv.classList.add('candidate-row');
  if (indentFirstRow) {
    rowDiv.classList.add('candidate-row-first');
  }

  var nowUnit = 0;
  var rowCount = 0;

  if (rowLimit < 0) {
    rowLimit = Number.Infinity;
  }

  var candidatesLength = candidates.length;
  var dummyEl = null;
  var i = 0;

  candidates.some(function(candidate, index) {
    var cand, data;
    if (typeof candidate == 'string') {
      cand = data = candidate;
    } else {
      cand = candidate[0];
      data = candidate[1];
    }

    var unit = this.options.widthUnit ? this.options.widthUnit :
                                        (cand.length >> 1) + 1;

    // TODO: we should not create a business logic object in the view,
    // let's move it to somewhere else.
    var candidateView =  new CandidateView({ suggestion: true,
                                             selection: true,
                                             text: cand,
                                             data: data },
                                           { unit: unit },
                                           this.viewManager);
    candidateView.render();

    nowUnit += unit;
    i++;

    var needBreak = false;
    if (rowCount === 0 && indentFirstRow &&
        nowUnit >= this.countPerRow && index != candidatesLength - 1) {
      needBreak = true;
    }

    if (nowUnit > this.countPerRow || needBreak) {
      if (rowCount === 0 && needBreak) {
        this.toggleButton.show();
        // Create a dummy element to represent the toggle button to occupy
        // the space that should be taken by it.
        dummyEl = document.createElement('span');
        dummyEl.style.flex = this.countPerRow - (nowUnit - unit);
        rowDiv.appendChild(dummyEl);
      }

      if (rowCount >= rowLimit - 1) {
        return true;
      }

      docFragment.appendChild(rowDiv);
      rowCount++;

      // Create the next row
      rowDiv = document.createElement('div');
      rowDiv.classList.add('candidate-row');
      nowUnit = unit;
    }

    rowDiv.appendChild(candidateView.element);
  }, this);

  // Insert a dummy element to fill up the flex box to make it look
  // like a grid.
  if (nowUnit < this.countPerRow &&
      typeof this.options.widthUnit === 'undefined') {
    dummyEl = document.createElement('span');
    dummyEl.style.flex = this.countPerRow - nowUnit;
    rowDiv.appendChild(dummyEl);
  }

  if (i != candidatesLength) {
    candidatePanel.dataset.truncated = true;
  } else {
    delete candidatePanel.dataset.truncated;
  }

  candidatePanel.dataset.rowCount = rowCount + 1;
  candidatePanel.dataset.candidateIndicator =
    parseInt(candidatePanel.dataset.candidateIndicator) + i;

  docFragment.appendChild(rowDiv);
  rowDiv = null;

  return docFragment;
};

CandidatePanelView.prototype.showMoreCandidates = function(rowLimit,
                                                           candidates) {
  if (!candidates) {
    return;
  }

  if (!rowLimit) {
    rowLimit = -1;
  }

  this.suggestionsContainer.appendChild(
      this.renderCandidatePanel(rowLimit, candidates));
};

CandidatePanelView.prototype.resetScroll = function() {
  this.suggestionsContainer.scrollTop =
    this.suggestionsContainer.scrollLeft = 0;
};

exports.CandidatePanelView = CandidatePanelView;

})(window);
