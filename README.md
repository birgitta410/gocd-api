gocd-api
=======

[![Build Status](https://travis-ci.org/birgitta410/gocd-api.svg?branch=master)](https://travis-ci.org/birgitta410/gocd-api/)

Module to access data from your Go CD server, e.g. to feed it into a build monitor.

Will give you access to both current activity (which stage is currently building, what is the state of the latest pipeline run) and history data about past pipeline runs.

In early stages, migrating from https://github.com/artwise/artwise

Run tests
======
```
# run tests with sample data
npm test

# run a few smoke tests against a Go CD instance
GOCD_URL=http://user:password@your-gocd:8153 sh ./run_spec_integration.sh
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
Check `spec/samples` for details about the contents of [activity](spec/unit/samples/activity.json) and [history](spec/unit/samples/history.json).

How it works
=======
The module will keep pipeline history data cached in memory. Your first call to readData will fill that cache, so it will take a bit longer. The cache will contain at least 25 entries, give or take, depending on page sizes that we get from the feed.