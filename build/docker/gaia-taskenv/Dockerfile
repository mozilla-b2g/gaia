from lightsofapollo/ubuntu-node:latest
maintainer James Lal <james@lightsofapollo.com>

# start by installing all our ubuntu packages
run sudo apt-get -y update
run sudo apt-get -yq install git-core curl wget firefox build-essential xvfb python-pip
run useradd -d /home/tester -s /bin/bash -m tester;

env HOME /home/tester
env SHELL /bin/bash
env USER tester
env LOGNAME tester
env PATH $PATH:/home/tester/bin
workdir /home/tester

# run as tester here for right permissions but run it early for caching
user tester
run git clone http://github.com/mozilla-b2g/gaia.git /home/tester/git_checkout/

# run some more root commands which change frequently
user root
run sudo apt-get -yq install python-virtualenv
add ./bin/entrypoint /home/tester/bin/entrypoint
run chmod a+x /home/tester/bin/entrypoint

# finally switch back to user... do not do anything other then the entrypoint
# after this unless you want to break caching each build!
# XXX: Enable tester soon!
#user tester
# this entrypoint is bash with Xvfb running by default
entrypoint ["/home/tester/bin/entrypoint"]
