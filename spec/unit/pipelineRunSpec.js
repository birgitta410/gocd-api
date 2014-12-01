var moment = require('moment');
var Q = require('q');
var mockery = require('mockery');
var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');

describe('pipelineRun', function () {

  var pipelineRunCreator;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    var globalOptions = {
      getGocdRequestor: function() {
        return gocdSampleRequestor;
      }
    };

    mockery.registerMock('../options', globalOptions);
    pipelineRunCreator = require('../../lib/gocd/pipelineRun');

  });

  describe('createNew()', function () {
    it('should add job details', function (done) {
      var pipelineRun = pipelineRunCreator.pipelineRun.createNew({
        author: { name: 'bla' },
        name: 'functional-test',
        detailsLink: 'somePlaceholderToTriggerSampleRequestor'
      });
      Q.all(pipelineRun.promiseInitialise()).then(function () {
        expect(pipelineRun.stages[0].jobs.length).toBe(1);
        expect(pipelineRun.stages[0].jobs[0].name).toBe('both');
        expect(pipelineRun.stages[0].jobs[0].state).toBe('Completed');
        expect(pipelineRun.stages[0].jobs[0].properties).toBeDefined();
        done();
      });
    });

  });

  describe('addStage()', function() {
    it('should add a new stage and recalculate results', function (done) {

      var firstStage = {
        updated: '2014-07-18T16:08:39+00:00',
        pipeline: 'A-PIPELINE',
        buildNumber: '1199',
        counter: '1',
        result: 'Passed'
      };
      var secondStage = {
        updated: '2014-07-18T17:08:39+00:00',
        pipeline: 'A-PIPELINE',
        buildNumber: '1199',
        counter: '1',
        result: 'Failed'
      };

      var pipelineRun = pipelineRunCreator.pipelineRun.createNew(firstStage);
      pipelineRun.promiseInitialise().then(function() {
        expect(pipelineRun.wasSuccessful()).toBe(true);
        var expectedTime = moment('2014-07-18T16:08:39+00:00');
        var actualTime = moment(pipelineRun.updated);
        expect(actualTime.hours()).toBe(expectedTime.hours());

        pipelineRun.addStage(secondStage).then(function() {
          expect(pipelineRun.wasSuccessful()).toBe(false);

          expectedTime = moment('2014-07-18T17:08:39+00:00');
          actualTime = moment(pipelineRun.updated);
          expect(actualTime.hours()).toBe(expectedTime.hours());
          done();
        });
      });

    });
  });

});