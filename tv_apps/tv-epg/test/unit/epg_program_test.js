'use strict';
/* jshint browser: true */
/* global EPGProgram */

require('/js/epg_program.js');

suite('tv-epg/epg_program', function() {

  var epgProgram;

  suiteSetup(function() {
    window.EPG = {
      COLUMN_WIDTH: 33.8,
      COLUMN_MARGIN: 0.6
    };
  });

  setup(function() {
    epgProgram = new EPGProgram();
  });

  suite('createdCallback', function() {
    test('Initialization', function() {
      assert.equal(epgProgram.duration, 1);
      assert.equal(epgProgram.dataset.duration, '1');
      assert.isDefined(epgProgram.titleElement);
      assert.isDefined(epgProgram.progressElement);
    });
  });

  suite('resetProgressElement', function() {
    setup(function() {
      epgProgram.startTime = 10;
      epgProgram.duration = 3;
    });

    test('Program has been played', function() {
      epgProgram.resetProgressElement(20);
      assert.equal(epgProgram.progressElement.style.transform, 'scaleX(1)');
    });

    test('Program is still playing', function() {
      epgProgram.resetProgressElement(12);
      assert.equal(epgProgram.progressElement.style.transform, '');
      assert.isTrue(epgProgram.progressElement.classList.contains('smooth'));
    });
  });

  suite('fillProgress', function() {
    test('Fill color of progress element', function() {
      epgProgram.fillProgress();
      assert.equal(epgProgram.progressElement.style.transform, 'scaleX(1)');
    });
  });

  suite('startTime', function() {
    test('Set start time', function() {
      epgProgram.startTime = 20;
      assert.equal(epgProgram.startTime, 20);
    });
  });

  suite('title', function() {
    test('Set title of title element', function() {
      epgProgram.title = 'title';
      assert.equal(epgProgram.titleElement.textContent, 'title');
    });
  });

  suite('setTitlePadding', function() {
    test('Set padding of title element', function() {
      epgProgram.titlePadding = '10rem';
      assert.equal(epgProgram.titleElement.style.paddingLeft, '10rem');
    });
  });

  suite('setDuration', function() {
    test('Set duration of epgProgram', function() {
      epgProgram.duration = 10;
      assert.equal(epgProgram.duration, 10);
      assert.equal(epgProgram.dataset.duration, '10');
    });
  });

  suite('hide', function() {
    test('Hide epgProgram', function() {
      epgProgram.hide();
      assert.isTrue(epgProgram.classList.contains('hidden'));
    });
  });

  suite('show', function() {
    test('Show epgProgram', function() {
      epgProgram.show();
      assert.isFalse(epgProgram.classList.contains('hidden'));
    });
  });

  suiteTeardown(function() {
    window.EPG = null;
  });
});
