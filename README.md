gocd-api
=======

[![Build Status Snap-CI](https://snap-ci.com/birgitta410/gocd-api/branch/master/build_image)](https://snap-ci.com/birgitta410/gocd-api/)

Module to access data from your Go CD server (http://www.go.cd/), e.g. to feed it into a build monitor. Also works with Snap CI.

Will give you access to both current activity (which stage is currently building, what is the state of the latest pipeline run) and history data about past pipeline runs.

Run tests
======
```
# Run tests with sample data
./node_modules/jasmine/bin/jasmine.js

# Run a few smoke tests against a Go CD instance
GOCD_URL=https://your-gocd:8154 GOCD_USER=your-user GOCD_PASSWORD=your-password GOCD_PIPELINE=your-pipeline-name GOCD_DEBUG=true ./run_spec_integration.sh

```

Usage
======
```
var goCdApi = require('gocd-api');
goCdApi.getInstance({
  url: 'https://1.2.3.4:8154',
  pipeline: 'yourPipelineName',
  user: 'yourGoUser',
  password: 'yourGoPassword',
  jobs: [
    'yourPipelineName :: build',
    'yourPipelineName :: test',
    'yourPipelineName :: deploy'
  ],
  debug: true // default: false, will do some verbose logging to console
}).then(function(instanceWithACacheOfInitialData) {

  var gocdData = instanceWithACacheOfInitialData.readData("pipeline-name");
  //...

});


```

Config or a Snap CI project:
```
{
  type: 'SNAP',
  pipeline: 'yourProjectName',
  user: 'your Snap CI User',
  key: 'your Snap CI API key'
}
```

This is what you will get from `readData()`:
```
{
  activity: {}, // which stage is currently building, what is the state of the latest pipeline run
  history: {}   // historical data about past pipeline runs
}
```
Check `spec/samples` for details about the contents of [activity](spec/local/samples/activity.json) and [history](spec/local/samples/history.json).

This project uses gocd-api: https://github.com/artwise/artwise.

How it works
=======
The module will keep pipeline history data cached in memory. Your first call to create the instance will fill that cache initially, so waiting for the instance might take a bit longer. The cache will contain at least 25 entries, give or take, depending on page sizes returned from the endpoint.
