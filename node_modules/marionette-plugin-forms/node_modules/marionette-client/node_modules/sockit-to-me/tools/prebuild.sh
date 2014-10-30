#!/usr/bin/env bash
# curl -L https://raw.github.com/mozilla-b2g/sockit-to-me/master/tools/prebuild.sh | bash -s stable
# This script prebuilds nodejs and sockit-to-me on ubuntu since we can't do
# it on the fly on the build machines (they don't have gcc).
UBUNTU=/home/ubuntu

sudo apt-get -y update --fix-missing
sudo apt-get -y install g++ gcc git make
cd $UBUNTU && git clone https://github.com/joyent/node
cd $UBUNTU && git clone https://github.com/mozilla-b2g/sockit-to-me

# Build nodejs.
cd $UBUNTU/node && git checkout v0.10.21 && ./configure && make && sudo make install

# Install node-gyp.
sudo npm install -g node-gyp

# Build sockit-to-me.
cd $UBUNTU/sockit-to-me && node-gyp configure build
