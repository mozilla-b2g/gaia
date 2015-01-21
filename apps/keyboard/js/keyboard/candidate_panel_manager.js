'use strict';

(function(exports) {

var CandidatePanelScrollingMonitor = function(app) {
  this.app = app;

  this.scrollTimer = undefined;
};

CandidatePanelScrollingMonitor.prototype.SCROLL_END_WAIT_MS = 200;

CandidatePanelScrollingMonitor.prototype.onneedcandidates = null;

CandidatePanelScrollingMonitor.prototype.start = function() {
};

CandidatePanelScrollingMonitor.prototype.stop = function() {
  clearTimeout(this.scrollTimer);
  var candidatePanel = this.app.viewManager.candidatePanel;
  if (candidatePanel) {
    var suggestionsContainer =
      candidatePanel.querySelector('.suggestions-container');
    suggestionsContainer.removeEventListener('scroll', this);
  }
};

CandidatePanelScrollingMonitor.prototype.handleEvent = function(evt) {
  var panel = evt.target;
  clearTimeout(this.scrollTimer);

  // If the user have not scrolled all the way to the buttom,
  // no need to start the timer.
  if (panel.scrollTop === 0 ||
      (panel.scrollHeight - panel.clientHeight - panel.scrollTop) >= 5) {
    return;
  }
  this.scrollTimer = setTimeout(function() {
    if (typeof this.onneedcandidates === 'function') {
      this.onneedcandidates();
    }
  }.bind(this), this.SCROLL_END_WAIT_MS);
};

CandidatePanelScrollingMonitor.prototype.startMonitoring = function() {
  // If the candidates list was not truncated,
  // we don't really need to monitor the scroll event.
  var candidatePanel = this.app.viewManager.candidatePanel;
  if ('truncated' in candidatePanel.dataset) {
    var suggestionsContainer =
      candidatePanel.querySelector('.suggestions-container');
    suggestionsContainer.addEventListener('scroll', this);
  }
};

CandidatePanelScrollingMonitor.prototype.stopMonitoring = function() {
  clearTimeout(this.scrollTimer);
  var suggestionsContainer =
    this.app.viewManager.candidatePanel.querySelector('.suggestions-container');
  suggestionsContainer.removeEventListener('scroll', this);
};

var CandidatePanelManager = function(app) {
  this.app = app;

  this.currentCandidates = null;
  this.isFullPanelShown = undefined;

  this.scrollingMonitor = null;
};

CandidatePanelManager.prototype.FIRST_PAGE_ROWS = 11;
CandidatePanelManager.prototype.PAGE_ROWS = 12;

CandidatePanelManager.prototype.oncandidateschange = null;

CandidatePanelManager.prototype.start = function() {
  this.currentCandidates = [];
  this.isFullPanelShown = false;

  this.scrollingMonitor = new CandidatePanelScrollingMonitor(this.app);
  this.scrollingMonitor.start();
  this.scrollingMonitor.onneedcandidates =
    this.showNextCandidatePage.bind(this);
};

CandidatePanelManager.prototype.stop = function() {
  this.scrollingMonitor.stop();
  this.scrollingMonitor = null;
  this.isFullPanelShown = undefined;
};

CandidatePanelManager.prototype.showNextCandidatePage = function() {
  var numberOfCandidatesPerRow =
    this.app.viewManager.getNumberOfCandidatesPerRow();
  var candidatePanel = this.app.viewManager.candidatePanel;
  var candidateIndicator =
    parseInt(candidatePanel.dataset.candidateIndicator, 10);

  // If the engine supports getting more candidate, get these candidates.
  var engine = this.app.inputMethodManager.currentIMEngine;
  if (typeof engine.getMoreCandidates === 'function') {
    // XXX: We are not protecting ourselves againest any races but this is
    // what the original script do in keyboard.js
    engine.getMoreCandidates(
      candidateIndicator,
      this.PAGE_ROWS * numberOfCandidatesPerRow + 1,
      this.app.viewManager.showMoreCandidates.bind(this.app.viewManager,
                                                   this.PAGE_ROWS)
    );
  } else {
    var list = this.currentCandidates.slice(candidateIndicator,
      candidateIndicator + this.PAGE_ROWS * numberOfCandidatesPerRow + 1);

    this.app.viewManager.showMoreCandidates(this.PAGE_ROWS, list);
  }
};

CandidatePanelManager.prototype.toggleFullPanel = function(fullPanel) {
  if (this.isFullPanelShown) {
    this.hideFullPanel();
  } else {
    this.showFullPanel();
  }
};

CandidatePanelManager.prototype.showFullPanel = function() {
  if (this.isFullPanelShown) {
    return;
  }

  this.isFullPanelShown = true;

  var candidatePanel = this.app.viewManager.candidatePanel;
  // Decide if we need the second page now
  if (candidatePanel.dataset.rowCount == 1) {
    var numberOfCandidatesPerRow =
      this.app.viewManager.getNumberOfCandidatesPerRow();
    var candidateIndicator =
      parseInt(candidatePanel.dataset.candidateIndicator, 10);

    // If the engine supports getting more candidate, get these candidates.
    var engine = this.app.inputMethodManager.currentIMEngine;
    if (typeof engine.getMoreCandidates === 'function') {
      // XXX: We are not protecting ourselves againest any races but this is
      // what the original script do in keyboard.js
      engine.getMoreCandidates(candidateIndicator,
        this.FIRST_PAGE_ROWS * numberOfCandidatesPerRow + 1,
        function gotMoreCandidates(list) {
          if (candidatePanel.dataset.rowCount != 1) {
            return;
          }

          this.app.viewManager.showMoreCandidates(this.FIRST_PAGE_ROWS, list);
          this.scrollingMonitor.startMonitoring();
          this.app.viewManager.toggleCandidatePanel(true);
        }.bind(this)
      );
    } else { // No engine.getMoreCandidates
      var list = this.currentCandidates.slice(candidateIndicator,
        candidateIndicator +
        this.FIRST_PAGE_ROWS * numberOfCandidatesPerRow + 1);

      this.app.viewManager.showMoreCandidates(this.FIRST_PAGE_ROWS, list);
      this.scrollingMonitor.startMonitoring();
      this.app.viewManager.toggleCandidatePanel(true);
    }

  } else { // rowCount != 1
    this.scrollingMonitor.startMonitoring();
    this.app.viewManager.toggleCandidatePanel(true);
  }
};

CandidatePanelManager.prototype.hideFullPanel = function() {
  if (!this.isFullPanelShown) {
    return;
  }

  this.isFullPanelShown = false;

  this.scrollingMonitor.stopMonitoring();
  this.app.viewManager.toggleCandidatePanel(false);
};

CandidatePanelManager.prototype.reset = function() {
  this.hideFullPanel();
  this.currentCandidates = [];
};

CandidatePanelManager.prototype.updateCandidates = function(candidates) {
  this.currentCandidates = candidates;

  if (typeof this.oncandidateschange === 'function') {
    this.oncandidateschange();
  }
};

exports.CandidatePanelScrollingMonitor = CandidatePanelScrollingMonitor;
exports.CandidatePanelManager = CandidatePanelManager;

})(window);
