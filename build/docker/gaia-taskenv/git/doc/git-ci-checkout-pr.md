% git ci-checkout-pr(1)
% James Lal
% September 23, 2014

# NAME
git-ci-checkout-pr - optionally clone and checkout a rev in a git repo.
Then apply a set of changes from another repository to it.

# SYNOPSIS

git ci-checkout-pr <directory> <base_repository> <base_revision> <head_repository> <head_revision>

# DESCRIPTION

The `ci-checkout-pr` command is designed to checkout a particular
repo/revision into an existing git checkout (or create one) then apply a
set of changes from another repository on to (via a merge). This is how
github pull requests work.

# EXAMPLES

Checkout a v2.0 branch from gaia then apply changes from another branch:

```sh
git ci-checkout-pr \
  $HOME/gaia \
  https://github.com/mozilla-b2g/gaia.git \
  v2.0 \
  https://github.com/lightsofapollo/gaia.git \
  my-v2-changes
```
