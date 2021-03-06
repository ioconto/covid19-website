require('dotenv').config();
const fs = require('fs');
const process = require('process');
const _ = require('lodash');

const pathProcesses = './src/processing';

module.exports = function(logger) {

  const database     = require('./database')(logger);
  let connection; 

  /********************************************************************************************
   * Process data based on a list of jobs it should accomplish
   */
  async function init() {
    try {
      connection = await database.init();
      const processesPathname = `${pathProcesses}/processes.json`;
      if (fs.existsSync(processesPathname)) {
        let processes = JSON.parse(fs.readFileSync(processesPathname, 'utf8'));
        processes = _.orderBy(processes, ['job', 'priority'], ['desc', 'asc']);
        for (let i=0; i<processes.length; i++){
          switch (processes[i].type) {
            case 'sql':
              await database.execute(processes[i]);
              break;
          }
        }
        database.stop();
      } else {
        logger.error(`Unable to find local processes.json file at: ${pathProcesses}`);
      }
    } catch (e) {
      throw e;
    }
  }

  function getSql(data) {
    let ret;
    const d = data.data;
    switch(data.entity) {
      case 'it-municipalities-daily-deaths':
        let name = connection.escape(d.NOME_COMUNE);
        let region = connection.escape(d.NOME_REGIONE);
        let province = connection.escape(d.NOME_REGIONE);
        ret = 'INSERT INTO `it-municipalities-daily-deaths` (`regId`, `provId`, `region`, `province`, `name`, `istatId`, `ageClass`, `dayS`, `day`, `month`, `m15`, `m16`, `m17`, `m18`, `m19`, `m20`, `f15`, `f16`, `f17`, `f18`, `f19`, `f20`, `t15`, `t16`, `t17`, `t18`, `t19`, `t20`) VALUES ';
        ret += `(${parseInt(d.REG)}, ${parseInt(d.PROV)}, ${region}, ${province}, ${name}, ${parseInt(d.COD_PROVCOM)}, ${parseInt(d.CL_ETA)}, '${d.GE}', ${parseInt(d.GE.substr(2,2))}, ${parseInt(d.GE.substr(0,2))}, 
        ${parseInt(d.MASCHI_15)}, ${parseInt(d.MASCHI_16)}, ${parseInt(d.MASCHI_17)}, ${parseInt(d.MASCHI_18)}, ${parseInt(d.MASCHI_19)}, ${parseInt(d.MASCHI_20)},
        ${parseInt(d.FEMMINE_15)}, ${parseInt(d.FEMMINE_16)}, ${parseInt(d.FEMMINE_17)}, ${parseInt(d.FEMMINE_18)}, ${parseInt(d.FEMMINE_19)}, ${parseInt(d.FEMMINE_20)},
        ${parseInt(d.TOTALE_15)}, ${parseInt(d.TOTALE_16)}, ${parseInt(d.TOTALE_17)}, ${parseInt(d.TOTALE_18)}, ${parseInt(d.TOTALE_19)}, ${parseInt(d.TOTALE_20)});`;
        break;
    }
    return ret;
  }
  
  function write(data) {
    return new Promise((resolve, reject) => {
      connection.query(getSql(data), function (error, results, fields) {
        if (error)  {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  function stop() {
    connection.end();
    logger.info('Writer stopped');
  }

  return  {
    init,
    write,
    stop
  };
};

