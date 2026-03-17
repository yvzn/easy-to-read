// https://pm2.keymetrics.io/docs/usage/application-declaration/
// az webapp config set --resource-group <resource-group-name> --name <app-name> --startup-file "pm2 start ecosystem.config.js --no-daemon"
module.exports = {
  apps : [{
    name   : "api-express",
    script : "./dist/server.js"
  }]
}
