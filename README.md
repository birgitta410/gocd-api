gocd-api
=======

###SETUP PROJECT
```
npm install
```

Run tests
```
sh ./run_spec.sh
```

##Configure for your own data sources
Create file `config.yml` in the root of the project and configure as described below.

Also supports deployment to Heroku - for each value in the config file, you can create a respective Heroku variable so you won't have to push config.yml to the git repository.

Also supports Heroku config vars instead of the config files. Convention is CAPITALIZEDNAMEOFCONFIGCATEGORY_CAPITALIZEDVARIABLENAME.

For example:
```
heroku config:set GOCD_PIPELINE=mypipeline
heroku config:set GOCD_USER=admin
heroku config:set GOCD_PASSWORD=somepassword
```

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
