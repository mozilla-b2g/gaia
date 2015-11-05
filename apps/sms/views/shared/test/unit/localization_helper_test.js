/*global LocalizationHelper,
         MockL10n
*/
'use strict';

require('/views/shared/js/localization_helper.js');

require('/shared/test/unit/mocks/mock_l20n.js');

suite('LocalizationHelper >', function() {
  var navigatorMozL10n;

  function onDOMRetranslated() {
    document.addEventListener.withArgs('DOMRetranslated').yield();
    return false;
  }

  function onTimeFormatChange() {
    window.addEventListener.withArgs('timeformatchange').yield();
    return true;
  }

  setup(function(done) {
    navigatorMozL10n = document.l10n;
    document.l10n = MockL10n;

    this.sinon.stub(document.l10n, 'translateFragment');
    this.sinon.stub(window, 'addEventListener');
    this.sinon.stub(document, 'addEventListener');

    const getAttr = this.sinon.stub(document.documentElement, 'getAttribute');
    getAttr.withArgs('lang').returns('be-BY');
    getAttr.withArgs('dir').returns('rtl');

    [
      'attachment-container',
      'attachment-container',
      'custom'
    ].forEach((iframeClassName) => {
      var iframe = document.createElement('iframe');
      iframe.className = iframeClassName;
      document.body.appendChild(iframe);
    });

    var customIframeDocument = document.querySelector(
      'iframe.custom'
    ).contentDocument;
    customIframeDocument.documentElement.lang = 'en-US';
    customIframeDocument.documentElement.dir = 'ltr';

    LocalizationHelper.init().then(
      () => undefined).then(done, done);
  });

  teardown(function() {
    document.l10n = navigatorMozL10n;
  });

  test('localizes only attachment iframes', function() {
    sinon.assert.calledTwice(document.l10n.translateFragment);
    var attachmentContainers = document.querySelectorAll(
      'iframe.attachment-container'
    );
    Array.forEach(attachmentContainers, (iframe) => {
      var doc = iframe.contentDocument;
      assert.equal(doc.documentElement.lang, 'be-BY');
      assert.equal(doc.documentElement.dir, 'rtl');
      sinon.assert.calledWith(document.l10n.translateFragment, doc.body);
    });

    // Custom iframe should stay untouched.
    var customIframeDocument = document.querySelector(
      'iframe.custom'
    ).contentDocument;
    assert.equal(customIframeDocument.documentElement.lang, 'en-US');
    assert.equal(customIframeDocument.documentElement.dir, 'ltr');
  });

  [onDOMRetranslated, onTimeFormatChange].forEach(function(forceUpdateMethod) {
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

          var l10nAttributes = document.l10n.getAttributes(node);
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

        document.l10n.setAttributes(node, 'custom', {
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
