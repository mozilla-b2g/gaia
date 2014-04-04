Calendar.Error = (function(window) {

  /**
   * These errors are _not_ exceptions and are designed to be passed not thrown
   * in typical |throw new X| fashion.
   */
  function Base(name, detail) {
    this.message = 'oops... why did you throw this?';
    this.name = name;
    this.detail = detail;
  }

  Base.prototype = Object.create(Error.prototype);

  function errorFactory(name, l10nID) {
    var error = function(detail) {
      this.name = name;
      this.detail = detail;
      /**
       * we need to use l10nID's for backwards compatibility
       * (not changing string IDs between releases).
       */
      this.l10nID = l10nID || name;
    };

    error.prototype = Object.create(Base.prototype);
    return error;
  }

  /* note names should _never_ change */
  Base.Authentication = errorFactory('authentication', 'unauthenticated');
  Base.InvalidServer = errorFactory('invalid-server', 'internal-server-error');
  Base.ServerFailure = errorFactory('server-failure', 'internal-server-error');

  return Base;

}(this));
