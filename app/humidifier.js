var pigpio = require('pigpio');

var humidifier = {
	_gpioPin: null,
	_relay: null,
	_socketPort: null,
	_active: null,
	init: function(args){
		humidifier._logger = args.logger.getLogger('humidifier', 'debug');
		humidifier._logger.debug('init()', JSON.stringify(args.config));
		humidifier._gpioPin = args.config.gpioPin;
		humidifier._relayInit();
		humidifier._shutdownInit();
		humidifier.deactivate()
			.then(function(){
				humidifier._logger.silly(['init()', 'humidifier.deactivate() success']);
			})
			.catch(function(err){
				humidifier._logger.error(['init()', 'humidifier.deactivate() error', err]);
			});
	},
	activate: function(){
		humidifier._logger.debug('activate()');
		return new Promise((resolve, reject) => {
			humidifier._logger.silly('Activated humidifier');
			// reject('activate test err');
			humidifier._relay.digitalWrite(false);
			humidifier._active = true;
			resolve();
		})
	},
	deactivate: function(){
		humidifier._logger.debug('deactivate()');
		return new Promise((resolve, reject) => {
			humidifier._logger.silly('Deactivated humidifier');
			// reject('deactivate test err');
			humidifier._relay.digitalWrite(true);
			humidifier._active = false;
			resolve();
		})
	},
	isActive: function(){
		humidifier._logger.debug('isActive()');
		return humidifier._active === null ? false : humidifier._active;
	},
	_relayInit: function(){
		humidifier._logger.debug('_relayInit()');
		// Configures pigpio to use the specified socket port.
		// The default setting is to use port 8888.
		pigpio.configureSocketPort(humidifier._getRandomSocketPort());
		humidifier._relay = new pigpio.Gpio(
			humidifier._gpioPin,
			{
				mode: pigpio.Gpio.OUTPUT,
			}
		);
	},
	_getRandomSocketPort: function(){
		humidifier._logger.debug('_getRandomSocketPort()');
		// port - an unsigned integer specifying the pigpio socket port number.
		// twg - I randomized this so if I have to restart the app, it will use another port
		// there was an issue that the port would not be release if the app quit and I was too lazy to fix it
		var min = 1000;
		var max = 9999;
		return Math.floor(Math.random() * (max - min + 1) + min);
	},
	_shutdownInit: function(){
		humidifier._logger.debug('_shutdownInit()');
		// https://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
		// so the program will not close instantly
		process.stdin.resume();
		// do something when app is closing
		process.on('exit', humidifier._shutdownCB.bind(null, {cleanup:true}));
		// catches ctrl+c event
		process.on('SIGINT', humidifier._shutdownCB.bind(null, {exit:true}));
		// catches "kill pid" (for example: nodemon restart)
		process.on('SIGUSR1', humidifier._shutdownCB.bind(null, {exit:true}));
		process.on('SIGUSR2', humidifier._shutdownCB.bind(null, {exit:true}));
		// catches uncaught exceptions
		process.on('uncaughtException', humidifier._shutdownCB.bind(null, {exit:true}));
	},
	_shutdownCB: function(options, err){
		humidifier._logger.debug(['_shutdownCB()', JSON.stringify(options), err]);
		if(err)
			humidifier._logger.warn(['_shutdownCB()', '_shutdownCB() was passed an error', JSON.stringify(err)]);
		if(options.cleanup)
			humidifier._logger.info(['_shutdownCB()', 'cleanup', JSON.stringify(options.cleanup)]);
		humidifier.deactivate()
			.then(function(){
				humidifier._logger.silly(['_shutdownCB()', 'humidifier.deactivate() success']);
				if(options.exit)
					process.exit();
			})
			.catch(function(err){
				humidifier._logger.error(['_shutdownCB()', 'humidifier.deactivate() error', err]);
				if(options.exit)
					process.exit();
			});
	},
}
module.exports = humidifier;