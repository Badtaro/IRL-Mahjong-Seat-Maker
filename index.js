const seating = require('./scripts/seating.js');

//enable only one of these options
//rcstats.setup()	//stat gatherer
seating.setup();	//tournament bot

process.on('unhandledRejection', err => {
	console.error("Unhandled Rejection", err);
});
