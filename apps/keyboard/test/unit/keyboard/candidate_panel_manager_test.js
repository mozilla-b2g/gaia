'use strict';

/* global CandidatePanelManager, MockEventTarget */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/js/keyboard/candidate_panel_manager.js');

suite('CandidatePanelManager', function() {
  var app;
  var manager;
  var suggestionsContainer;
  var viewManager;

  setup(function() {
    suggestionsContainer = new MockEventTarget();
    this.sinon.spy(suggestionsContainer, 'addEventListener');
    this.sinon.spy(suggestionsContainer, 'removeEventListener');

    viewManager = {
      showMoreCandidates: this.sinon.stub(),
    candidatePanel: {},
    getNumberOfCandidatesPerRow: this.sinon.stub(),
    toggleCandidatePanel: this.sinon.stub()
    };

    viewManager.getNumberOfCandidatesPerRow.returns(8);
    viewManager.candidatePanel.dataset = {};
    viewManager.candidatePanel.scrollHeight = 500;
    viewManager.candidatePanel.clientHeight = 100;
    viewManager.candidatePanel.scrollTop = 398;

    viewManager.candidatePanel.querySelector = this.sinon.stub();
    viewManager.candidatePanel.querySelector.returns(
      suggestionsContainer);

    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');

    app = {
      inputMethodManager: {
        currentIMEngine: {}
      },
      viewManager: viewManager
    };

    manager = new CandidatePanelManager(app);
    manager.oncandidateschange = this.sinon.stub();
    manager.start();
  });

  teardown(function() {
    app = null;
  });

  test('stop', function() {
    manager.stop();

    assert.isTrue(window.clearTimeout.calledOnce);
  });

  suite('updateCandidates', function() {
    var candidates;
    setup(function() {
      candidates = (function() {
        var arr = [];
        var i = 500;
        while (i--) {
          arr.push(['candidate ' + i, i]);
        }

        return arr;
      }());

      manager.updateCandidates(candidates);

      assert.equal(manager.currentCandidates, candidates);
      assert.isTrue(manager.oncandidateschange.calledOnce);

      viewManager.candidatePanel.dataset.truncated = 'true';
      viewManager.candidatePanel.dataset.rowCount = '1';
    });

    test('reset', function() {
      this.sinon.stub(manager, 'hideFullPanel');
      manager.reset();

      assert.isTrue(manager.hideFullPanel.calledOnce);
      assert.deepEqual(manager.currentCandidates, []);
    });

    test('toggleFullPanel', function() {
      this.sinon.stub(manager, 'showFullPanel');
      this.sinon.stub(manager, 'hideFullPanel');

      manager.toggleFullPanel();
      assert.isTrue(manager.showFullPanel.calledOnce);
      manager.isFullPanelShown = true;

      manager.toggleFullPanel();
      assert.isTrue(manager.hideFullPanel.calledOnce);
    });

    suite('With engine.getMoreCandidates',function() {
      var getMoreCandidatesStub;
      setup(function() {
        getMoreCandidatesStub =
          app.inputMethodManager.currentIMEngine.getMoreCandidates =
          this.sinon.stub();

        // Assume the candidates are truncated at 10th candidate.
        viewManager.candidatePanel.dataset.candidateIndicator = '10';
      });

      suite('showFullPanel', function() {
        setup(function() {
          manager.showFullPanel();

          assert.isTrue(manager.isFullPanelShown);
          assert.isTrue(getMoreCandidatesStub.calledWith(
              10, manager.FIRST_PAGE_ROWS * 8 + 1));

          var firstPageList =
            candidates.slice(10, 10 + manager.FIRST_PAGE_ROWS * 8 + 1);
          getMoreCandidatesStub.getCall(0).args[2].call(window, firstPageList);

          assert.isTrue(viewManager.showMoreCandidates
            .calledWith(manager.FIRST_PAGE_ROWS, firstPageList));
          assert.isTrue(viewManager.toggleCandidatePanel.calledWith(true));

          assert.isTrue(suggestionsContainer.addEventListener.calledOnce);
        });

        suite('showNextCandidatePage', function() {
          setup(function() {
            viewManager.candidatePanel.dataset.rowCount = '2';
            viewManager.candidatePanel.dataset.candidateIndicator = '90';

            var scrollEvent = {
              type: 'scroll'
            };
            suggestionsContainer.dispatchEvent(scrollEvent);

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.setTimeout.calledOnce);
            assert.equal(window.setTimeout.getCall(0).args[1], 200);
            window.setTimeout.getCall(0).args[0].call(window);

            assert.isTrue(getMoreCandidatesStub.getCall(1).calledWith(
                90, manager.PAGE_ROWS * 8 + 1));

            var nextPageList =
              candidates.slice(90, 90 + manager.PAGE_ROWS * 8 + 1);
            getMoreCandidatesStub.getCall(1).args[2].call(window, nextPageList);

            assert.isTrue(viewManager.showMoreCandidates
              .calledWith(manager.PAGE_ROWS, nextPageList));
          });

          test('hideFullPanel & show panel', function () {
            viewManager.candidatePanel.dataset.rowCount = '3';
            viewManager.candidatePanel.dataset.candidateIndicator = '187';

            manager.hideFullPanel();

            assert.isFalse(manager.isFullPanelShown);
            assert.isTrue(window.clearTimeout.calledTwice);
            assert.isTrue(suggestionsContainer.removeEventListener.calledOnce);

            manager.showFullPanel();

            assert.isTrue(viewManager.showMoreCandidates.calledTwice,
              'No showMoreCandidates call here.');
            assert.isTrue(suggestionsContainer.addEventListener.calledTwice);
          });
        });

        test('hideFullPanel', function () {
          manager.hideFullPanel();

          assert.isFalse(manager.isFullPanelShown);
          assert.isTrue(suggestionsContainer.removeEventListener.calledOnce);
        });
      });
    });

    suite('No engine.getMoreCandidates',function() {
      setup(function() {
        // Assume the candidates are truncated at 10th candidate.
        viewManager.candidatePanel.dataset.candidateIndicator = '10';
      });

      suite('showFullPanel', function() {
        setup(function() {
          manager.showFullPanel();

          var firstPageList =
            candidates.slice(10, 10 + manager.FIRST_PAGE_ROWS * 8 + 1);
          assert.isTrue(manager.isFullPanelShown);
          assert.isTrue(viewManager.showMoreCandidates
            .calledWith(manager.FIRST_PAGE_ROWS, firstPageList));
          assert.isTrue(
            viewManager.toggleCandidatePanel.calledWith(true));

          assert.isTrue(suggestionsContainer.addEventListener.calledOnce);
        });

        suite('showNextCandidatePage', function() {
          setup(function() {
            viewManager.candidatePanel.dataset.rowCount = '2';
            viewManager.candidatePanel.dataset.candidateIndicator = '90';

            var scrollEvent = {
              type: 'scroll'
            };
            suggestionsContainer.dispatchEvent(scrollEvent);

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.setTimeout.calledOnce);
            window.setTimeout.getCall(0).args[0].call(window);

            var nextPageList =
              candidates.slice(90, 90 + manager.PAGE_ROWS * 8 + 1);

            assert.isTrue(viewManager.showMoreCandidates
              .calledWith(manager.PAGE_ROWS, nextPageList));
          });

          test('hideFullPanel & show panel', function () {
            viewManager.candidatePanel.dataset.rowCount = '3';
            viewManager.candidatePanel.dataset.candidateIndicator = '187';

            manager.hideFullPanel();

            assert.isFalse(manager.isFullPanelShown);
            assert.isTrue(window.clearTimeout.calledTwice);
            assert.isTrue(suggestionsContainer.removeEventListener.calledOnce);

            manager.showFullPanel();

            assert.isTrue(viewManager.showMoreCandidates.calledTwice,
              'No showMoreCandidates call here.');
            assert.isTrue(suggestionsContainer.addEventListener.calledTwice);
          });
        });

        test('hideFullPanel', function () {
          manager.hideFullPanel();

          assert.isFalse(manager.isFullPanelShown);
          assert.isTrue(window.clearTimeout.calledOnce);
          assert.isTrue(suggestionsContainer.removeEventListener.calledOnce);
        });
      });
    });
  });
});
