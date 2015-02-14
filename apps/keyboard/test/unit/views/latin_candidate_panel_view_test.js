'use strict';

/* global LatinCandidatePanelView, ViewUtils */
require('/js/views/base_view.js');
require('/js/views/view_utils.js');
require('/js/views/candidate_panel_view.js');
require('/js/views/latin_candidate_panel_view.js');

function createFakeCandidates(count) {
  var candidates = [];
  for (var i = 0; i < count; i++) {
    candidates.push('' + i);
  }

  return candidates;
}

suite('Views > LatinCandidatePanelView', function() {
  var candidatePanelView = null;
  var viewManager = {
    registerView: sinon.stub()
  };

  suite('some basic functions',  function() {
    setup(function() {
      var target = {};
      var options = {className: 'test-class'};
      candidatePanelView =
        new LatinCandidatePanelView(target, options, viewManager);
    });

    test('> render() ', function() {
      assert.equal(candidatePanelView.element, null);

      candidatePanelView.render();
      assert.notEqual(candidatePanelView.element, null);

      var classList = candidatePanelView.element.classList;
      assert.isTrue(classList.contains('test-class'),
                    'should contain the className specified in options');
    });

    test('> show no candidates', function() {
      candidatePanelView.render();

      candidatePanelView.showCandidates([]);

      var suggestionsContainer =
      candidatePanelView.element.querySelector('.suggestions-container');
      assert.notEqual(suggestionsContainer, null);

      // Should show dismiss button
      var dismissButton =
        candidatePanelView.element.querySelector('.dismiss-suggestions-button');
      assert.notEqual(dismissButton, null);

      assert.isTrue(dismissButton.classList.contains('hide'));
    });

    test('> show 3 candidates', function() {
      candidatePanelView.render();

      candidatePanelView.showCandidates(createFakeCandidates(3));

      var suggestionsContainer =
      candidatePanelView.element.querySelector('.suggestions-container');
      assert.notEqual(suggestionsContainer, null);

      var candidateElements = suggestionsContainer.querySelectorAll('span');
      assert.equal(candidateElements.length, 3);

      for (var i = 0; i < candidateElements.length; i++) {
        assert.equal(candidateElements[i].textContent, i);
        assert.equal(candidateElements[i].dataset.data, i);
      }

      // Should show dismiss button
      var dismissButton =
        candidatePanelView.element.querySelector('.dismiss-suggestions-button');
      assert.notEqual(dismissButton, null);

      assert.isFalse(dismissButton.classList.contains('hide'));
    });

    test('> show 3 candidates, with the first as auto correction', function() {
      candidatePanelView.render();

      candidatePanelView.showCandidates(['*1', '2', '3']);

      var suggestionsContainer =
      candidatePanelView.element.querySelector('.suggestions-container');
      assert.notEqual(suggestionsContainer, null);

      var candidateElements = suggestionsContainer.querySelectorAll('div');
      assert.equal(candidateElements.length, 3);

      // The first candidate should be highlighted
      assert.isTrue(candidateElements[0].classList.contains('autocorrect'));
    });

    test('Candidates scaling to 0.6', function() {
      candidatePanelView.render();

      sinon.stub(ViewUtils, 'getScale', function() {
        return 0.6;
      });

      var can = ['thisisverylongword', 'alsoverylongword', 'whatup'];
      candidatePanelView.showCandidates(can);

      var spans = candidatePanelView.element.querySelectorAll('span');
      assert.equal(spans[0].textContent, can[0]);
      assert.equal(spans[1].textContent, can[1]);
      assert.equal(spans[2].textContent, can[2]);
      assert.equal(spans[0].style.width, '166.667%');
      assert.equal(spans[0].style.transformOrigin, 'left center 0px');
      assert.equal(spans[0].style.transform, 'scale(0.6)');

      ViewUtils.getScale.restore();
    });

    test('Candidats scaling to 0.5', function() {

      candidatePanelView.render();

      sinon.stub(ViewUtils, 'getScale', function() {
        return 0.5;
      });

      var can = ['thisisverylongword', 'alsoverylongword', 'whatup'];
      candidatePanelView.showCandidates(can);

      var spans = candidatePanelView.element.querySelectorAll('span');
      assert.equal(spans[0].textContent, 't…d');
      assert.equal(spans[1].textContent, 'a…d');
      assert.equal(spans[2].textContent, 'w…p');
      assert.equal(spans[0].style.width, '200%');
      assert.equal(spans[0].style.transformOrigin, 'left center 0px');
      assert.equal(spans[0].style.transform, 'scale(0.5)');

      ViewUtils.getScale.restore();
    });
  });
});
