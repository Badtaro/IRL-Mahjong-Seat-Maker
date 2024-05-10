
const fs = require('fs');
const { round } = require('lodash');



//this loads the registration list
function loadContestants(){
	return new Promise(resolve =>{
		fs.readFile(`players.txt`,'utf-8',(err,data) => {
			if(err) throw err;
			let contestants = parseContestants(data);
			resolve(contestants);
		});
	});
}
//this parses the registration list and returns an object
function parseContestants(data){
	let contestants = [];
	let contestantEntries = data.split('\n');
	let i = 0; //The id field, increment to make unique.
	for(let contestant of contestantEntries){
		contestant = contestant.replace('\r','');
		let contestantData = contestant.split('\t'); // the data should be a name and if a sub
		contestants.push(
		{
			Name: contestantData[0],
			id: i,
			sub: contestantData[1], 
			seatsPlayed: [0,0,0,0], //Will be E,W,S,N counts.
		});
		i++; //increment the id field.
	}
	return contestants;
}

//Output the round for Contestants. Contestants should be the object above + its weights, and round number
function outputContestants(contestants,weights,roundInfo){
	return new Promise(resolve =>{
		roundInfo ++
		JSONObject = {};

		currentContestants = 0;
		//for each grouping, make a row in the csv. Neat.
		contestants.forEach(function(rowArray) {
			rowArray.weights = weights[currentContestants];
			JSONObject[currentContestants] = rowArray;
			currentContestants++;
		});

		JSONString = JSON.stringify(JSONObject, null, 2);
		let fileName = "./Checkpoints/Checkpoint_Round_"+roundInfo+".json"
		fs.writeFile(fileName,JSONString,(err)=>{
			if(err) throw err;
			resolve("success");
		});
		resolve("success");
	});
}

//Saves the current round to a local file location. This has the table match ups included
function outputRound(contestants,currentOption,roundInfo){
	return new Promise(resolve =>{
		roundInfo ++ //the loop outside this function starts at 0.

		let csvContent = "Round,Table,East Seat,South Seat,West Seat,North Seat"+"\r\n";
		let tableNumber = 1; //we start at table 1 obviously.

		//for each grouping, make a row in the csv. Neat.
		currentOption.groups.forEach(function(rowArray) {
			let row = roundInfo +","+tableNumber+","+contestants[rowArray[3]].Name+","+contestants[rowArray[2]].Name+","+contestants[rowArray[1]].Name+","+contestants[rowArray[0]].Name;
			csvContent += row + "\r\n";
			tableNumber++; //increment table.
		});

		let fileName = "./RoundInfo/RoundInfo_"+roundInfo+".csv"
		fs.writeFile(fileName,csvContent,"utf-8",(err)=>{
			if(err) throw err;
			resolve("success");
		});
	});
}

//Read in a previous load, this means we are starting from a Checkpoint.
function previousPlayerInfo(roundInfo){
	return new Promise(resolve =>{
		let fileName = "./Checkpoints/Checkpoint_Round_"+roundInfo+".json"
		fs.readFile(fileName,(err,data) => {
			if(err) throw err;
			resolve(JSON.parse(data));
		});
	});
}

exports.previousPlayerInfo = previousPlayerInfo;
exports.outputRound = outputRound;
exports.outputContestants = outputContestants;
exports.loadContestants = loadContestants;