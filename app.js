var app = {
	init: function(){
		// config app environment
		module.paths.push(__dirname + '/app');
		process.env['APP_ROOT_DIR'] = __dirname;
		process.env['NODE_CONFIG_DIR'] = __dirname + '/app/config';
		// config config module
		app.config = require('config');
		var logger = require('logger');
		logger.init(app.config.get('logger'));
		app.logger = logger.getLogger('app', 'debug');
		app.logger.debug('init()');
		app.dhtSensor = require('dhtSensor');
		app.dhtSensor.init({
			logger: logger,
			config: app.config.get('dhtSensor'),
		});
		app.humidifier = require('humidifier');
		app.humidifier.init({
			logger: logger,
			config: app.config.get('humidifier'),
		});
		app.dataSheet = require('dataSheet');
		app.dataSheet.init({
			logger: logger,
			config: app.config.get('dataSheet'),
		})
			.then(function(){
				app.readings.init();
			})
			.catch(function(err){
				app.logger.error(['init()', 'Error initializing dataSheet', err]);
			});
	},
	readings: {
		init: function(){
			app.logger.debug('readings.init()');
			app.readings.update();
			app.readings.timer.stop();
		},
		update: function(){
			app.logger.debug('readings.update() ---------- ---------- ---------- ---------- ----------');
			app.dhtSensor.updateReading()
				.then(function(reading){
					app.logger.silly(['readings.update()', 'dhtSensor.updateReading() success', reading]);
					app.readings.handleReading();
				})
				.catch(function(err){
					app.logger.error(['readings.update()', 'dhtSensor.updateReading() error', err]);
					app.readings._errorReset();
				});
		},
		handleReading: function(){
			app.logger.debug('readings.handleReading()');
			app.dhtSensor.validateHumidityReading()
				.then(function(data){
					app.logger.silly(['readings.handleReading()', 'dhtSensor.validateHumidityReading() success', JSON.stringify(data)]);
					app.humidifier.deactivate()
						.then(function(){
							app.logger.silly(['readings.update()', 'humidifier.deactivate() success']);
							app.readings.logReading();
						}).catch(function(err){
							app.logger.error(['readings.update()', 'humidifier.deactivate() error', err]);
							app.readings._errorReset();
						});
				}).catch(function(data){
					app.logger.silly(['readings.handleReading()', 'dhtSensor.validateHumidityReading() error', JSON.stringify(data)]);
					app.humidifier.activate()
						.then(function(){
							app.logger.silly(['readings.update()', 'humidifier.activate() success']);
							app.readings.logReading();
						}).catch(function(err){
							app.logger.error(['readings.update()', 'humidifier.activate() error', err]);
							app.readings._errorReset();
						});
				});
		},
		logReading: function(){
			app.logger.debug('readings.logReading()');
			app.dataSheet.addRow({
				date: app.readings._getDate(),
				active: app.humidifier.isActive(),
				temperature: app.dhtSensor.getTemperatureReading(),
				humidity: app.dhtSensor.getHumidityReading(),
			})
				.then(function(row){
					app.logger.silly(['readings.logReading()', 'dataSheet.addRow() success', row]);
					app.readings.timer.start();
				})
				.catch(function(err){
					app.logger.error(['readings.logReading()', 'dataSheet.addRow() error', err]);
					app.readings._errorReset();
				});
		},
		timer: {
			_timer: null,
			start: function(){
				app.logger.debug('readings.timer.start()');
				app.readings.timer._timer = setTimeout(app.readings.update, app.config.readingInterval);
			},
			stop: function(){
				app.logger.debug('readings.timer.stop()');
				clearTimeout(app.readings.timer._timer);
			},
			reset: function(){
				app.logger.debug('readings.timer.reset()');
				app.readings.timer.stop();
				app.readings.timer.start();
			}
		},
		_getDate: function(){
			app.logger.debug('_getDate()');
			var date = new Date();
			var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
			var offset = date.getTimezoneOffset() / 60;
			var hours = date.getHours();
			newDate.setHours(hours - offset);
			return newDate.toISOString().slice(0, 16).replace('T', ' ');
		},
		_errorReset: function(){
			app.logger.debug('_errorReset()');
			app.humidifier.deactivate()
				.then(function(){
					app.logger.silly(['_errorReset()', 'humidifier.deactivate() success']);
					// wait so we do not flood the log or api if things get out of hand
					setTimeout(app.readings.timer.reset, app.config.errorResetTimeout);
				}).catch(function(err){
					app.logger.error(['_errorReset()', 'humidifier.deactivate() error', err]);
					setTimeout(app.readings.timer.reset, app.config.errorResetTimeout);
				});
		}
	}
}
app.init();