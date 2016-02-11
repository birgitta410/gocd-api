
### v0.9.0

* History now consists of pipelineRuns and statistics


### v0.8.0

* All fields that are aggregated by gocd-api are put into a separate object "summary", to better distinguish between raw data and aggregations
* Downstream pipelines can determine latest changer of upstream dependencies
* Activity knows if stages were cancelled
* Activity knows if stages are only scheduled or actually building

### v0.7.0

* gocd-api determines names of all pipelines and loads all their data
* Calls to `readData` have to be parametrized with a pipeline name
* Getting instance of the API is now asynchronous, first call loads all data into cache
* Caching and reading pipeline history are two different things now (every read led to cache updates before)
* Activity contains stages instead of jobs

### v0.6.0
* Support HTTPS access to Go CD
* Filter activities by configured pipeline name
