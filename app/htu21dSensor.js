var sensorLib = require('@agilatech/htu21d');

var htu21dSensor = {
	_logger: null,
	_fakeReading: null,
	_bus: null,
	_address: null,
	_minHumidityLevel: null,
	_sensor: null, // the sensor object
	reading: null,
	init: function(args){
		htu21dSensor._logger = args.logger.getLogger('htu21dSensor', 'silly');
		htu21dSensor._logger.debug(['init()', JSON.stringify(args.config)]);
		htu21dSensor._fakeReading = args.config.fakeReading;
		htu21dSensor._bus = args.config.bus;
		htu21dSensor._address = args.config.address;
		htu21dSensor._minHumidityLevel = args.config.minHumidityLevel;
		if(htu21dSensor._fakeReading)
			htu21dSensor._logger.warn('FAKE READING ENABLED, FAKE READINGS RANDOMIZED');
		return new Promise((resolve, reject) => {
			htu21dSensor._sensor = new sensorLib.Htu21d(htu21dSensor._bus, htu21dSensor._address);
/* console.log({
	sensor:				htu21dSensor._sensor,
	sensorType:			typeof htu21dSensor._sensor,
	deviceName:			htu21dSensor._sensor.deviceName(),
	deviceVersion:		htu21dSensor._sensor.deviceVersion(),
	deviceActive:		htu21dSensor._sensor.deviceActive(),
	deviceNumValues:	htu21dSensor._sensor.deviceNumValues(),
}); */
			if(htu21dSensor._sensor.deviceActive())
				resolve();
			else
				reject('htu21dSensor not active');
		});
	},
	updateReading: function(){
		htu21dSensor._logger.debug('updateReading()');
		return new Promise((resolve, reject) => {
			if(!htu21dSensor._sensor.deviceActive())
				reject('htu21dSensor not active');
			// switch method used to capture sensor reading
			var updateReadingMethod = htu21dSensor._fakeReading ? htu21dSensor._fakeSensorRead : htu21dSensor._sensorRead;
			// read sensor
			updateReadingMethod(function(err, tempC, humidity){
				htu21dSensor._logger.silly(['updateReading()', 'callback params', JSON.stringify({err, tempC, humidity})]);
				if(err){
					htu21dSensor._logger.error(['updateReading()', 'updateReadingMethod() returned error', err]);
					reject(err);
				}else{
					// set sensor reading
					htu21dSensor.reading = {
						temperature: htu21dSensor._convertTempToF(tempC).toFixed(1),
						humidity: humidity.toFixed(1)
					};
					htu21dSensor._logger.info(['updateReading()', 'updateReadingMethod() success', JSON.stringify(htu21dSensor.reading)]);
					resolve(htu21dSensor.reading);
				}
			});
		})
	},
	getTemperatureReading: function(){
		htu21dSensor._logger.debug(['getTemperatureReading()', htu21dSensor.reading.temperature]);
		return htu21dSensor.reading.temperature;
	},
	getHumidityReading: function(){
		htu21dSensor._logger.debug(['getHumidityReading()', htu21dSensor.reading.humidity]);
		return htu21dSensor.reading.humidity;
	},
	validateHumidityReading: function(){
		htu21dSensor._logger.debug(['validateHumidityReading()', JSON.stringify(htu21dSensor.getHumidityReading())]);
		return new Promise((resolve, reject) => {
			// if(htu21dSensor.getHumidityReading() < parseFloat(htu21dSensor._minHumidityLevel))
			if(htu21dSensor.getHumidityReading() < htu21dSensor._minHumidityLevel)
				reject('validateHumidityReading()|Invalid|Too Low|' + htu21dSensor.getHumidityReading());
			else
				resolve('validateHumidityReading()|Valid|' + htu21dSensor.getHumidityReading());
		});
	},
	_convertTempToF: function(c){
		htu21dSensor._logger.debug(['_convertTempToF()', c]);
		return c * 9/5 + 32;
	},
	_sensorRead: function(callback){
		htu21dSensor._logger.debug(['_sensorRead()']);
		htu21dSensor._sensor.valueAtIndex(0, function(err, humidity){
			if(err){
				throw new Error('Humidity read error: ' + err);
			}else{
				htu21dSensor._sensor.valueAtIndex(1, function(err, tempC){
					if(err){
						throw new Error('Temperature read error: ' + err);
					}else{
						callback(
							// new Error('Could not read htu21d sensor'), // err
							null, // err
							parseInt(tempC),
							parseInt(humidity)
						);
					}
				});
			}
		});
	},
	_fakeSensorRead: function(callback){
		htu21dSensor._logger.debug(['_fakeSensorRead()']);
		callback(
			// new Error('Could not read htu21d sensor'), // err
			null, // err
			htu21dSensor._randomIntFromInterval(10, 40),
			htu21dSensor._randomIntFromInterval(10, 70)
		);
	},
	_randomIntFromInterval: function(min, max){
		htu21dSensor._logger.debug(['_randomIntFromInterval()', min, max]);
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
}
module.exports = htu21dSensor;