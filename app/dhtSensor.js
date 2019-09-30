var sensorLib = require('node-dht-sensor');

var dhtSensor = {
	_logger: null,
	_fakeReading: null,
	_sensorType: null,
	_gpioPin: null,
	_minHumidityLevel: null,
	reading: null,
	init: function(args){
		dhtSensor._logger = args.logger.getLogger('dhtSensor', 'silly');
		dhtSensor._logger.debug(['init()', JSON.stringify(args.config)]);
		dhtSensor._fakeReading = args.config.fakeReading;
		dhtSensor._sensorType = args.config.sensorType;
		dhtSensor._gpioPin = args.config.gpioPin;
		dhtSensor._minHumidityLevel = args.config.minHumidityLevel;
		if(dhtSensor._fakeReading)
			dhtSensor._logger.warn('FAKE READING ENABLED, FAKE READINGS RANDOMIZED');
	},
	updateReading: function(){
		dhtSensor._logger.debug('updateReading()');
		return new Promise((resolve, reject) => {
			// switch method used to capture sensor reading
			var updateReadingMethod = dhtSensor._fakeReading ? dhtSensor._fakeSensorRead : sensorLib.read;
			// read sensor
			updateReadingMethod(dhtSensor._sensorType, dhtSensor._gpioPin, function(err, tempC, humidity){
				dhtSensor._logger.silly(['updateReading()', 'callback params', JSON.stringify({err, tempC, humidity})]);
				if(err){
					dhtSensor._logger.error(['updateReading()', 'updateReadingMethod() returned error', err]);
					reject(err);
				}else{
					// set sensor reading
					dhtSensor.reading = {
						temperature: dhtSensor._convertTempToF(tempC).toFixed(1),
						humidity: humidity.toFixed(1)
					};
					dhtSensor._logger.info(['updateReading()', 'updateReadingMethod() success', JSON.stringify(dhtSensor.reading)]);
					resolve(dhtSensor.reading);
				}
			});
		})
	},
	getTemperatureReading: function(){
		dhtSensor._logger.debug(['getTemperatureReading()', dhtSensor.reading.temperature]);
		return dhtSensor.reading.temperature;
	},
	getHumidityReading: function(){
		dhtSensor._logger.debug(['getHumidityReading()', dhtSensor.reading.humidity]);
		return dhtSensor.reading.humidity;
	},
	validateHumidityReading: function(){
		dhtSensor._logger.debug(['validateHumidityReading()', JSON.stringify(dhtSensor.getHumidityReading())]);
		return new Promise((resolve, reject) => {
			// if(dhtSensor.getHumidityReading() < parseFloat(dhtSensor._minHumidityLevel))
			if(dhtSensor.getHumidityReading() < dhtSensor._minHumidityLevel)
				reject('validateHumidityReading()|Invalid|Too Low|' + dhtSensor.getHumidityReading());
			else
				resolve('validateHumidityReading()|Valid|' + dhtSensor.getHumidityReading());
		});
	},
	_convertTempToF: function(c){
		dhtSensor._logger.debug(['_convertTempToF()', c]);
		return c * 9/5 + 32;
	},
	_fakeSensorRead: function(sensorType, gpioPin, callback){
		dhtSensor._logger.debug(['_fakeSensorRead()', sensorType, gpioPin]);
		callback(
			// new Error('Could not read dht sensor'), // err
			null, // err
			dhtSensor._randomIntFromInterval(10, 40),
			dhtSensor._randomIntFromInterval(10, 70)
		);
	},
	_randomIntFromInterval: function(min, max){
		dhtSensor._logger.debug(['_randomIntFromInterval()', min, max]);
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
}
module.exports = dhtSensor;