gocd-api
=======

Module to access data from your Go CD server, e.g. to feed it into a build monitor.

Will give you access to both current activity (which stage is currently building, what is the state of the latest pipeline run) and history data about past pipeline runs.

###SETUP PROJECT
```
npm install
```

Run tests (will also print sample JSON output to show you format of results)
```
npm test
```

##Configure for your own data sources
Create file `config.yml` in the root of the project.

###Access to Go CD and CC tray
Currently takes variables for requests to CI servers that provide a cctray.xml file, and Go CD servers.

```
default:
  gocd:
    url: http://the-go-host:8153
    pipeline: <name of the pipeline you want to visualise>
    user: xxx
    password: xxxx
  cc:
    url: http://the-ci-host/<location of cctray.xml/cctray.xml
    user: xxx
    password: xxxx
```

If you just want to see what it looks like, setting 'sample' to true will load some static fixtures to give you an idea:
```
default:
  gocd:
    sample: true
  cc:
    sample: true
```

###Filter the jobs to show from CC Tray activity
By default, all jobs from CC Tray's activity feed will be displayed. You can restrict that by providing a list of jobs. The application will use the strings in that list to check if a job name STARTS WITH that.
```
default:
  cc:
    sample: true
    jobs:
      - 'A-PIPELINE :: build'
      - 'A-PIPELINE :: integration-test'
      - 'A-PIPELINE :: deploy-dev'
```

###Heroku
Also supports Heroku config vars instead of the config files. Convention is CAPITALIZEDNAMEOFCONFIGCATEGORY_CAPITALIZEDVARIABLENAME.

For example:
```
heroku config:set GOCD_PIPELINE=mypipeline
heroku config:set GOCD_USER=admin
heroku config:set GOCD_PASSWORD=somepassword
```
