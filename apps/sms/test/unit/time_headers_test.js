/*global Utils, TimeHeaders, MockL10n, MockFixedHeader, MocksHelper */

'use strict';

requireApp('sms/js/utils.js');
requireApp('sms/js/time_headers.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_fixed_header.js');

var mocksHelperForTimeHeaders = new MocksHelper([
  'FixedHeader'
]).init();

suite('TimeHeaders > ', function() {

  var realMozL10n;

  mocksHelperForTimeHeaders.attachTestHelpers();

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  suite('TimeHeaders.updateAll', function() {
    var existingTitles;

    setup(function() {
      this.sinon.useFakeTimers(Date.parse('2013-01-01'));
      this.sinon.spy(MockFixedHeader, 'updateHeaderContent');

      var additionalDataset = [
        'data-is-thread="true"',
        'data-hour-only="true"',
        ''
      ];

      var mockThreadListMarkup = '';

      additionalDataset.forEach(function(dataset, i) {
        dataset += ' data-time-update="true"' +
          ' data-time="' + Date.now() + '"';

        mockThreadListMarkup +=
          '<header ' + dataset + '>header ' + i + '</header>' +
          '<ul>' +
            '<li>this is a thread</li>' +
            '<li>this is another thread</li>' +
          '</ul>';
      });

      document.body.innerHTML = mockThreadListMarkup;

      TimeHeaders.updateAll();

      existingTitles = [];

      var headers = document.querySelectorAll('header');
      for (var i = 0, l = headers.length; i < l; i++) {
        existingTitles[i] = headers[i].textContent;
      }
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('calling after one hour should not update time headers', function() {
      this.sinon.clock.tick(60 * 60 * 1000);
      TimeHeaders.updateAll();

      var headers = document.querySelectorAll('header');
      for (var i = 0, l = headers.length; i < l; i++) {
        assert.equal(headers[i].textContent, existingTitles[i]);
      }
    });

    suite('calling after one day', function() {
      setup(function() {
        this.sinon.clock.tick(24 * 60 * 60 * 1000);
        this.sinon.spy(TimeHeaders, 'update');
        TimeHeaders.updateAll();
      });

      test('should update all date headers', function() {
        var headers = document.querySelectorAll('header');
        for (var i = 0, l = headers.length; i < l; i++) {
          assert.notEqual(headers[i].textContent, existingTitles[i]);
        }
      });

      test('should call update 3 times', function() {
        assert.equal(TimeHeaders.update.callCount, 3);
      });
    });

    test('should call FixedHeader.updateHeaderContent', function() {
      assert.ok(MockFixedHeader.updateHeaderContent.called);
    });
  });

  suite('TimeHeaders.update', function() {
    var subject, formattedTime, formattedDate;

    setup(function() {
      subject = document.createElement('header');
      subject.dataset.timeUpdate = 'true';
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

      // we are called on start
      assert.equal(this.callTimes[0], start);
      // Fri Jul 12 2013 16:02:00 GMT-0400 (EDT)
      assert.equal(this.callTimes[1], 1373659320000);
      // Fri Jul 12 2013 16:03:00 GMT-0400 (EDT)
      assert.equal(this.callTimes[2], 1373659380000);
    });

    test('multiple calls converge', function() {
      this.updateStub.reset();

      for (var i = 0; i < 100; i++) {
        TimeHeaders.startScheduler();
      }
      this.sinon.clock.tick(60 * 1000);
      assert.equal(this.updateStub.callCount, 101);
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
      });
    });

    suite('when document is hidden', function() {
      setup(function() {
        isDocumentHidden = false;
        TimeHeaders.init();

        TimeHeaders.startScheduler.reset();
        TimeHeaders.stopScheduler.reset();

        isDocumentHidden = true;
        document.dispatchEvent(new CustomEvent('visibilitychange'));
      });

      test('TimeHeaders.stopScheduler is called', function() {
        assert.ok(TimeHeaders.stopScheduler.called);
        assert.ok(!TimeHeaders.startScheduler.called);
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
        assert.ok(TimeHeaders.startScheduler.calledBefore(
          TimeHeaders.stopScheduler));
      });
    });
  });
});
