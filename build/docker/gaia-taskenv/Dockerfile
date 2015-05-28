from lightsofapollo/ubuntu-node:latest
maintainer James Lal <james@lightsofapollo.com>

# start by installing all our ubuntu packages
run sudo apt-get -y update
run sudo apt-get -yq install git-core curl wget firefox build-essential xvfb \
                             python-pip man python-virtualenv

run useradd -d /home/tester -s /bin/bash -m tester;

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
run npm install npm@latest -g
run npm install taskcluster-vcs@2.3.4 -g
run npm install taskcluster-npm-cache@1.1.12 -g

# run some more root commands which change frequently
copy ./bin/entrypoint /home/tester/bin/entrypoint
copy ./bin/buildbot_step /home/tester/bin/buildbot_step
run chmod a+x /home/tester/bin/entrypoint
