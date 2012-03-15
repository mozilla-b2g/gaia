function generatorTest() {
  waitForExplicitFinish();

  yield testApp('../dialer/dialer.html', function(window, document, nextStep) {
    ok(window.document === document, 'window and document are related');
    ok(document.readyState === 'complete', 'document fully loaded');
    ok(typeof nextStep === 'function', 'nextStep func is okay');
  });

  finish();
}
