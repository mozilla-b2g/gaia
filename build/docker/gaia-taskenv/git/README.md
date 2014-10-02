# git-ci-checkout

A set of git extensions for checkout out repositories from github in
various workflows:

 - as a pull request [git-ci-checkout-pr]
 - as a branch/ref of an existing repository [git-ci-checkout-ref]

These commands follow the conventions set down by git to extend its base
functionality and include man files for documentation purposes.

These commands are designed to _avoid_ the use of "magic" refs that
exist on github and instead use git commands which are repeatable and
idempotent.

## Install

For local testing or reproducing things manually... Installation is
intended to be part of a docker process so you should normally not need
these locally.

### Requirement:
 - http://johnmacfarlane.net/pandoc/

```sh
make install
```

## Testing

See the `tests` folder these are end-to-end tests and rely on a remote
repository (meaning you need an internet connection to run them).

### Running the tests

```sh
make check
```
