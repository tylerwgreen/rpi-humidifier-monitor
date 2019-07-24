const GoogleSpreadsheet = require('google-spreadsheet');

var dataSheet = {
	_logger: null,
	_spreadsheetID: null,
	_sheetID: null,
	_maxRows: null,
	_sreadsheet: null,
	_sheet: null,
	init: function(args){
		// config module
		dataSheet._logger = args.logger.getLogger('dataSheet', 'silly');
		dataSheet._logger.debug(['init()', [args.config.maxRows]]);
		dataSheet._spreadsheetID = args.config.spreadsheetID;
		dataSheet._sheetID = args.config.sheetID;
		dataSheet._maxRows = args.config.maxRows;
		// load sheet
		return new Promise((resolve, reject) => {
			dataSheet._sreadsheet = new GoogleSpreadsheet(dataSheet._spreadsheetID);
			dataSheet._sreadsheet.useServiceAccountAuth(require(process.env['APP_ROOT_DIR'] + args.config.credentials), function(err){
				if(err){
					dataSheet._logger.error(['init()', 'Error returned from spreadsheet.useServiceAccountAuth()', err]);
					reject(err);
				}else{
					// find sheet id
					// dataSheet._printSpreadsheetInfo();
					dataSheet._getSheet()
						.then(function(sheet){
							// set dataSheet.sheet
							dataSheet._sheet = sheet;
							dataSheet._purgeRows()
								.then(function(numRowsPurged){
									dataSheet._logger.silly(['init()', 'Purged ' + numRowsPurged + ' rows']);
									resolve();
								})
								.catch(function(err){
									dataSheet._logger.error(['init()', 'Error purging rows', err]);
									reject(err);
								});
						})
						.catch(function(err){
							dataSheet._logger.error(['init()', 'Error getting sheet', err]);
							reject(err);
						});
				}
			});
		});
	},
	addRow: function(data){
		dataSheet._logger.debug(['addRow()', JSON.stringify(data)]);
		return new Promise((resolve, reject) => {
			data.active = data.active ? 1 : 0;
			dataSheet._sheet.addRow(data, function(err, row){
				if(err){
					dataSheet._logger.error(['addRow()', 'Error returned from sheet.adRow()', err]);
					reject(err);
				}else{
					dataSheet._purgeRows()
						.then(function(numRowsPurged){
							dataSheet._logger.silly(['addRow()', 'Purged ' + numRowsPurged + ' rows']);
							resolve(row);
						})
						.catch(function(err){
							dataSheet._logger.error(['addRow()', 'Error purging rows', err]);
							reject(err);
						});
				}
			});
		});
	},
	_getSheet: function(){
		dataSheet._logger.debug('_getSheet()');
		return new Promise((resolve, reject) => {
			dataSheet._getInfo()
				.then(function(silly){
					if(silly.worksheets.length <= 0)
						reject('Spreadsheet does not have any worksheets');
					for(var i = 0; i < silly.worksheets.length; i++){
						var sheet = silly.worksheets[i];
						if(sheet.id === dataSheet._sheetID)
							resolve(sheet);
					}
					reject('Spreadsheet does not contain sheet with id: ' + dataSheet._sheetID);
				})
				.catch(function(err){
					dataSheet._logger.error(['_getSheet()', 'Error getting sheet silly', err]);
					reject(err);
				});
		});
	},
	// used to find _workSheetID
	_printSpreadsheetInfo: function(){
		dataSheet._logger.debug('_printSpreadsheetInfo()');
		dataSheet._getInfo()
			.then(function(silly){
				dataSheet._logger.silly(['_printSpreadsheetInfo()', JSON.stringify(silly)]);
				console.log(silly);
			})
			.catch(function(err){
				dataSheet._logger.error(['_printSpreadsheetInfo()', 'Error getting sheet silly', err]);
			});
	},
	_getInfo: function(){
		dataSheet._logger.debug('_getInfo()');
		return new Promise((resolve, reject) => {
			dataSheet._sreadsheet.getInfo(function(err, silly){
				if(err){
					dataSheet._logger.error(['_getInfo()', 'Error returned from spreadsheet.getInfo()', err]);
					reject(err);
				}else{
					resolve(silly);
				}
			});
		});
	},
	_purgeRows: function(){
		dataSheet._logger.debug('_purgeRows()');
		return new Promise((resolve, reject) => {
			dataSheet._getRowCount()
				.then(function(rowCount){
					if(dataSheet._maxRowCountReached(rowCount)){
						dataSheet._deleteRows(dataSheet._getNumRowsToDelete(rowCount))
							.then(function(numRowsDeleted){
								resolve(numRowsDeleted);
							})
							.catch(function(err){
								dataSheet._logger.error(['_purgeRows()', 'Error deleting rows', err]);
								reject(err);
							});
					}else{
						resolve();
					}
				})
				.catch(function(err){
					dataSheet._logger.error(['_purgeRows()', 'Error getting row count', err]);
					reject(err);
				});
		});
	},
	_getRowCount: function(){
		dataSheet._logger.debug('_getRowCount()');
		return new Promise((resolve, reject) => {
			dataSheet._getSheet()
				.then(function(sheet){
					resolve(sheet.rowCount);
				})
				.catch(function(err){
					dataSheet._logger.error(['_getRowCount()', 'Error getting sheet', err]);
					reject(err);
				});
		});
	},
	_maxRowCountReached: function(rowCount){
		dataSheet._logger.debug(['_maxRowCountReached()', rowCount]);
		if(!rowCount)
			throw new Error('Missing required rowCount');
		return rowCount > dataSheet._maxRows ? true : false;
	},
	_getNumRowsToDelete: function(rowCount){
		dataSheet._logger.debug(['_getNumRowsToDelete()', rowCount]);
		if(!rowCount)
			throw new Error('Missing required rowCount');
		return dataSheet._maxRowCountReached(rowCount) ? (rowCount - dataSheet._maxRows) : 0;
	},
	_deleteRows: function(numRowsToDelete){
		dataSheet._logger.debug(['_deleteRows()', numRowsToDelete]);
		if(
				!numRowsToDelete
			||	numRowsToDelete <= 0
		)
			throw new Error('No rows specified to be deleted');
		return new Promise((resolve, reject) => {
			var rowStart = 0;
			dataSheet._sheet.getRows({
				offset: rowStart,
				limit: numRowsToDelete,
			}, function(err, rows){
				if(err){
					dataSheet._logger.error(['_deleteRows()', 'Error returned from sheet.getRows()', err]);
					reject(err);
				}else{
					if(rows.length <= 0)
						reject('Unable to get ' + numRowsToDelete + ' rows starting at row ' + rowStart);
					// recursively synchronosly delete rows
					var handleRowDeletion = function(rowToDeleteIndex){
						if(rowToDeleteIndex < rows.length){
							// dataSheet._logger.silly(['_rowDelCallback()|handleRowDeletion', 'Purging row ' + rowToDeleteIndex]);
							var row = rows[rowToDeleteIndex];
							row.del(function(err){
								dataSheet._logger.debug(['_rowDelCallback()|handleRowDeletion|row.del()', rowToDeleteIndex]);
								if(err){
									dataSheet._logger.error(['_rowDelCallback()|handleRowDeletion|row.del()', 'Error returned from sheet.row.del()', err]);
									reject(err);
								}else{
									handleRowDeletion(rowToDeleteIndex + 1);
								}
							});
						}else{
							// dataSheet._logger.silly(['_rowDelCallback()|handleRowDeletion', 'No more rows to purge']);
							resolve(rowToDeleteIndex);
						}
					};
					handleRowDeletion(0);
				}
			});
		});
	}
}
module.exports = dataSheet;