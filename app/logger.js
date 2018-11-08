const winston = require('winston');
// error: 0
// warn: 1
// info: 2
// verbose: 3
// debug: 4
// silly: 5
var logger = {
	_config: null,
	init: function(config){
		this._config = config;
		// console.log("\nlogger.init() --------------------------------------------------\n");
	},
	_getFileLogLocation: function(){
		return process.env['APP_ROOT_DIR'] + this._config.file;
	},
	getLogger: function(context, level){
		if(this._config.allowModuleOverride){
			var fileLoggingLevel = typeof level !== 'undefined' ? level : this._config.fileLoggingLevel;
			var consoleLoggingLevel = typeof level !== 'undefined' ? level : this._config.consoleLoggingLevel;
		}else{
			var fileLoggingLevel = this._config.fileLoggingLevel;
			var consoleLoggingLevel = this._config.consoleLoggingLevel;
		}
		var logger  = winston.createLogger({
			level: consoleLoggingLevel,
		});
		if(this._config.consoleLogging){
			logger.add(new winston.transports.Console({
				level: consoleLoggingLevel,
				format: winston.format.combine(
					winston.format.label({
						label: context,
						message: true,
					}),
					winston.format.colorize({
						colors: {
							// override default colors
							info: 'cyan',
							debug: 'magenta',
							silly: 'gray',
						}
					}),
					winston.format.simple(),
					winston.format.padLevels(),
				)
			}));
		}
		if(this._config.fileLogging){
			logger.add(new winston.transports.File({
				level: fileLoggingLevel,
				filename: this._getFileLogLocation(),
				format: winston.format.combine(
					winston.format.timestamp(),
					winston.format.label({
						label: context,
						message: false,
					}),
					winston.format.json(),
				),
			}));
		}
		return logger;
	}
}
module.exports = logger;