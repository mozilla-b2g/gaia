from quay.io/mozilla/tester:0.0.5
maintainer Aus Lacroix <aus@mozilla.com>

# install our custom git plugin
copy git/target/doc/git-ci-checkout-pr.1 /usr/local/man/man1/git-ci-checkout-pr.1
copy git/target/doc/git-ci-checkout-ref.1 /usr/local/man/man1/git-ci-checkout-ref.1
copy git/target/doc/git-ci-checkout-setup.1 /usr/local/man/man1/git-ci-checkout-setup.1
copy git/git-ci-checkout-pr /usr/local/bin/git-ci-checkout-pr
copy git/git-ci-checkout-ref /usr/local/bin/git-ci-checkout-ref
copy git/git-ci-checkout-setup /usr/local/bin/git-ci-checkout-setup

env HOME /home/tester
env SHELL /bin/bash
env USER tester
env LOGNAME tester
env PATH $PATH:/home/tester/bin
workdir /home/tester

run git config --global user.email "gaia@mozilla.com"
run git config --global user.name "gaia-taskenv"

# run some more root commands which change frequently
copy ./bin/entrypoint /home/tester/bin/entrypoint
run chmod a+x /home/tester/bin/entrypoint
