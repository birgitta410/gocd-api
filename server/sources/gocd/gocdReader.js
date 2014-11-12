
var gocdMapper = function(_, moment, pipelineReader, ccTrayReader) {

  var readData = function() {
    return ccTrayReader.readActivity().then(function(activity) {

      return pipelineReader.readPipelineRuns({ exclude: [ activity.buildNumberInProgress] }).then(function(pipelineRuns) {
        return {
          activity: activity,
          history: pipelineRuns
        };
      });

    });
  };

  return {
    readData: readData
  }
};

define(['lodash', 'moment', 'server/sources/gocd/pipelineFeedReader', 'server/sources/cc/ccTrayReader'], gocdMapper);