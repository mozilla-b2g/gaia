/*global LocalizationHelper,
         MockL10n
*/
'use strict';

require('/views/shared/js/localization_helper.js');

require('/shared/test/unit/mocks/mock_l10n.js');

suite('LocalizationHelper >', function() {
  var navigatorMozL10n;

  function onL10nReady() {
    navigator.mozL10n.ready.yield();
    return false;
  }

  function onTimeFormatChange() {
    window.addEventListener.withArgs('timeformatchange').yield();
    return true;
  }

  setup(function() {
    navigatorMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    this.sinon.stub(navigator.mozL10n, 'ready');
    this.sinon.stub(navigator.mozL10n, 'translateFragment');
    this.sinon.stub(window, 'addEventListener');

    LocalizationHelper.init();
  });

  teardown(function() {
    navigator.mozL10n = navigatorMozL10n;
  });

  test('localizes iframes on l10n.ready', function() {
    document.body.appendChild(document.createElement('iframe'));
    document.body.appendChild(document.createElement('iframe'));

    navigator.mozL10n.language.code = 'be-BY';
    navigator.mozL10n.language.direction = 'rtl';
    navigator.mozL10n.ready.yield();

    sinon.assert.calledTwice(navigator.mozL10n.translateFragment);
    Array.forEach(document.querySelectorAll('iframe'), (iframe) => {
      var doc = iframe.contentDocument;
      assert.equal(doc.documentElement.lang, 'be-BY');
      assert.equal(doc.documentElement.dir, 'rtl');
      sinon.assert.calledWith(navigator.mozL10n.translateFragment, doc.body);
    });
  });

  [onL10nReady, onTimeFormatChange].forEach(function(forceUpdateMethod) {
    suite('localizes date & time ' + forceUpdateMethod.name +' >', function() {
      var node;

      setup(function() {
        node = document.createElement('div');
        node.classList.add('l10n-contains-date');
        document.body.appendChild(node);
      });

      teardown(function() {
        node.remove();
      });

      test('ignores if date or format are unavailable', function() {
        node.dataset.l10nDate = '';
        node.dataset.l10nDateFormat = 'format';
        node.textContent = 'not-changed-content';

        forceUpdateMethod();

        assert.equal(node.textContent, 'not-changed-content');
        assert.isFalse(node.hasAttribute('data-l10n-id'));
        assert.isFalse(node.hasAttribute('data-l10n-args'));

        node.dataset.l10nDate = Date.now();
        node.dataset.l10nDateFormat = '';
        node.textContent = 'not-changed-content';

        forceUpdateMethod();

        assert.equal(node.textContent, 'not-changed-content');
        assert.isFalse(node.hasAttribute('data-l10n-id'));
        assert.isFalse(node.hasAttribute('data-l10n-args'));
      });

      test('correctly formats node content', function() {
        var timestamp = Date.now();
        var options = {
          month: 'long',
          day: '2-digit',
          year: 'numeric',
        };

        function assertChange(options, doNotFormat) {
          options.hour12 = navigator.mozHour12;
          var formatter =
            new Intl.DateTimeFormat(navigator.languages, options);
          // In case of time format change date-only elements aren't updated
          if (doNotFormat) {
            assert.equal(
              node.textContent, '', 'Date-only elements should not be updated'
            );
          } else {
            assert.equal(
              node.textContent,
              formatter.format(new Date(timestamp))
            );
          }

          assert.isFalse(node.hasAttribute('data-l10n-id'));
          assert.isFalse(node.hasAttribute('data-l10n-args'));
        }

        node.dataset.l10nDate = timestamp;
        node.dataset.l10nDateFormat = JSON.stringify(options);
        // In case of time format change date-only elements shouldn't be updated
        assertChange(options, forceUpdateMethod());

        options.hour = 'numeric';
        options.minute = 'numeric';
        node.dataset.l10nDateFormat = JSON.stringify(options);

        navigator.mozHour12 = true;
        forceUpdateMethod();
        assertChange(options);

        navigator.mozHour12 = false;
        forceUpdateMethod();

        assertChange(options);
      });

      test('correctly formats node l10n attributes', function() {
        var timestamp = Date.now();
        var options = {
          month: 'long',
          day: '2-digit',
          year: 'numeric',
        };

        function assertChange(options, doNotFormat) {
          options.hour12 = navigator.mozHour12;
          var formatter =
            new Intl.DateTimeFormat(navigator.languages, options);

          var l10nAttributes = navigator.mozL10n.getAttributes(node);
          // In case of time format change date-only elements aren't updated
          if (doNotFormat) {
            assert.deepEqual(l10nAttributes.args, {
              data: 'custom'
            }, 'Date-only elements should not be updated');
          } else {
            assert.deepEqual(l10nAttributes.args, {
              data: 'custom',
              date: formatter.format(new Date(timestamp))
            });
          }

          assert.equal(l10nAttributes.id, 'custom');
          assert.equal(node.textContent, 'not-changed-content');
        }

        navigator.mozL10n.setAttributes(node, 'custom', {
          data: 'custom'
        });
        node.dataset.l10nDate = timestamp;
        node.dataset.l10nDateFormat = JSON.stringify(options);
        node.textContent = 'not-changed-content';
        // In case of time format change date-only elements shouldn't be updated
        assertChange(options, forceUpdateMethod());

        options.hour = 'numeric';
        options.minute = 'numeric';
        node.dataset.l10nDateFormat = JSON.stringify(options);

        navigator.mozHour12 = true;
        forceUpdateMethod();

        assertChange(options);

        navigator.mozHour12 = false;
        forceUpdateMethod();

        assertChange(options);
      });
    });
  });
});
