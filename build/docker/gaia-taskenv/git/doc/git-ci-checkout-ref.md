% git ci-checkout-ref(1)
% James Lal
% September 23, 2014

# NAME
git-ci-checkout-ref - optionally clone and checkout a rev in a git repo.

# SYNOPSIS

git ci-checkout-ref <directory> <repository> <ref> <revision>

# DESCRIPTION

The `ci-checkout-ref` command is designed to checkout a particular
repo/revision into an existing git checkout (or create one). This is
suitable for testing a revision in a github repository (though not
limited to github use cases) and is a git extension command in part to
make local testing more obvious.

# EXAMPLES

Checkout a v2.0 branch from gaia:

```sh
git ci-checkout-ref $HOME/gaia https://github.com/mozilla-b2g/gaia.git v2.0 v2.0
```
