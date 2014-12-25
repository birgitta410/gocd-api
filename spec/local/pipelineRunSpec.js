var moment = require('moment');
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

  function someRun() {
    return {
      "label": "2066",
      "name": "A-PIPELINE",
      "stages": [{
        "result": "Passed",
        "jobs": [{
          "state": "Completed",
          "result": "Passed",
          "name": "both",
          "id": 14269,
          "scheduled_date": 1419000542498
        }],
        "name": "build",
        "id": 10724,
        "counter": "1"
      }, {
        "result": "Passed",
        "jobs": [{
          "state": "Completed",
          "result": "Passed",
          "name": "backend-integration",
          "id": 14270,
          "scheduled_date": 1419000699510
        }],
        "name": "integration-test",
        "id": 10725,
        "counter": "1"
      }, {
        "result": "Passed",
        "jobs": [{
          "state": "Completed",
          "result": "Passed",
          "name": "backend",
          "id": 14271,
          "scheduled_date": 1419000752944
        }, {"state": "Completed", "result": "Passed", "name": "client", "id": 14272, "scheduled_date": 1419000752944}],
        "name": "deploy-dev",
        "id": 10726,
        "counter": "1"
      }, {
        "result": "Passed",
        "jobs": [{
          "state": "Completed",
          "result": "Passed",
          "name": "backend",
          "id": 14273,
          "scheduled_date": 1419000816207
        }],
        "name": "smoke-test-dev",
        "id": 10727,
        "counter": "1"
      }, {
        "result": "Failed",
        "jobs": [{
          "state": "Completed",
          "result": "Failed",
          "name": "both",
          "id": 14274,
          "scheduled_date": 1419000842499
        }],
        "name": "functional-test",
        "id": 10728,
        "counter": "1"
      }, {
        "jobs": [],
        "name": "deploy-showcase",
        "id": 0,
        "counter": "1"
      }, {
        "jobs": [],
        "name": "smoke-test-showcase",
        "id": 0,
        "counter": "1"
      }],
      "id": 2203,
      "build_cause": {
        "trigger_message": "modified by Edward Norton <enorton@theinternet.com>",
        "approver": "",
        "material_revisions": [{
          "material": {
            "fingerprint": "064cedec3f875a6581427d79460aceae8b79260c89a02217a4dd2a7eee6b6e98",
            "description": "URL: git@github.com:A-PIPELINE/repo.git, Branch: master",
            "id": 1,
            "type": "Git"
          },
          "modifications": [{
            "modified_time": 1419000323000,
            "user_name": "Edward Norton <enorton@theinternet.com>",
            "id": 5554,
            "revision": "cb855ca1516888541722d8c0ed8973792f30ee57",
            "email_address": null,
            "comment": "Some comment"
          }],
          "changed": true
        }, {
          "material": {
            "fingerprint": "61759c38d485832fa3c5a4fddfa99acb7615c1fe00a93dfdead36bb3a0b07b68",
            "description": "URL: git@github.com:A-PIPELINE/repo-2.git, Branch: master",
            "id": 37,
            "type": "Git"
          },
          "modifications": [{
            "modified_time": 1418894233000,
            "user_name": "Edward Norton <enorton@theinternet.com>",
            "id": 5542,
            "revision": "41b4b36cad8684b88ba1866d660bc675dc50e7ed",
            "email_address": null,
            "comment": "Some comment"
          }],
          "changed": false
        }],
        "trigger_forced": false
      },
      "counter": 2066
    };
  }

  describe('createNew()', function () {
    it('should add job details', function () {
      var pipelineRun = pipelineRunCreator.pipelineRun.createNew(someRun());

      expect(pipelineRun.stages[0].jobs.length).toBe(1);
      expect(pipelineRun.stages[0].jobs[0].name).toBe('both');
      expect(pipelineRun.stages[0].jobs[0].state).toBe('Completed');

    });

  });

  describe('update()', function() {
    it('should update everything if data changed', function () {

      var justOneStage = someRun();
      justOneStage.stages = [ justOneStage.stages[0] ];
      var pipelineRun = pipelineRunCreator.pipelineRun.createNew(justOneStage);

      expect(pipelineRun.wasSuccessful()).toBe(true);
      expect(pipelineRun['last_scheduled']).toBeDefined();
      var expectedTime = moment(1419000542498);
      var actualTime = moment(pipelineRun['last_scheduled']);
      expect(actualTime.hours()).toBe(expectedTime.hours());


      pipelineRun.update(someRun());
      expect(pipelineRun.wasSuccessful()).toBe(false);

      expectedTime = moment(1419000842499);
      actualTime = moment(pipelineRun['last_scheduled']);
      expect(actualTime.hours()).toBe(expectedTime.hours());


    });
  });

});