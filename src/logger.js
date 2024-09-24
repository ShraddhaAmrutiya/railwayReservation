const winston = require('winston');
require('dotenv').config();

const logLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        
    }
};

const logger = winston.createLogger({
    levels: logLevels.levels,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
});

if (process.env.LOG_TO_FILE === 'true') {
    const fs = require('fs');
    const path = require('path');
    
    const logsDir = path.join(__dirname, 'logs');

    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'app.log'),
        level: 'info',
        handleExceptions: true, 
    }));
} else {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(), 
            winston.format.simple() 
        )
    }));
}

module.exports = logger;
