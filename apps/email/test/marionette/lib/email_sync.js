/*jshint node: true, browser: true */

function EmailSync(client) {
  this.client = client;
}
module.exports = EmailSync;

EmailSync.prototype = {
  /**
   * Call this in the setup() for the test.
   */
/*
  setup: function() {
    //WHAT? this does not work here. Must do it in
    //the actual test. Bananas, since a readFileSync
    //of the path for the mock works.
    //this.client.contentScript.inject(__dirname +
    //  '/mocks/mock_navigator_mozalarms.js');
  },
*/
  /**
   * Does the work to trigger a sync using helpers in
   * mock_navigator_mozalarms.js. Assumes the mock
   * mock_navigator_mozalarms.js was already injected.
   */
  triggerSync: function() {
    // trigger sync in Email App
    this.client.executeScript(function() {
      var interval = 1000;
      var date = new Date(Date.now() + interval).getTime();
      var alarm = {
        data: {
          type: 'sync',
          accountIds: ['0', '1'],
          interval: interval,
          timestamp: date
        }
      };
      return window.wrappedJSObject.fireMessageHandler(alarm);
    });
  }
};
