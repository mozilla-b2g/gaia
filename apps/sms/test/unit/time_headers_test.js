/*global Utils, TimeHeaders, MockL10n */

'use strict';

requireApp('sms/js/utils.js');
requireApp('sms/js/time_headers.js');
requireApp('sms/test/unit/mock_l10n.js');

suite('TimeHeaders > ', function() {

  var realMozL10n;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  suite('TimeHeaders.updateAll', function() {
    var existingHeaders, existingTimes;

    setup(function() {
      this.sinon.useFakeTimers(Date.parse('2013-01-01'));
      this.sinon.spy(TimeHeaders, 'update');

      var additionalDataset = [
        'data-is-thread="true"',
        'data-hour-only="true"',
        ''
      ];

      var mockThreadListMarkup = '';

      additionalDataset.forEach(function(dataset, i) {
        var mockDate = Date.now();
        dataset += ' data-time-update="repeat"' +
          ' data-time="' + mockDate + '"';

        mockThreadListMarkup +=
          '<header ' + dataset + '>header ' + i + '</header>' +
          '<ul>' +
            '<li id="thread-1" data-time="' + mockDate + '">' +
              '<p><time data-time-update="true" ' +
              'data-time-only="true" data-time="' + mockDate +
              '"></time></p>' +
            '</li>' +
            '<li id="thread-2" data-time="' + mockDate + '">' +
              '<p><time data-time-update="true" ' +
              'data-time-only="true" data-time="' + mockDate +
              '"></time></p>' +
            '</li>' +
          '</ul>';
      });

      document.body.innerHTML = mockThreadListMarkup;

      TimeHeaders.updateAll();

      existingHeaders = [];
      existingTimes = [];

      var headers = document.querySelectorAll('header');
      for (var i = 0; i < headers.length; i++) {
        existingHeaders[i] = headers[i].textContent;
      }

      var timeElements = document.querySelectorAll('time');
      for (var j = 0; j < timeElements.length; j++) {
        existingTimes[j] = timeElements[j].textContent;
      }

    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    suite('timezone was not changed', function() {
      test('calling at same time should not update headers ' +
        'and time elements', function() {
        var i = 0, l = 0;

        var timeElements = document.querySelectorAll('time');
        for (i = 0, l = timeElements.length; i < l; i++) {
          timeElements[i].dataset.time = Date.now();
        }

        TimeHeaders.updateAll('header[data-time-update]');

        var headers = document.querySelectorAll('header');
        for (i = 0, l = headers.length; i < l; i++) {
          assert.equal(headers[i].textContent, existingHeaders[i]);
        }

        for (i = 0, l = timeElements.length; i < l; i++) {
          assert.equal(timeElements[i].textContent, existingTimes[i]);
        }
      });

      test('calling after one hour should not update time headers ' +
        'and time elements', function() {
        var i = 0, l = 0;

        this.sinon.clock.tick(60 * 60 * 1000);

        var timeElements = document.querySelectorAll('time');
        for (i = 0, l = timeElements.length; i < l; i++) {
          timeElements[i].dataset.time = Date.now();
        }

        TimeHeaders.updateAll('header[data-time-update]');

        var headers = document.querySelectorAll('header');
        for (i = 0, l = headers.length; i < l; i++) {
          assert.equal(headers[i].textContent, existingHeaders[i]);
        }

        for (i = 0, l = timeElements.length; i < l; i++) {
          assert.equal(timeElements[i].textContent, existingTimes[i]);
        }
      });

      test('calling after one day should update all date headers', function() {
        var i = 0, l = 0;

        this.sinon.clock.tick(24 * 60 * 60 * 1000);

        var timeElements = document.querySelectorAll('time');
        for (i = 0, l = timeElements.length; i < l; i++) {
          timeElements[i].dataset.time = Date.now();
        }

        TimeHeaders.updateAll('header[data-time-update]');

        var headers = document.querySelectorAll('header');
        for (i = 0, l = headers.length; i < l; i++) {
          assert.notEqual(headers[i].textContent, existingHeaders[i]);
        }

        for (i = 0, l = timeElements.length; i < l; i++) {
          assert.equal(timeElements[i].textContent, existingTimes[i]);
        }

        //should call update total 12 times
        //setup:3(headers)+6(times), test:3(headers)
        assert.equal(TimeHeaders.update.callCount, 12);
      });
    });

    suite('timezone was changed', function() {
      //When timezones was changed, 'visibilitychange'.
      //Therefore 'TimeHeaders.updateAll()' is called by argument 'false'.
      test('calling at same time should not update headers ' +
        'and time elements', function() {
        var i = 0, l = 0;

        var timeElements = document.querySelectorAll('time');
        for (i = 0, l = timeElements.length; i < l; i++) {
          timeElements[i].dataset.time = Date.now();
        }

        TimeHeaders.updateAll();

        var headers = document.querySelectorAll('header');
        for (i = 0, l = headers.length; i < l; i++) {
          assert.equal(headers[i].textContent, existingHeaders[i]);
        }

        for (i = 0, l = timeElements.length; i < l; i++) {
          assert.equal(timeElements[i].textContent, existingTimes[i]);
        }
      });

      test('calling after one hour should update all time elements',
        function() {
        var i = 0, l = 0;

        //since we can't change timezones easily,
        //we simulate this by changing the stored 'time' dataset
        this.sinon.clock.tick(60 * 60 * 1000);

        var timeElements = document.querySelectorAll('time');
        for (i = 0, l = timeElements.length; i < l; i++) {
          timeElements[i].dataset.time = Date.now();
        }

        TimeHeaders.updateAll();

        var headers = document.querySelectorAll('header');
        for (i = 0, l = headers.length; i < l; i++) {
          assert.equal(headers[i].textContent, existingHeaders[i]);
        }

        for (i = 0, l = timeElements.length; i < l; i++) {
          assert.notEqual(timeElements[i].textContent, existingTimes[i]);
        }
      });

      test('calling after one day should update all date headers ' +
        'and time elements', function() {
        var i = 0, l = 0;

        //since we can't change timezones easily,
        //we simulate this by changing the stored 'time' dataset
        this.sinon.clock.tick(24 * 60 * 60 * 1000);

        var timeElements = document.querySelectorAll('time');
        for (i = 0, l = timeElements.length; i < l; i++) {
          timeElements[i].dataset.time = Date.now();
        }

        TimeHeaders.updateAll();

        var headers = document.querySelectorAll('header');
        for (i = 0, l = headers.length; i < l; i++) {
          assert.notEqual(headers[i].textContent, existingHeaders[i]);
        }

        for (i = 0, l = timeElements.length; i < l; i++) {
          assert.notEqual(timeElements[i].textContent, existingTimes[i]);
        }

        //should call update total 18 times
        //setup:3(headers)+6(times), test:3(headers)+6(times)
        assert.equal(TimeHeaders.update.callCount, 18);
      });
    });
  });

  suite('TimeHeaders.update', function() {
    var subject, formattedTime, formattedDate;

    setup(function() {
      subject = document.createElement('header');
      subject.dataset.timeUpdate = 'repeat';
      var time = Date.parse('2013-01-01');
      subject.dataset.time = time;
      formattedTime = Utils.getFormattedHour(time);
      formattedDate = Utils.getHeaderDate(time);
    });

    test('date and time header', function() {
      TimeHeaders.update(subject);
      var content = subject.textContent;
      assert.include(content, formattedTime);
      assert.include(content, formattedDate);
    });

    test('date header', function() {
      subject.dataset.isThread = 'true';
      TimeHeaders.update(subject);

      var content = subject.textContent;
      assert.isTrue(content.indexOf(formattedTime) === -1);
      assert.include(content, formattedDate);
    });

    test('time header', function() {
      subject.dataset.timeOnly = 'true';
      TimeHeaders.update(subject);

      var content = subject.textContent;
      assert.include(content, formattedTime);
      assert.isTrue(content.indexOf(formattedDate) === -1);
    });
  });

  suite('TimeHeaders.startScheduler', function() {

    setup(function() {
      this.callTimes = [];
      this.sinon.useFakeTimers();
      this.updateStub = this.sinon.stub(TimeHeaders, 'updateAll',
        function() {
          this.callTimes.push(Date.now());
        }.bind(this));
    });

    test('timeout on minute boundary', function() {
      // "Fri Jul 12 2013 16:01:54 GMT-0400 (EDT)"
      var start = 1373659314572;

      this.sinon.clock.tick(start);
      TimeHeaders.startScheduler();
      this.sinon.clock.tick(100 * 1000);

      // Fri Jul 12 2013 16:02:00 GMT-0400 (EDT)
      assert.equal(this.callTimes[0], 1373659320000);
      // Fri Jul 12 2013 16:03:00 GMT-0400 (EDT)
      assert.equal(this.callTimes[1], 1373659380000);
    });

    test('multiple calls converge', function() {
      this.updateStub.reset();

      for (var i = 0; i < 100; i++) {
        TimeHeaders.startScheduler();
      }
      this.sinon.clock.tick(60 * 1000);
      assert.equal(this.updateStub.callCount, 1);
    });
  });

  suite('TimeHeaders.stopScheduler', function() {
    setup(function() {
      this.sinon.spy(window, 'clearTimeout');
      TimeHeaders.stopScheduler();
    });

    test('stopScheduler called', function() {
      assert.ok(window.clearTimeout.called);
    });
  });

  suite('TimeHeaders.init', function() {
    var isDocumentHidden;

    suiteSetup(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return isDocumentHidden;
        }
      });
    });

    suiteTeardown(function() {
      delete document.hidden;
    });

    setup(function() {
      this.sinon.spy(TimeHeaders, 'startScheduler');
      this.sinon.spy(TimeHeaders, 'stopScheduler');
      this.sinon.spy(TimeHeaders, 'updateAll');
    });

    suite('init itself', function() {
      setup(function() {
        isDocumentHidden = false;

        this.sinon.spy(TimeHeaders, 'init');
        TimeHeaders.init();
      });

      test('startScheduler is called', function() {
        // Because in startScheduler, we will still call stopScheduler,
        // that's why I use this check to make sure we call startScheduler
        // correctly.
        assert.ok(TimeHeaders.startScheduler.calledBefore(
          TimeHeaders.stopScheduler));
        assert.ok(TimeHeaders.updateAll.called);
      });
    });

    suite('when document is hidden', function() {
      setup(function() {
        isDocumentHidden = false;
        TimeHeaders.init();

        TimeHeaders.startScheduler.reset();
        TimeHeaders.stopScheduler.reset();
        TimeHeaders.updateAll.reset();

        isDocumentHidden = true;
        document.dispatchEvent(new CustomEvent('visibilitychange'));
      });

      test('TimeHeaders.stopScheduler is called', function() {
        assert.ok(TimeHeaders.stopScheduler.called);
        assert.ok(!TimeHeaders.startScheduler.called);
        assert.ok(!TimeHeaders.updateAll.called);
      });
    });

    suite('when document is not hidden', function() {
      setup(function() {
        isDocumentHidden = true;
        TimeHeaders.init();

        TimeHeaders.startScheduler.reset();
        TimeHeaders.stopScheduler.reset();

        isDocumentHidden = false;
        document.dispatchEvent(new CustomEvent('visibilitychange'));
      });

      test('TimeHeaders.startScheduler is called', function() {
        assert.ok(TimeHeaders.updateAll.called);
        assert.ok(TimeHeaders.startScheduler.calledBefore(
          TimeHeaders.stopScheduler));
      });
    });
  });
});
