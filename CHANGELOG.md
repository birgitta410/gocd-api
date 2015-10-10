
### v0.7.0
!! Breaking changes

* gocd-api determines names of all pipelines and loads all their data
* Calls to `readData` have to be parametrized with a pipeline name
* Getting instance of the API is now asynchronous, first call loads all data into cache
* Caching and reading pipeline history are two different things now (every read led to cache updates before)
* Activity contains stages instead of jobs

### v0.6.0
* Support HTTPS access to Go CD
* Filter activities by configured pipeline name
