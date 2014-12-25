var Q = require('q');
var request = require('request');
var xml2json = require('xml2json');
var globalOptions = require('../options');

function ccTrayRequestorModule() {

  function ccTrayUrl() {
    var url = globalOptions.get().url + '/go/cctray.xml';
    if(url.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return url;
  }

  var get = function() {

    console.log('Requesting', globalOptions.get().url + '/go/cctray.xml');

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

  };

  return {
    get: get
  }
};

var ccTrayRequestor = ccTrayRequestorModule();
exports.get = ccTrayRequestor.get;
