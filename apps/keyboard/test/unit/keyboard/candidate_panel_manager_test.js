'use strict';

/* global CandidatePanelManager, MockEventTarget */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/js/keyboard/candidate_panel_manager.js');

suite('CandidatePanelManager', function() {
  var app;
  var manager;

  setup(function() {
    window.IMERender = {
      showMoreCandidates: this.sinon.stub(),
      candidatePanel: new MockEventTarget(),
      getNumberOfCandidatesPerRow: this.sinon.stub(),
      toggleCandidatePanel: this.sinon.stub()
    };

    window.IMERender.getNumberOfCandidatesPerRow.returns(8);
    window.IMERender.candidatePanel.dataset = {};
    window.IMERender.candidatePanel.scrollHeight = 500;
    window.IMERender.candidatePanel.clientHeight = 100;
    window.IMERender.candidatePanel.scrollTop = 398;

    this.sinon.spy(window.IMERender.candidatePanel, 'addEventListener');
    this.sinon.spy(window.IMERender.candidatePanel, 'removeEventListener');

    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');

    app = {
      inputMethodManager: {
        currentIMEngine: {}
      }
    };

    manager = new CandidatePanelManager(app);
    manager.oncandidateschange = this.sinon.stub();
    manager.start();
  });

  teardown(function() {
    window.IMERender = null;
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

      window.IMERender.candidatePanel.dataset.truncated = 'true';
      window.IMERender.candidatePanel.dataset.rowCount = '1';
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
        window.IMERender.candidatePanel.dataset.candidateIndicator = '10';
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

          assert.isTrue(window.IMERender.showMoreCandidates
            .calledWith(manager.FIRST_PAGE_ROWS, firstPageList));
          assert.isTrue(
            window.IMERender.toggleCandidatePanel.calledWith(true));

          assert.isTrue(
            window.IMERender.candidatePanel.addEventListener.calledOnce);
        });

        suite('showNextCandidatePage', function() {
          setup(function() {
            window.IMERender.candidatePanel.dataset.rowCount = '2';
            window.IMERender.candidatePanel.dataset.candidateIndicator = '90';

            var scrollEvent = {
              type: 'scroll'
            };
            window.IMERender.candidatePanel.dispatchEvent(scrollEvent);

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.setTimeout.calledOnce);
            assert.equal(window.setTimeout.getCall(0).args[1], 200);
            window.setTimeout.getCall(0).args[0].call(window);

            assert.isTrue(getMoreCandidatesStub.getCall(1).calledWith(
                90, manager.PAGE_ROWS * 8 + 1));

            var nextPageList =
              candidates.slice(90, 90 + manager.PAGE_ROWS * 8 + 1);
            getMoreCandidatesStub.getCall(1).args[2].call(window, nextPageList);

            assert.isTrue(window.IMERender.showMoreCandidates
              .calledWith(manager.PAGE_ROWS, nextPageList));
          });

          test('hideFullPanel & show panel', function () {
            window.IMERender.candidatePanel.dataset.rowCount = '3';
            window.IMERender.candidatePanel.dataset.candidateIndicator = '187';

            manager.hideFullPanel();

            assert.isFalse(manager.isFullPanelShown);
            assert.isTrue(window.clearTimeout.calledTwice);
            assert.isTrue(
              window.IMERender.candidatePanel.removeEventListener.calledOnce);

            manager.showFullPanel();

            assert.isTrue(window.IMERender.showMoreCandidates.calledTwice,
              'No showMoreCandidates call here.');
            assert.isTrue(
              window.IMERender.candidatePanel.addEventListener.calledTwice);
          });
        });

        test('hideFullPanel', function () {
          manager.hideFullPanel();

          assert.isFalse(manager.isFullPanelShown);
          assert.isTrue(
            window.IMERender.candidatePanel.removeEventListener.calledOnce);
        });
      });
    });

    suite('No engine.getMoreCandidates',function() {
      setup(function() {
        // Assume the candidates are truncated at 10th candidate.
        window.IMERender.candidatePanel.dataset.candidateIndicator = '10';
      });

      suite('showFullPanel', function() {
        setup(function() {
          manager.showFullPanel();

          var firstPageList =
            candidates.slice(10, 10 + manager.FIRST_PAGE_ROWS * 8 + 1);
          assert.isTrue(manager.isFullPanelShown);
          assert.isTrue(window.IMERender.showMoreCandidates
            .calledWith(manager.FIRST_PAGE_ROWS, firstPageList));
          assert.isTrue(
            window.IMERender.toggleCandidatePanel.calledWith(true));

          assert.isTrue(
            window.IMERender.candidatePanel.addEventListener.calledOnce);
        });

        suite('showNextCandidatePage', function() {
          setup(function() {
            window.IMERender.candidatePanel.dataset.rowCount = '2';
            window.IMERender.candidatePanel.dataset.candidateIndicator = '90';

            var scrollEvent = {
              type: 'scroll'
            };
            window.IMERender.candidatePanel.dispatchEvent(scrollEvent);

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.setTimeout.calledOnce);
            window.setTimeout.getCall(0).args[0].call(window);

            var nextPageList =
              candidates.slice(90, 90 + manager.PAGE_ROWS * 8 + 1);

            assert.isTrue(window.IMERender.showMoreCandidates
              .calledWith(manager.PAGE_ROWS, nextPageList));
          });

          test('hideFullPanel & show panel', function () {
            window.IMERender.candidatePanel.dataset.rowCount = '3';
            window.IMERender.candidatePanel.dataset.candidateIndicator = '187';

            manager.hideFullPanel();

            assert.isFalse(manager.isFullPanelShown);
            assert.isTrue(window.clearTimeout.calledTwice);
            assert.isTrue(
              window.IMERender.candidatePanel.removeEventListener.calledOnce);

            manager.showFullPanel();

            assert.isTrue(window.IMERender.showMoreCandidates.calledTwice,
              'No showMoreCandidates call here.');
            assert.isTrue(
              window.IMERender.candidatePanel.addEventListener.calledTwice);
          });
        });

        test('hideFullPanel', function () {
          manager.hideFullPanel();

          assert.isFalse(manager.isFullPanelShown);
          assert.isTrue(window.clearTimeout.calledOnce);
          assert.isTrue(
            window.IMERender.candidatePanel.removeEventListener.calledOnce);
        });
      });
    });
  });
});
