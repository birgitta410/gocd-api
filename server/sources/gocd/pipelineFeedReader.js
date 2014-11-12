
define(['q', 'lodash', 'server/sources/gocd/pipelineRun', 'server/sources/gocd/gocdRequestor', 'server/sources/gocd/atomEntryParser'],
  function (Q, _, pipelineRunCreator, gocdRequestor, atomEntryParser) {

  var pipelineRuns = { };

  var MIN_NUMBER_PIPELINE_RUNS = 25;

  var requestStages = function (next) {

    return gocdRequestor.get(next).then(function(json) {
      json.feed.entry = _.map(json.feed.entry, function(entry) {
        return atomEntryParser.withData(entry);
      });
      return json;
    });

  };

  var readPipelineRuns = function (options, originalDefer) {

    var defer = originalDefer || Q.defer();

    options = options || {};
    options.exclude = options.exclude || [];

    requestStages(options.nextUrl).then(function (result) {

      if (result !== undefined) {

        var pipelineRunInitPromises = _.map(result.feed.entry, function (entry) {

            if(! pipelineRuns[entry.buildNumber]) {
              var pipelineRun = pipelineRunCreator.createNew(entry);
              pipelineRuns[entry.buildNumber] = pipelineRun;
              return pipelineRun.promiseInitialise();

            } else {
              return [pipelineRuns[entry.buildNumber].addStage(entry)];
            }
          }
        );

        pipelineRunInitPromises = _.compact(pipelineRunInitPromises);

        Q.all(pipelineRunInitPromises).then(function() {

          var nextLink = _.find(result.feed.link, { rel: 'next' });

          if (nextLink && _.keys(pipelineRuns).length < MIN_NUMBER_PIPELINE_RUNS) {
            var nextUrl = nextLink.href;
            readPipelineRuns(_.extend(options, { nextUrl: nextUrl }), defer);
          } else {
            var filteredResults = _.omit(pipelineRuns, function (value, key) {
              return _.contains(options.exclude, key);
            });

            defer.resolve(filteredResults);
          }

        }, defer.reject);

      } else {
        defer.resolve({});
      }

    }, defer.reject);

    return defer.promise;

  };

  var clear = function() {
    pipelineRuns = {};
  };

  return {
    readPipelineRuns: readPipelineRuns,
    clear: clear
  };

});
