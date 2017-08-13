var utils = require('../../lib/utils');

describe('utils', function () {

  describe('parseParametersFromJobRunUrl', function () {

    var id = 'http://the-go-host:8153/go/pipelines/A-PIPELINE/1199/functional-test/1';

    it('should set the build number', function () {
      var entry = utils.parseParametersFromJobRunUrl(id);

      expect(entry.buildNumber).toBe('1199');
    });

  });

});
