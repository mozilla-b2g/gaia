from quay.io/mozilla/tester:0.0.5
maintainer Aus Lacroix <aus@mozilla.com>

# install our custom git plugin
copy git/target/doc/git-ci-checkout-pr.1 /usr/local/man/man1/git-ci-checkout-pr.1
copy git/target/doc/git-ci-checkout-ref.1 /usr/local/man/man1/git-ci-checkout-ref.1
copy git/target/doc/git-ci-checkout-setup.1 /usr/local/man/man1/git-ci-checkout-setup.1
copy git/git-ci-checkout-pr /usr/local/bin/git-ci-checkout-pr
copy git/git-ci-checkout-ref /usr/local/bin/git-ci-checkout-ref
copy git/git-ci-checkout-setup /usr/local/bin/git-ci-checkout-setup

env SHELL /bin/bash

run git config --global user.email "gaia@mozilla.com"
run git config --global user.name "gaia-taskenv"

env NODE_VERSION v0.10.36
run cd /usr/local/ && \
    curl https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.gz | tar -xz --strip-components 1 && \
    node -v
run npm install npm@latest -g
run npm install taskcluster-vcs@2.3.4 -g
run npm install taskcluster-npm-cache@1.1.14 -g

# run some more root commands which change frequently
copy ./bin/entrypoint /home/worker/bin/entrypoint
copy ./bin/buildbot_step /home/tester/bin/buildbot_step
run chmod a+x /home/worker/bin/entrypoint
