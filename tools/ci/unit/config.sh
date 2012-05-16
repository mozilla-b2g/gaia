if [ -z "$B2G_HOME" ];
then
  echo "B2G_HOME must be set";
  exit 1;
fi

if [ -z "$TEST_AGENT_SERVER" ];
then
  echo "TEST_AGENT_SERVER must be set";
  exit 1;
fi

if [ -z "$TEST_OUTPUT"];
then
  TEST_OUTPUT=$B2G_HOME/test-output.xml;
fi
