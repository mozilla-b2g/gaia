'use strict';

var realMozSettings, htmlHelper;

suite('RPP Auth panels', function() {
  suiteSetup(function(done) {
    require([
      'html_helper',
      'mocks/mock_navigator_moz_settings'
    ],

    function(html, mozSettings) {
      htmlHelper = html;
      realMozSettings = navigator.mozSettings;
      navigator.mozSettings = mozSettings;
      done();
    });
  });

  setup(function(done) {
    require(['rpp/auth'], authPanel => {
      var test;

      this.subject = authPanel;
      this.mainHTML = htmlHelper.get('../../templates/rpp/main.html');
      this.changeHTML = htmlHelper.get('../../templates/rpp/change_pass.html');
      this.featuresHTML = htmlHelper.get('../../templates/rpp/features.html');

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

  suite('validate pin', function() {

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

});
