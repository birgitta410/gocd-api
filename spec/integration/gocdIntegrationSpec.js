
var _ = require('lodash');

describe('Integration with real Go CD server', function () {

  var gocdApi, options;

  beforeEach(function() {

    gocdApi = require('../../index');
    options = {
      url: process.env.GOCD_URL,
      pipeline: process.env.GOCD_PIPELINE || 'artwise',
      user: process.env.GOCD_USER,
      password: process.env.GOCD_PASSWORD,
      debug: process.env.GOCD_DEBUG || false,
      type: process.env.GOCD_TYPE,
      key: process.env.GOCD_KEY
    };

    // Set long timeout to allow collecting all data, even with slow responses
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

  });

  function getFirstPipelineRun(result) {
    var buildNumbers = _.keys(result.pipelineRuns);
    return result.pipelineRuns[buildNumbers[0]];
  }

  it('should read a set of pipeline runs (history) and jobs (activity)', function (done) {
    gocdApi.getInstance(options, options.type).then(function(instance) {
      expect(instance.pipelineNames.length).toBeGreaterThan(0);
      instance.readData(options.pipeline).then(function (data) {

        // HISTORY
        var history = data.history;

        expect(_.keys(history.pipelineRuns).length).toBeGreaterThan(0);
        expect(history.statistics.timeSinceLastSuccess).toBeDefined();

        // var firstResult = getFirstPipelineRun(history);
        _.each(_.values(history.pipelineRuns), (firstResult) => {
          console.log("Checking values for " + firstResult.label);
          expect(firstResult.stages.length).toBeGreaterThan(0);

          var summary = firstResult.summary;
          expect(summary.lastScheduled).toBeDefined();
          expect(_.includes(['passed', 'failed'], summary.result)).toBe(true);
          if(summary.changeInfo.forced === true) {
            console.log('   ' + firstResult.label + ' was manually triggered');
            expect(summary.author).toBeUndefined();
            expect(summary.changeInfo.committer).toBeUndefined();
            expect(summary.changeInfo.revision).toBeUndefined();
            expect(summary.changeInfo.numberOfFilesAdded).toBe(0);
            expect(summary.changeInfo.numberOfFilesModified).toBe(0);
            expect(summary.changeInfo.numberOfFilesDeleted).toBe(0);
          } else {
            console.log('   ' + firstResult.label + ' was triggered by a material change');
            expect(summary.author).toBeDefined();
            expect(summary.author.name).toBeDefined();
            expect(summary.author.initials).toBeDefined();
            expect(summary.changeInfo.committer).toBeDefined();
            expect(summary.changeInfo.revision).toBeDefined();
            var numFilesChanged =
              summary.changeInfo.numberOfFilesAdded + summary.changeInfo.numberOfFilesModified + summary.changeInfo.numberOfFilesDeleted;
            expect(numFilesChanged).toBeGreaterThan(0);
          }
          expect(summary.changeInfo.comment).toBeDefined();
          expect(summary.text).toBeDefined();
          expect(firstResult['build_cause'].files).toBeDefined();

        });

        // ACTIVITY
        expect(_.keys(data.activity.stages).length).toBeGreaterThan(0);

        clearInterval(instance.refreshInterval);
        done();
      }).done();
    }).done();

  });


});
