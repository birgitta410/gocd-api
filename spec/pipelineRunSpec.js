var context = createContext({});

context(['moment', 'server/sources/gocd/pipelineRun', 'server/sources/gocd/gocdRequestor', 'q'], function (moment, pipelineRunCreator, gocdRequestor, Q) {

  beforeEach(function() {
    gocdRequestor.getJobRunDetails = gocdRequestor.getSampleJobRunDetails;
  });

  describe('historyEntryCreator', function () {
    it('should create initials of person with special characters in name', function (done) {
      var pipelineRun = pipelineRunCreator.createNew({author: {
        name: 'Special Cäracter'
      }});
      Q.all(pipelineRun.promiseInitialise()).then(function () {
        expect(pipelineRun.stages[0].author.initials).toBe('scx');
        done();
      });

    });
    it('should create initials of person with three names', function (done) {
      var pipelineRun = pipelineRunCreator.createNew({author: {
        name: 'Has Three Names'
      }});
      Q.all(pipelineRun.promiseInitialise()).then(function () {
        expect(pipelineRun.stages[0].author.initials).toBe('htn');
        done();
      });

    });
    it('should create initials of person with two names', function (done) {
      var pipelineRun = pipelineRunCreator.createNew({author: {
        name: 'Max Mustermann'
      }});
      Q.all(pipelineRun.promiseInitialise()).then(function () {
        expect(pipelineRun.stages[0].author.initials).toBe('mmu');
        done();
      });
    });

    it('should add jobDetails', function (done) {
      var pipelineRun = pipelineRunCreator.createNew({
        author: { name: 'bla' },
        stageName: 'functional-test'
      });
      Q.all(pipelineRun.promiseInitialise()).then(function () {
        expect(pipelineRun.stages[0].jobDetails.length).toBe(1);
        expect(pipelineRun.stages[0].jobDetails[0].name).toBe('both');
        expect(pipelineRun.stages[0].jobDetails[0].state).toBe('Completed');
        expect(pipelineRun.stages[0].jobDetails[0].properties).toBeDefined();
        done();
      });
    });

  });

  describe('addStage()', function() {
    it('should add a new stage and recalculate results', function () {

      var firstStage = {
        updated: '2014-07-18T16:08:39+00:00',
        pipeline: 'A-PIPELINE',
        buildNumber: '1199',
        result: 'passed',
        author: {
          name: 'Max Mustermann',
          email: '<mmustermann@internet.se>',
          initials: 'mmu'
        }
      };
      var secondStage = {
        updated: '2014-07-18T17:08:39+00:00',
        pipeline: 'A-PIPELINE',
        buildNumber: '1199',
        result: 'failed',
        author: {
          name: 'Max Mustermann',
          email: '<mmustermann@internet.se>',
          initials: 'mmu'
        }
      };

      var pipelineRun = pipelineRunCreator.createNew(firstStage);
      pipelineRun.promiseInitialise();

      expect(pipelineRun.wasSuccessful()).toBe(true);
      var expectedTime = moment('2014-07-18T16:08:39+00:00');
      var actualTime = moment(pipelineRun.time);
      expect(actualTime.hours()).toBe(expectedTime.hours());

      pipelineRun.addStage(secondStage);
      expect(pipelineRun.wasSuccessful()).toBe(false);

      expectedTime = moment('2014-07-18T17:08:39+00:00');
      actualTime = moment(pipelineRun.time);
      expect(actualTime.hours()).toBe(expectedTime.hours());

    });
  });

});