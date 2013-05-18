requireApp('fm/js/fm.js');

suite('FM', function() {
  var tempNode;

  function setFrequency(frequency) {
    var setFreq = frequencyDialer.setFrequency(frequency);
    if (frequency < mozFMRadio.frequencyLowerBound) {
      assert.equal(setFreq, mozFMRadio.frequencyLowerBound);
    } else if (frequency > mozFMRadio.frequencyUpperBound) {
      assert.equal(setFreq, mozFMRadio.frequencyUpperBound);
    } else {
      assert.equal(setFreq, frequency);
    }
  }

  suite('frequency dialer', function() {

    suiteSetup(function() {

      tempNode = document.createElement('div');
      tempNode.id = 'test';
      tempNode.innerHTML =
        '<div id="frequency-bar">' +
        '  <div id="frequency-display">' +
        '    <a id="bookmark-button" href="#bookmark"' +
        '      data-bookmarked="false"></a>' +
        '    <div id="frequency">0</div>' +
        '  </div>' +
        '</div>' +
        '<div id="dialer-bar">' +
        '  <div id="dialer-container">' +
        '    <div id="frequency-indicator"></div>' +
        '    <div id="frequency-dialer" class="animation-on"></div>' +
        '  </div>' +
        '</div>' +
        '<div id="antenna-warning" hidden="hidden"></div>';

      document.body.appendChild(tempNode);
      frequencyDialer.init();

    });

    suiteTeardown(function() {
      tempNode.parentNode.removeChild(tempNode);
      tempNode = null;
    });

    test('resolved frequency within bounds', function()  {
      setFrequency(92);
    });

    test('resolved frequency exceeding upperbound', function() {
      setFrequency(mozFMRadio.frequencyUpperBound + 10);
    });

    test('resolved frequency exceeding lowerbound', function() {
      setFrequency(mozFMRadio.frequencyLowerBound - 10);
    });

    test('retrieved frequency', function() {
      assert.equal(frequencyDialer.getFrequency(), 87.5);
    });

    test('updated #frequency dom display digits', function() {
      assert.equal($('frequency').textContent, 87.5);
    });

    test('changed horizontal position of dialer', function() {
      var prevX = frequencyDialer._translateX;
      frequencyDialer.setFrequency(100);
      assert.notEqual(frequencyDialer._translateX, prevX);
    });

    test('#frequency display percision to one decimal point', function() {
        assert.ok($('frequency').textContent.indexOf('.') > -1);
      });

  });

  suite('history list', function() {
    setup(function() {
      historyList._save = function() {return true};
    });

    test('item added to history list', function() {
      historyList.add(100);
      assert.equal(historyList._historyList.length, 1);
    });

    test('gets the last frequency tuned', function() {
      assert.equal(historyList.last().frequency, 100);
    });

  });

  suite('favorite list', function() {

    suiteSetup(function() {
      favoritesList._save = function() {return true};
      favoritesList._favList = {};
      tempNode = document.createElement('div');
      tempNode.id = 'test';
      tempNode.innerHTML = '<div id="fav-list-container"></div>';

      document.body.appendChild(tempNode);
    });

    suiteTeardown(function() {
      tempNode.parentNode.removeChild(tempNode);
      tempNode = null;
    });

    test('item added to favorite list', function() {
      favoritesList.add(100);
      assert.equal(Object.keys(favoritesList._favList).length, 1);
    });

    test('added item is updated in DOM #fav-list', function() {
      assert.equal($('fav-list-container').childNodes.length, 1);
    });

    test('contains a frequency', function() {
      assert.ok(favoritesList.contains(100));
    });

    test('selected frequency in DOM #fav-list', function() {
      favoritesList.select(100);
      assert.ok($$('#fav-list-container div.fav-list-item')[0]
        .classList.contains('selected'));
    });

    test('removed frequency from list', function() {
      assert.ok(favoritesList.remove(100));
    });

    test('removed item is updated in DOM #fav-list', function() {
      assert.equal($('fav-list-container').childNodes.length, 0);
    });

    test('items are in desceding order', function() {
      favoritesList.add(100);
      favoritesList.add(101);
      favoritesList.add(102);
      var items = $$('#fav-list-container div.fav-list-item');
      var isAscending = true;
      for (var i = 0, len = items.length; i < len - 1; i++) {
        var itemA = items[i].childNodes[0].textContent;
        var itemB = items[i + 1].childNodes[0].textContent;
        if (itemA > itemB) {
          isAscending = false;
          break;
        }
      }
      assert.ok(isAscending);
    });

  });

  suite('update display states', function() {
    suiteSetup(function() {
      mozFMRadio.enabled = true;
      mozFMRadio.antennaAvailable = true;
      tempNode = document.createElement('div');
      tempNode.id = 'test';
      tempNode.innerHTML =
        '<div id="antenna-warning" hidden="hidden"></div>' +
        '<div id="frequency-bar"></div>' +
        '<a id="power-switch" href="#power-switch" data-enabled="false"' +
        '  data-enabling="false"></a></div>';

      document.body.appendChild(tempNode);
      updateEnablingState(true);
    });

    suiteTeardown(function() {
      tempNode.parentNode.removeChild(tempNode);
      tempNode = null;
    });

    suite('enabling UI', function() {

      test('#power-switch enabled attribute is correctly set', function() {
        assert.equal(!!$('power-switch').dataset.enabled, mozFMRadio.enabled);
      });

      test('#power-switchh enabling attribute is correctly set', function() {
        assert.equal(!!$('power-switch').dataset.enabling, enabling);
      });

      test('#frequency-bar display is dimmed', function() {
        assert.ok($('frequency-bar').classList.contains('dim'));
      });

      test('#antenna-warning is hidden', function() {
        assert.ok(!!$('antenna-warning').hidden, mozFMRadio.antennaAvailable);
      });
    });
  });
});
