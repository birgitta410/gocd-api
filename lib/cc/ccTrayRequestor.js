var Q = require('q');
var request = require('request');
var xml2json = require('xml2json');
var fs = require('fs');
var path = require('path');
var globalOptions = require('../options');

function ccTrayRequestorModule() {

  function ccTrayUrl() {
    return globalOptions.get().url + '/go/cctray.xml';
  }

  var get = function() {

    console.log('Requesting', globalOptions.get().url + '/go/cctray.xml');

    if (globalOptions.sampleIt()) {
      return getSample();
    } else {
      var defer = Q.defer();

      request(ccTrayUrl(), function (error, response, body) {
        if(error) {
          console.log('failed to get cctray.xml', ccTrayUrl(), globalOptions.get(), error);
          defer.reject();
        } else {
          var json = xml2json.toJson(body, {
            object: true, sanitize: false
          });
          defer.resolve(json);
        }
      });

      return defer.promise;
    }
  };

  function getSample() {
    var defer = Q.defer();

    var xml = fs.readFileSync(path.resolve(__dirname + '/sample/', 'cctray.xml'));
    var json = xml2json.toJson(xml, {
      object: true, sanitize: false
    });

    defer.resolve(json);

    return defer.promise;
  }

  return {
    get: get,
    getSample: getSample
  }
};

var ccTrayRequestor = ccTrayRequestorModule();
exports.get = ccTrayRequestor.get;
exports.getSample = ccTrayRequestor.getSample;
