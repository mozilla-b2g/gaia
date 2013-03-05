require('/tests/js/app_integration.js');

function EmailIntegration(device) {
  AppIntegration.apply(this, arguments);
}

EmailIntegration.prototype = {
  __proto__: AppIntegration.prototype,

  appName: 'Email',

  /** selector tables */
  selectors: {
    cardSetupPickService: 'div.card-setup-pick-service',
    servicesContainer: 'div.sup-services-container',
    // XXX: This assumes that the Other Email choice is the third one
    // in the list. This is fragile, but there's nothing else to go
    // on.
    otherEmailChoice: 'li.sup-service-choice:nth-child(0n+3)',

    setupInfoName: 'div.sup-form > .sup-info-name',
    setupInfoEmail: 'div.sup-form > .sup-info-email',
    setupInfoPassword: 'div.sup-form > .sup-info-password',
    nextButton: 'button.sup-info-next-btn',
    continueButton: 'button.sup-show-mail-btn'
  },

  /**
   * Closes email app and deletes the db.
   */
  close: function close(callback) {
    var self = this;

    this.task(function close_task(app, next, done) {
      var device = app.device;

      yield device.executeScript(
        // (From calendar tests:) yuck! but Function.toString is
        // broken in sub-files in xpcshell right now. (Bug 804404)
        // TODO: bug 804404 is fixed, so we should use whatever that
        // enatils.
        // TODO: b2g-email is hard-coded here. should we move this to
        // a constant?
        'window.indexedDB.deleteDatabase("b2g-email")'
      );
      yield AppIntegration.prototype.close.call(self, next);

      // XXX: deleteDatabase is async and needs some time to kick in
      // and all that, so we give it a second. (ew.)
      setTimeout(function() {
        done();
      }, 1000);
    }, callback);
  },

  /**
   * Sets the value for a single input element.
   *
   * The Email app uses a lot of input fields, but doesn't use forms
   * or ids, so it's hard to use app.updateForm.
   *
   * Most of this was copied over from updateForm.
   */
  updateInput: function updateInput(inputElement, value, callback) {
    var self = this;
    this.task(function(app, next, done) {
      yield inputElement.clear(next);
      yield inputElement.sendKeys([value], next);

      done();
    }.bind(this), callback);
  },

  /**
   * Wait for a transition to be over by looking at the
   * Cards._eatingEventsUntilNextCard state.
   *
   * Usage:
   *
   *    yield app.waitForTransitionEnd()
   */
  waitForTransitionEnd: function waitForTransitionEnd(callback) {
    this.waitFor(
      function testFun(testCallback) {
        this.task(function(app, next, done) {
          var val = yield app.device.executeScript(
            'return window.wrappedJSObject.Cards._eatingEventsUntilNextCard;',
            function(err, result) {
              done(null, (result === false));
            });
        }, testCallback);
      }.bind(this), 3000, callback);
  },

  /**
   * Waits for a specified card to show.
   *
   * This will wait as long as 10 seconds because we use this to wait
   * for email account setup to complete and sometimes that takes a
   * while.
   *
   * Note: This checks the cards stack, so if we ever change how that
   * works, then this will need to be changed as well.
   */
  waitForCard: function waitForCard(cardname, callback) {
    this.waitFor(
      function testFun(testCallback) {
        this.task(function(app, next, done) {
          var val = yield app.device.executeScript(
            // XXX: This is fragile. It'd be nice if Cards had a
            // gimmeTopCardNow() method.
            'return window.wrappedJSObject.' +
              'Cards._cardStack.slice(-1)[0].cardDef.name;',
            function(err, result) {
              done(null, (result === cardname));
            });
        }, testCallback);
      }.bind(this), 10000, callback);
  },

  /**
   * Retrieve account credentials from specified filename.
   *
   * If the filename is not specified, it defaults to
   * 'account_creds.json'.
   *
   * This assumes all account files are in this directory.
   *
   * Returns an object with 'name', 'email', and 'password' keys or
   * null if the file doesn't exist.
   *
   * XXX: Rewrite this so the tests use one testvars file and it is
   * specified on the command line like the python QA tests and move
   * to AppIntegration scaffolding.
   */
  getAccountInfo: function getAccountInfo(filename) {
    var fs = window.xpcModule.require('fs');

    filename = filename || 'account_creds.json';

    // XXX: This assumes the integration tests execute in the cwd of
    // tests/js/ .
    filename = '../../apps/email/test/integration/' + filename;

    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename));
    }

    return null;
  },

  /**
   * Creates an email account from the given credentials.
   *
   * Credentials is a dict with name, email and password keys.
   *
   * Note: This assumes that the email app is not open and that it's
   * never been used before (i.e. no accounts, fresh state).
   */
  createFirstAccount: function createFirstAccount(creds, callback) {
    this.task(function(app, next, done) {
      yield app.waitForCard('setup-pick-service');
      yield app.waitForTransitionEnd();

      // Click on "Other Email"
      var otherEmailChoice = yield app.element('otherEmailChoice');
      yield otherEmailChoice.click();

      yield app.waitForTransitionEnd();

      // We're on the setup account info card. Grab the next button
      // so we can verify it's enabled/disabled state over the next
      // few steps.
      var nextButton = yield app.element('nextButton');
      assert.equal(false, yield nextButton.enabled());

      // Get form input fields and verify values are empty. Then set the
      // values and verify the nextButton is in the correct state.
      var setupInfoName = yield app.element('setupInfoName');
      assert.equal('', yield setupInfoName.text());
      yield app.updateInput(setupInfoName, creds.name);
      assert.equal(false, yield nextButton.enabled());

      var setupInfoEmail = yield app.element('setupInfoEmail');
      assert.equal('', yield setupInfoEmail.text());
      yield app.updateInput(setupInfoEmail, creds.email);
      assert.equal(false, yield nextButton.enabled());

      var setupInfoPassword = yield app.element('setupInfoPassword');
      assert.equal('', yield setupInfoPassword.text());
      yield app.updateInput(setupInfoPassword, creds.password);
      assert.equal(true, yield nextButton.enabled());

      // Click on the next button to proceed
      yield nextButton.click();

      // The app might show a progress card here, so we wait through
      // that until we get to the setup card.
      yield app.waitForCard('setup-done');
      yield app.waitForTransitionEnd();

      var continueButton = yield app.element('continueButton');
      yield continueButton.click();

      done();
    }.bind(this), callback);
  }
};
