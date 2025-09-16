import winston from "winston";

const logger = winston.createLogger({
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) =>
            `[${timestamp}] ${level}: ${message}`
        )
    ),
    transports: [new winston.transports.Console()],
});

export default logger;
