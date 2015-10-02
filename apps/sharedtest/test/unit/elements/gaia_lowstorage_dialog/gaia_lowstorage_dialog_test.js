'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_lowstorage_dialog/script.js');

suite('<gaia-lowstorage-dialog>', function() {
  var container;
  var element;
  var confirm;

  setup(function() {
    this.sinon.stub(navigator.mozL10n, 'translateFragment');
    this.sinon.stub(navigator.mozL10n, 'once');
    window.MozActivity = sinon.stub();

    container = document.createElement('div');
    container.innerHTML = `
      <gaia-lowstorage-dialog>
        <div>Some text</div>
      </gaia-lowstorage-dialog>
    `;
    element = container.firstElementChild;
    confirm = element.shadowRoot.querySelector('gaia-confirm');
    document.body.appendChild(container);
  });

  teardown(function() {
    container.remove();
    delete window.MozActivity;
  });

  test('The shadow DOM is properly localized', function() {
    navigator.mozL10n.once.yield();
    sinon.assert.calledOnce(navigator.mozL10n.translateFragment);
    sinon.assert.calledWith(
      navigator.mozL10n.translateFragment, element.shadowRoot
    );

    window.dispatchEvent(new CustomEvent('localized'));
    sinon.assert.calledTwice(navigator.mozL10n.translateFragment);

    element.remove();
    window.dispatchEvent(new CustomEvent('localized'));
    sinon.assert.calledTwice(navigator.mozL10n.translateFragment);
  });

  test('The `confirm` event is properly sent.', function() {
    var stub = sinon.stub();

    element.addEventListener('confirm', stub);
    confirm.dispatchEvent(new CustomEvent('confirm'));

    sinon.assert.called(stub);
  });

  test('The `hidden` attribute is properly handled', function() {
    element.setAttribute('hidden', '');
    assert.equal(confirm.getAttribute('hidden'), '');
    element.setAttribute('hidden', 'test');
    assert.equal(confirm.getAttribute('hidden'), '');
    element.removeAttribute('hidden');
    assert.isFalse(confirm.hasAttribute('hidden'));
  });

  test('Starts the right activity when clicking on `Learn More`', function() {
    var learnmore = element.shadowRoot.querySelector('.learnmore-link');
    var clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
    var canceled = !learnmore.dispatchEvent(clickEvt);

    sinon.assert.calledWith(window.MozActivity, {
      name: 'configure',
      data: { section: 'applicationStorage' }
    });

    assert.isTrue(canceled, 'The event is canceled.');
  });

});

