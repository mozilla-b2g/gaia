from taskcluster/tester:0.4.4
maintainer Aus Lacroix <aus@mozilla.com>

# configure git identity
run git config --global user.email "gaia@mozilla.com"
run git config --global user.name "gaia-taskenv"

# run some more root commands which change frequently
copy ./bin/entrypoint /home/worker/bin/entrypoint
run chmod a+x /home/worker/bin/entrypoint
