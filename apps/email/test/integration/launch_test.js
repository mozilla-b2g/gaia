require('/apps/email/test/integration/email_integration.js');

suite('email - launch', function() {

  var device;
  var helper = IntegrationHelper;
  var app;

  teardown(function() {
    yield app.close();
  });

  MarionetteHelper.start(function(client) {
    app = new EmailIntegration(client);
    device = app.device;
  });

  setup(function() {
    yield app.launch();
  });

  test('start display and create account', function() {
    yield app.createFirstAccount({
      'name': 'joe',
      'email': 'joe@example.com',
      'password': 'ou812'});
  });

  /**
   * Uses the credentials provided in the provided testvars.json file.
   *
   * If no credentials are provided, then this test prints something
   * to the console and errors out.
   *
   * XXX: The version of mocha we're using doesn't have a test.skip,
   * so we can't easily mark this test as skipped. James is updating
   * mocha to 1.7. After that lands, we can make this less dumb.
   */
  test('integration test from testvars credentials file', function() {
    var testvars = app.getAppTestVars();

    if (!testvars.launch_name ||
        !testvars.launch_email ||
        !testvars.launch_password) {
      console.log('SKIPPING - "launch_name", "launch_email", ' +
                  'and "launch_password" not provided in Email testvars');
      return;
    }

    yield app.createFirstAccount(
        {'name': testvars.launch_name,
         'email': testvars.launch_email,
         'password': testvars.launch_password});
  });
});
