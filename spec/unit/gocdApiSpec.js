
var mockery = require('mockery');
var fs = require('fs');
var path = require('path');
var ccTraySampleRequestor = require('../../lib/cc/ccTraySampleRequestor');
var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');

describe('gocd-api', function () {

  var gocdApi;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    var globalOptions = {
      getGocdRequestor: function() {
        return gocdSampleRequestor;
      },
      getCcTrayRequestor: function() {
        return ccTraySampleRequestor;
      }
    };

    mockery.registerMock('../options', globalOptions);

    gocdApi = require('../../index');

  });


  it('should put it all together with the sample data', function (done) {
    gocdApi.getInstance().readData().then(function (data) {
      expect(data.activity).toBeDefined();
      expect(data.history).toBeDefined();
      done();
    });
  });

});