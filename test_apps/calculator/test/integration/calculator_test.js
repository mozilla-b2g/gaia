require('/apps/calculator/test/integration/calculator_integration.js');

suite('calculator', function() {

  var app;
  var device;

  var enter;

  suiteTeardown(function() {
    yield app.close();
  });

  MarionetteHelper.start(function(client) {
    app = new CalculatorIntegration(client);
    device = app.device;
  });

  suiteSetup(function() {
    yield app.launch();
    yield device.setScriptTimeout(10000);

    enter = yield app.element('enter');
  });

  teardown(function() {
    yield app.clear();
  });

  test('starting value', function() {
    var value = yield app.displayText();
    assert.equal(value, '0');
  });

  test('enter / clear', function() {
    var oneBtn = yield app.element('1');

    yield oneBtn.click();
    yield oneBtn.click();
    yield oneBtn.click();

    var display = yield app.displayText();
    assert.equal(display, '111');

    yield app.clear();

    display = yield app.displayText();
    assert.equal(display, '0');
  });

  test('single operator math', function() {
    // 100 / 2
    var math = '1 0 0 / 2';
    var expected = app.mathToDisplay(math);

    yield app.enterMath(math);

    var display = yield app.displayText();
    assert.equal(display, expected.join(''));
  });

  test('multiple operator math', function() {
    // result should be -1
    var math = '1 * 1 - 2';
    var display = app.mathToDisplay(math);
    yield app.enterMath(math);

    var value = yield app.displayText();
    assert.equal(value.replace(' ', ''), display.join(''));

    yield enter.click();
    assert.equal((yield app.displayText()), '-1');
  });

  test('invalid operation', function() {
    var math = '9 + -';
    var display = app.mathToDisplay(math);
    yield app.enterMath(math);
    yield enter.click();

    var value = yield app.displayText();

    assert.equal(value, display.join(''),
                 'should not calculate invalid entries.');

    var backspace = yield app.element('clear');

    // clear the previous operator and enter a valid number
    yield backspace.click();
    yield app.enterMath('1');
    yield enter.click();

    // verify after an invalid operation calculator works
    value = yield app.displayText();
    assert.equal(value, '10', 'recovers form invalid');
  });

});
