'use strict';

var htmlHelper, simcardUnlock, realMozSettings, realMozL10n;

suite('RP Auth panels', function() {
  suiteSetup(function(done) {
    require([
      'html_helper',
      'mymocks/mock_simcard_unlock',
      'mocks/mock_navigator_moz_settings',
      'mocks/mock_l10n'
    ],

    function(html, simcard, mozSettings, mozL10n) {
      htmlHelper = html;
      simcardUnlock = simcard;

      realMozSettings = navigator.mozSettings;
      navigator.mozSettings = mozSettings;

      realMozL10n = navigator.mozL10n;
      navigator.mozL10n = mozL10n;

      done();
    });
  });

  setup(function(done) {
    require(['rp/auth'], authPanel => {
      var test;

      this.subject = authPanel;
      this.mainHTML = htmlHelper.get('../../templates/rp/main.html');
      this.changeHTML = htmlHelper.get('../../templates/rp/change_pass.html');
      this.featuresHTML = htmlHelper.get('../../templates/rp/features.html');

      test = document.getElementById('test');
      test.appendChild(this.mainHTML);
      test.appendChild(this.changeHTML);
      test.appendChild(this.featuresHTML);

      this.subject.init();

      this.randomizeString = function(length) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
          'abcdefghijklmnopqrstuvwxyz';
        var result = '';

        for (var i = 0; i < length; i++) {
          var rnum = Math.floor(Math.random() * chars.length);
          result += chars.substring(rnum, rnum + 1);
        }

        return result;
      };

      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realMozL10n;
  });

  suite('validate passphrase', function() {

    test('should validate given passphrase during register', function() {
      var p1 = 'mypass';
      var p2 = 'mypass';
      var result = this.subject.comparePasswords(p1, p2);
      assert.equal(result, '');
    });

    test('should result with error (different passwords)', function() {
      var p1 = 'mypass1';
      var p2 = 'mypass2';
      var result = this.subject.comparePasswords(p1, p2);
      assert.equal(result, 'passphrase-different');
    });

    test('should result with error (invalid chars)', function() {
      var p1 = 'mypass1$%#';
      var p2 = 'mypass2';
      var result = this.subject.comparePasswords(p1, p2);
      assert.equal(result, 'passphrase-invalid');
    });

    test('should result with error (empty password)', function() {
      var p1 = '';
      var p2 = '';
      var result = this.subject.comparePasswords(p1, p2);
      assert.equal(result, 'passphrase-empty');
    });

    test('should result with error (password is too long)', function() {
      var p1 = this.randomizeString(101);
      var p2 = 'test';
      var result = this.subject.comparePasswords(p1, p2);
      assert.equal(result, 'passphrase-too-long');
    });

  });

  suite('compare pin', function() {

    test('should validate given pin during change request', function() {
      var p1 = '1337';
      var p2 = '1337';
      var result = this.subject.comparePINs(p1, p2);
      assert.equal(result, '');
    });

    test('should result with error (different passwords)', function() {
      var p1 = '1337';
      var p2 = '2578';
      var result = this.subject.comparePINs(p1, p2);
      assert.equal(result, 'pin-different');
    });

    test('should result with error (invalid chars)', function() {
      var p1 = 'pin';
      var p2 = '1234';
      var result = this.subject.comparePINs(p1, p2);
      assert.equal(result, 'pin-invalid');
    });

    test('should result with error (empty password)', function() {
      var p1 = '';
      var p2 = '';
      var result = this.subject.comparePINs(p1, p2);
      assert.equal(result, 'pin-empty');
    });

  });

  suite('validate pin', function() {

    setup(function() {
      this.pintry = this.changeHTML.querySelector('.pin-tries-left');
      this.pintryID = 'pin-tries-left'; // l10n key

      this.validPIN = '1234'; // as expected by the mock
      this.wrongPIN = '1337';

      this.sinon.stub(navigator.mozL10n, 'setAttributes');
    });

    test('should result with error (2 tries left)', function() {
      this.subject.verifySIMPIN(simcardUnlock, this.wrongPIN);
      sinon.assert.calledWith(navigator.mozL10n.setAttributes,
        this.pintry, this.pintryID, { n: 2 });
    });

    test('should result with error (last try)', function() {
      this.subject.verifySIMPIN(simcardUnlock, this.wrongPIN);
      sinon.assert.calledWith(navigator.mozL10n.setAttributes,
        this.pintry, this.pintryID, { n: 1 });
    });

    test('should pass', function() {
      this.subject.verifySIMPIN(simcardUnlock, this.validPIN);
      sinon.assert.notCalled(navigator.mozL10n.setAttributes);
    });

  });

});
