var _ = require('lodash');
var globalOptions = require('./lib/options');
var pipelineReader = require('./lib/gocd/pipelineFeedReader');
var ccTrayReader = require('./lib/cc/ccTrayReader');

var gocdRequestor = require('./lib/gocd/gocdRequestor');

GoCd = {

  getInstance : function(newOptions, type) {
    newOptions = newOptions || {};
    newOptions.type = type || 'GOCD';
    globalOptions.set(newOptions);

    var pipelineNames;

    gocdRequestor.getPipelineNames().then(function(names) {
      pipelineNames = names;
    });

    var readData = function(filterByPipeline) {

      function mapAuthorInitialsFromHistoryToActivity(history, activity) {
        _.each(activity.jobs, function(job) {

          var historyWithSameKey = history[job.buildNumber];
          if(historyWithSameKey !== undefined) {
            job.initials = historyWithSameKey.author? historyWithSameKey.author.initials : undefined;
          }
        });
      }

      return ccTrayReader.readActivity(filterByPipeline).then(function(activity) {
        var pipelineRuns = pipelineReader.readPipelineRuns({ exclude: [ activity.buildNumberInProgress], pipeline: filterByPipeline });

        mapAuthorInitialsFromHistoryToActivity(pipelineRuns, activity);
        return {
          activity: activity,
          history: pipelineRuns
        };


      }).fail(function(e) {
        console.log('Failed reading data', e, e.stack);
      });
    };

    return pipelineReader.refreshData().then(function() {
      var refreshInterval = setInterval(pipelineReader.refreshData, 30000);
      return {
        readData: readData,
        refreshInterval: refreshInterval
      };
    });

  }

};

module.exports = GoCd;
