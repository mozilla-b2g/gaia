'use strict';
/* global CandidatePanelView, BaseView, ViewUtils */

(function(exports) {

function LatinCandidateView() {
  BaseView.apply(this, arguments);
}

LatinCandidateView.prototype = Object.create(BaseView.prototype);

LatinCandidateView.prototype.render = function render() {
  var div = document.createElement('div');
  div.setAttribute('role', 'option');

  var span = ViewUtils.fitText(div,
                     this.target.text,
                     this.options.candidatesLength,
                     this.options.totalWidth);
  span.setAttribute('role', 'presentation');

  span.dataset.data = this.target.data;
  if (this.options.correction) {
    div.classList.add('autocorrect');
  }

  div.appendChild(span);
  this.element = div;

  this.viewManager.registerView(this.target, this);
};

function DismissButtonView() {
  BaseView.apply(this, arguments);
}

DismissButtonView.prototype = Object.create(BaseView.prototype);

DismissButtonView.prototype.render = function render() {
  var dismissButton = document.createElement('div');
  dismissButton.classList.add('dismiss-suggestions-button');
  dismissButton.classList.add('hide');
  dismissButton.setAttribute('role', 'button');
  dismissButton.dataset.l10nId = 'dismiss2';

  this.element = dismissButton;

  this.viewManager.registerView(this.target, this);
};

/**
 * LatinCandidatePanelView handles the rendering of latin candidate panel, used
 * for showing word suggestions.
 */
function LatinCandidatePanelView() {
  CandidatePanelView.apply(this, arguments);
}

LatinCandidatePanelView.prototype = Object.create(CandidatePanelView.prototype);

LatinCandidatePanelView.prototype.render = function render() {
  var candidatePanel = document.createElement('div');
  candidatePanel.setAttribute('role', 'group');
  candidatePanel.dataset.l10nId = 'wordSuggestions2';

  candidatePanel.classList.add('keyboard-candidate-panel');
  if (this.options.className) {
    candidatePanel.classList.add(this.options.className);
  }

  this.dismissButton = new DismissButtonView(
    { isDismissSuggestionsButton: true },
    null,
    this.viewManager);

  this.dismissButton.render();
  candidatePanel.appendChild(this.dismissButton.element);

  var suggestionsContainer = document.createElement('div');
  suggestionsContainer.classList.add('suggestions-container');
  suggestionsContainer.setAttribute('role', 'listbox');
  candidatePanel.appendChild(suggestionsContainer);

  this.suggestionsContainer = suggestionsContainer;

  this.element = candidatePanel;
};

LatinCandidatePanelView.prototype.showCandidates = function(candidates) {
  if (!this.element) {
    console.error('LatinCandidatePanelView: CandidatePanel is not ready yet!');
    return;
  }

  if (candidates.length === 0) {
    this.dismissButton.hide();
  } else {
    this.dismissButton.show();
  }

  this.suggestionsContainer.innerHTML = '';

  candidates.forEach(function buildCandidateEntry(candidate) {
    // Make sure all of the candidates are defined
    if (!candidate) {
      return;
    }

    var text, data, correction = false;
    if (typeof candidate === 'string') {
      if (candidate[0] === '*') { // it is an autocorrection candidate
        candidate = candidate.substring(1);
        correction = true;
      }
      data = text = candidate;
    } else {
      text = candidate[0];
      data = candidate[1];
    }

    // TODO: we should not create a business logic object in the view,
    // let's move it to somewhere else.
    var candidateView = new LatinCandidateView(
      { suggestion: true,
        text: text,
        data: data },
      { candidatesLength: candidates.length,
        correction: correction,
        totalWidth: this.options.totalWidth },
      this.viewManager);

    candidateView.render();

    this.suggestionsContainer.appendChild(candidateView.element);
  }, this);
};

exports.LatinCandidatePanelView = LatinCandidatePanelView;

})(window);
