requireApp('communications/contacts/js/export/sd.js');
requireApp('communications/contacts/test/unit/mock_get_device_storage.js');
requireApp('communications/contacts/test/unit/export/mock_export_utils.js');

mocha.globals(
  [
    'ContactToVcardBlob',
    '_',
    'getUnusedFilename',
    'getStorageIfAvailable'
  ]
);

suite('Sd export', function() {

  var subject;
  var realDeviceStorage = null;
  var c1 = {
        familyName: ['foo'],
        givenName: ['bar']
      },
      c2 = {}, c3 = {}, c4 = {};
  var updateSpy = null;
  var progressMock = function dummy() {};
  var realContactToVcardBlob = null;
  var real_ = null;
  var realgetStorageIfAvailable = null;
  var realgetUnusedFilename = null;
  var fileName = '';

  suiteSetup(function() {
    // Device storage mock
    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockgetDeviceStorage;

    // L10n mock
    real_ = window._;
    window._ = function() {};

    //getStorageIfAvailable mock
    realgetStorageIfAvailable = window.getStorageIfAvailable;
    window.getStorageIfAvailable = MockGetStorageIfAvailable;

    //getUnusedFilename mock
    realgetUnusedFilename = window.getUnusedFilename;
    window.getUnusedFilename = MockGetUnusedFilename;

  });

  suiteTeardown(function() {
    navigator.getDeviceStorage = realDeviceStorage;
    window._ = real_;
    window.getStorageIfAvailable = realgetStorageIfAvailable;
    window.getUnusedFilename = realgetUnusedFilename;
  });

  setup(function() {
    subject = new ContactsSDExport();
    subject.setProgressStep(progressMock);
    realContactToVcardBlob = window.ContactToVcardBlob;
    window.ContactToVcardBlob = function() {};
    updateSpy = this.sinon.stub(
      window,
      'ContactToVcardBlob',
      function(contact, callback) {
        callback(contact[0]);
      }
    );
  });

  teardown(function() {
    window.ContactToVcardBlob = realContactToVcardBlob;
  });

  test('Calling with 1 contact', function(done) {
    subject.setContactsToExport([c1]);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.equal(false, subject.hasDeterminativeProgress());
      assert.equal(1, updateSpy.callCount);
      assert.isNull(error);
      assert.equal(1, exported);
      done();
    });
  });

  test('Calling with several contacts', function(done) {
    var contacts = [c1, c2, c3, c4];
    var today = new Date();
    var name = [
      today.getDate(),
      today.getMonth() + 1,
      today.getFullYear(),
      contacts.length
    ].join('_')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase() +
    '.vcf';
    subject.setContactsToExport(contacts);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.equal(1, updateSpy.callCount);
      assert.isNull(error);
      assert.equal(contacts.length, exported);
      done();
    });
  });
});
