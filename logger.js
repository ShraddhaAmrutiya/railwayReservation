const winston = require('winston');

const logLevels = {
    levels: {
      error: 0,
      warn: 1,
      info: 2
    }
  };
  

const logger = winston.createLogger({
    levels: logLevels.levels,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
  transports: [new winston.transports.Console()],
});



module.exports = logger;
