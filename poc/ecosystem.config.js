// https://pm2.keymetrics.io/docs/usage/application-declaration/
module.exports = {
  apps : [{
    name   : "api-express",
    script : "./dist/server.js"
  }]
}
