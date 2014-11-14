var Q = require('q');
var _ = require('lodash');
var pipelineRunCreator = require('./pipelineRun');
var globalOptions = require('../options');
var atomEntryParser = require('./atomEntryParser');

function pipelineFeedReaderModule() {

  var pipelineRuns = { };

  var MIN_NUMBER_PIPELINE_RUNS = 25;

  var requestStages = function (next) {

    return globalOptions.getGocdRequestor().get(next).then(function(json) {
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
              var pipelineRun = pipelineRunCreator.pipelineRun.createNew(entry);
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

        }).fail(function(e) {
          console.log('failed pipelineRunInits', e);
          defer.reject();
        });

      } else {
        defer.resolve({});
      }

    }).fail(function(e) {
      console.log('failed requestStages', e);
    });

    return defer.promise;

  };

  var clear = function() {
    pipelineRuns = {};
  };

  return {
    readPipelineRuns: readPipelineRuns,
    clear: clear
  };

};

var pipelineFeedReader = pipelineFeedReaderModule();
module.exports.readPipelineRuns = pipelineFeedReader.readPipelineRuns;
module.exports.clear = pipelineFeedReader.clear;
