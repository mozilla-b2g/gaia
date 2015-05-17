/*global LocalizationHelper,
         MockL10n,
         Utils
*/
'use strict';

require('/views/shared/js/utils.js');
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

  test('localizes placeholders', function() {
    var placeHolder1 = document.createElement('div');
    placeHolder1.classList.add('js-l10n-placeholder');
    placeHolder1.id = 'first-placeholder';

    var placeHolder2 = document.createElement('div');
    placeHolder2.classList.add('js-l10n-placeholder');
    placeHolder2.id = 'second-placeholder';

    document.body.appendChild(placeHolder1);
    document.body.appendChild(placeHolder2);

    navigator.mozL10n.ready.yield();

    sinon.assert.calledTwice(navigator.mozL10n.translateFragment);
    assert.equal(
      placeHolder1.dataset.placeholder,
      navigator.mozL10n.get(Utils.camelCase(placeHolder1.id) + '_placeholder')
    );
    assert.equal(
      placeHolder2.dataset.placeholder,
      navigator.mozL10n.get(Utils.camelCase(placeHolder2.id) + '_placeholder')
    );
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

        function assertChange(format, doNotFormat) {
          // In case of time format change date-only elements aren't updated
          if (doNotFormat) {
            assert.equal(
              node.textContent, '', 'Date-only elements should not be updated'
            );
          } else {
            assert.equal(
              node.textContent,
              Utils.date.format.localeFormat(new Date(timestamp), format)
            );
          }

          assert.isFalse(node.hasAttribute('data-l10n-id'));
          assert.isFalse(node.hasAttribute('data-l10n-args'));
        }

        node.dataset.l10nDate = timestamp;
        node.dataset.l10nDateFormat = 'format';

        // In case of time format change date-only elements shouldn't be updated
        assertChange(node.dataset.l10nDateFormat, forceUpdateMethod());

        node.dataset.l10nDateFormat12 = 'format12';
        node.dataset.l10nDateFormat24 = 'format24';

        navigator.mozHour12 = true;
        forceUpdateMethod();

        assertChange(node.dataset.l10nDateFormat12);

        navigator.mozHour12 = false;
        forceUpdateMethod();

        assertChange(node.dataset.l10nDateFormat24);
      });

      test('correctly formats node l10n attributes', function() {
        var timestamp = Date.now();

        function assertChange(format, doNotFormat) {
          var l10nAttributes = navigator.mozL10n.getAttributes(node);
          // In case of time format change date-only elements aren't updated
          if (doNotFormat) {
            assert.deepEqual(l10nAttributes.args, {
              data: 'custom'
            }, 'Date-only elements should not be updated');
          } else {
            assert.deepEqual(l10nAttributes.args, {
              data: 'custom',
              date: Utils.date.format.localeFormat(new Date(timestamp), format)
            });
          }

          assert.equal(l10nAttributes.id, 'custom');
          assert.equal(node.textContent, 'not-changed-content');
        }

        navigator.mozL10n.setAttributes(node, 'custom', {
          data: 'custom'
        });
        node.dataset.l10nDate = timestamp;
        node.dataset.l10nDateFormat = 'format';
        node.textContent = 'not-changed-content';

        // In case of time format change date-only elements shouldn't be updated
        assertChange(node.dataset.l10nDateFormat, forceUpdateMethod());

        node.dataset.l10nDateFormat12 = 'format12';
        node.dataset.l10nDateFormat24 = 'format24';

        navigator.mozHour12 = true;
        forceUpdateMethod();

        assertChange(node.dataset.l10nDateFormat12);

        navigator.mozHour12 = false;
        forceUpdateMethod();

        assertChange(node.dataset.l10nDateFormat24);
      });
    });
  });
});
