(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Models) === 'undefined') {
    Calendar.Models = {};
  }

  function Account() {

  }

  Account.prototype = {

    provider: null,

    url: '',
    user: '',
    passsword: '',

    /**
     * Verifies account settings on server
     *
     * @param {Function} callback node style callback.
     */
    verify: function() {

    }

  };


  Calendar.Models.Account = Account;

}(this));
