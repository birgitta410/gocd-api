# gocd-api

[![Build Status Snap-CI](https://snap-ci.com/birgitta410/gocd-api/branch/master/build_image)](https://snap-ci.com/birgitta410/gocd-api/)

Module to access data from your Go CD server (http://www.go.cd/), e.g. to feed it into a build monitor. Also works with Snap CI.

Will give you access to both current activity (which stage is currently building, what is the state of the latest pipeline run) and history data about past pipeline runs.

## Run tests
```
### Run tests with sample data
./node_modules/jasmine/bin/jasmine.js

### Run a few smoke tests against a Go CD instance
GOCD_URL=https://your-gocd:8154 GOCD_USER=your-user GOCD_PASSWORD=your-password GOCD_PIPELINE=your-pipeline-name GOCD_DEBUG=true ./run_spec_integration.sh

```

## Usage

```
var goCdApi = require('gocd-api');
goCdApi.getInstance({
  url: 'https://1.2.3.4:8154',
  pipeline: 'yourPipelineName',
  user: 'yourGoUser',
  password: 'yourGoPassword',
  debug: true // default: false, will do some verbose logging to console
}).then(function(instanceWithACacheOfInitialData) {

  var gocdData = instanceWithACacheOfInitialData.readData("pipeline-name");
  //...

}).done();


```

### Config for a Snap CI project:
```
{
  type: 'SNAP',
  pipeline: 'yourProjectName',
  user: 'your Snap CI User',
  key: 'your Snap CI API key'
}
```

## Data
This is what you will get from `readData()`:
```
{
  activity: {}, // which stage is currently building, what is the state of the latest pipeline run
  history: {}   // historical data about past pipeline runs
}
```
### Activity

Sample: [activity](spec/local/samples/activity.json)

The list of stages will basically contain the properties of `Project` entries `cctray.xml`.

Additions:
- fields `info` and `info2` for user-facing summaries
- lastBuildStatus will be set to "Cancelled" based on Go.CD history information (cctray.xml only returns 'Success' or 'Failure' out of the box)
- field `gocdActivity` can be used to determine if stage is actually building, or still scheduled/prepared/...

### History

Sample: [history](spec/local/samples/history.json).

Contains the raw data returned by the [Go CD's history API endpoint](https://api.go.cd/current/#get-pipeline-history) returns. In addition, there is a `summary` object for each pipeline run with aggregated data that is useful for most build monitors:

```
"summary": {
    "result": "passed",
    "text": "[2066] passed | Edward Norton | Some comment 5554 | 15:54:02, December 19th 2014",
    "lastScheduled": 1419000842499,
    "author": {
        "email": "<enorton@theinternet.com>",
        "name": "Edward Norton",
        "initials": "eno"
    },
    "changeInfo": {
        "committer": "Edward Norton <enorton@theinternet.com>",
        "comment": "Some comment 5554",
        "revision": "cb855ca1516888541722d8c0ed8973792f30ee57"
    }
}
```


## Note on how the data is loaded

Your first call to create the instance will fill a cache with all pipelines' history initially, so waiting for the instance might take a bit longer. It will go about 50 history entries into the past. Subsequent calls will get live updates for activities, and also live updates for the latest history. The rest of the data will be taken from the cache.
