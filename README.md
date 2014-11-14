gocd-api
=======

[![Build Status](https://travis-ci.org/birgitta410/gocd-api.svg?branch=master)](https://travis-ci.org/birgitta410/gocd-api/)

Module to access data from your Go CD server, e.g. to feed it into a build monitor.

Will give you access to both current activity (which stage is currently building, what is the state of the latest pipeline run) and history data about past pipeline runs.

In early stages, migrating from https://github.com/artwise/artwise

Use it
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
  ]
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
Check `spec/samples` for details about the contents of [activity](spec/samples/activity.json) and [history](spec/samples/history.json).