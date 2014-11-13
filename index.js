var _ = require('lodash');
var moment = require('moment');
var pipelineReader = require('./server/sources/gocd/pipelineFeedReader');
var ccTrayReader = require('./server/sources/cc/ccTrayReader');

var gocdMapper = function() {

  var readData = function() {
    return ccTrayReader.readActivity().then(function(activity) {
      return pipelineReader.readPipelineRuns({ exclude: [ activity.buildNumberInProgress] }).then(function(pipelineRuns) {
        return {
          activity: activity,
          history: pipelineRuns
        };
      }).fail(function(e) {
        console.log('Failed reading history from go cd', e);
      });

    }).fail(function(e) {
      console.log('Failed reading activity from cc tray', e);
    });
  };

  return {
    readData: readData
  }
};

exports.readData = gocdMapper().readData;
exports.readActivity = ccTrayReader.readActivity;