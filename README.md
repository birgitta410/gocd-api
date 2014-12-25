gocd-api
=======

[![Build Status Snap-CI](https://snap-ci.com/birgitta410/gocd-api/branch/master/build_image)](https://snap-ci.com/birgitta410/gocd-api/)

Module to access data from your Go CD server, e.g. to feed it into a build monitor.

Will give you access to both current activity (which stage is currently building, what is the state of the latest pipeline run) and history data about past pipeline runs.

Run tests
======
```
# Run tests with sample data
npm test

# Run a few smoke tests against a Go CD instance
GOCD_URL=http://user:password@your-gocd:8153 GOCD_PIPELINE=your-pipeline-name sh ./run_spec_integration.sh
```

Usage
======
```
var goCdApi = require('gocd-api');
var goCd = goCdApi.getInstance({
  url: '1.2.3.4:8153',
  pipeline: 'yourPipelineName',
  user: 'yourGoUser',
  password: 'yourGoPassword',
  jobs: [
    'yourPipelineName :: build',
    'yourPipelineName :: test',
    'yourPipelineName :: deploy'
  ],
  debug: true // default: false, will do some verbose logging to console
});
goCd.readData().then(function(data) {
  ...
});

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
The module will keep pipeline history data cached in memory. Your first call to readData will fill that cache, so it might take a bit longer. The cache will contain at least 25 entries, give or take, depending on page sizes returned from the endpoint.