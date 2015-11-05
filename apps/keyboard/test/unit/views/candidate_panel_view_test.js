'use strict';

/* global CandidatePanelView */
require('/js/views/base_view.js');
require('/js/views/candidate_panel_view.js');

function createFakeCandidates(count) {
  var candidates = [];
  for (var i = 0; i < count; i++) {
    candidates.push('' + i);
  }

  return candidates;
}

suite('Views > CandidatePanelView', function() {
  var candidatePanelView = null;
  var viewManager = {
    registerView: sinon.stub(),
    getRemToPx: sinon.stub().returns(10)
  };

  suite('some basic functions',  function() {
    setup(function() {
      var target = {};
      var options = {className: 'basic-class'};
      candidatePanelView = new CandidatePanelView(target, options, viewManager);
    });

    test('> render() ', function() {
      assert.equal(candidatePanelView.element, null);

      candidatePanelView.render();
      assert.notEqual(candidatePanelView.element, null);

      var classList = candidatePanelView.element.classList;
      assert.isTrue(classList.contains('basic-class'),
                    'should contain the className specified in options');
    });

    test('> getHeight()', function() {
      assert.equal(candidatePanelView.getHeight(), 32);
    });

    suite('> showCandidates()',  function() {
      test('> show 8 candidates', function() {
        candidatePanelView.render();

        candidatePanelView.showCandidates(createFakeCandidates(8));

        var suggestionsContainer =
          candidatePanelView.element.querySelector('.suggestions-container');
        assert.notEqual(suggestionsContainer, null);

        var row = suggestionsContainer.querySelector('.candidate-row-first');
        assert.equal(row.childNodes.length, 8);

        // Should not contain the toggle button
        var toggleButton =
          row.querySelector('.keyboard-candidate-panel-toggle-button');
        assert.equal(toggleButton, null);
      });

      test('> show 9 candidates', function() {
        candidatePanelView.render();

        candidatePanelView.showCandidates(createFakeCandidates(9));

        var suggestionsContainer =
          candidatePanelView.element.querySelector('.suggestions-container');
        assert.notEqual(suggestionsContainer, null);

        var row = suggestionsContainer.querySelector('.candidate-row-first');
        assert.equal(row.childNodes.length, 8);

        // Should contain the toggle button
        var toggleButton = candidatePanelView.element.
          querySelector('.keyboard-candidate-panel-toggle-button');
        assert.notEqual(toggleButton, null);
      });

      test('> candidates with different length', function() {
        candidatePanelView.render();

        var candidates = ['1', '2', '3' , '4', '55', '6', '7', '8'];
        candidatePanelView.showCandidates(candidates);

        var suggestionsContainer =
          candidatePanelView.element.querySelector('.suggestions-container');
        assert.notEqual(suggestionsContainer, null);

        var row = suggestionsContainer.querySelector('.candidate-row-first');
        assert.equal(row.childNodes.length, 7);

        // Should contain the toggle button
        var toggleButton = candidatePanelView.element.
          querySelector('.keyboard-candidate-panel-toggle-button');
        assert.notEqual(toggleButton, null);


        candidatePanelView.showMoreCandidates(1, ['9']);
        // Check it has the 2nd row
        var rows = suggestionsContainer.querySelectorAll('.candidate-row');
        assert.equal(rows.length, 2);

        // Check 2nd row is shown as a grid
        var candidateElements = rows[1].querySelectorAll('span');
        assert.equal(candidateElements.length, 2);

        assert.equal(candidateElements[0].textContent, '9');
        assert.equal(candidateElements[0].dataset.data, '9');
        assert.equal(candidateElements[0].style.flexGrow, 1);

        // Will have a dummy element here make it look like a grid
        assert.equal(candidateElements[1].style.flexGrow, 7);
      });
    });

    suite('candidatePanel with even width for each candidate',  function() {
      setup(function() {
        var options = { widthUnit: 1 };
        candidatePanelView = new CandidatePanelView({}, options, viewManager);
      });

      test('Each candidate has the same width', function() {
        candidatePanelView.render();
        candidatePanelView.showCandidates(createFakeCandidates(5));

        var suggestionsContainer =
          candidatePanelView.element.querySelector('.suggestions-container');
        assert.notEqual(suggestionsContainer, null);

        var candidateElements = suggestionsContainer.
          querySelectorAll('.candidate-row span');

        assert.equal(candidateElements.length, 5);

        for (var i = 0; i < candidateElements.length; i++) {
          assert.equal(candidateElements[i].style.flexGrow, 1);
        }
      });
    });
  });
});
