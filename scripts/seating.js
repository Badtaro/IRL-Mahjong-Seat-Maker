const fs = require('fs');
const data = require('./datahandler.js');
// Load the full build.
const _ = require('lodash');
const { constants } = require('buffer');
const rl = require('readline-sync')

const GENERATIONS = 60
const RANDOM_MUTATIONS = 10
const MAX_DESCENDANTS_TO_EXPLORE = 200

let contestants = [];
let countOfPlayers= 0;
let groupCount = 0;
let subCount = 0;
let roundCount = 0;
let ofSize = 4; // how many players per table
let seatBreakPoint = 0;

async function setup(){

    contestants = await data.loadContestants().catch(err => reject(err));

    //This should determine our perfect amount score
    countOfPlayers = Object.keys(contestants).length; 
    groupCount = countOfPlayers / 4.0;
    //check if whole number. If not, it is a float and we must raise an error
    if(groupCount % 1 != 0)
    {
        throw new Error('Group Count is not a whole number. Provide a player list divisible by 4.')
    }   
    
    //console.log(contestants)
    //Sort based off Sub field. if it is Y (Stand for Sub) it will be at the top. 
    contestants.sort(function(a,b) {

        var textA = a.sub.toUpperCase();
        var textB = b.sub.toUpperCase();
        return (textA > textB) ? -1 : (textA < textB) ? 1 : 0 ;
    });

    //pointless reset
    subCount = 0;
    //Since we sorted the subs should be in the first 4 or so in the array. 
    for(let i=0; i<countOfPlayers;i++)
    {
        if(contestants[i].sub == 'Y')
        {
          subCount++;
          contestants[i].id= i; //sorta pointless can reduce for loop to just 4 if we don't need this.
        }
        else{
          contestants[i].id= i;
        }
        if(subCount>3){
          throw new Error('The count of Substitutes is above 3, this is not allowed. Please rectify and try again.')
        }
    }

    //ask for amount of Rounds
    roundCount = rl.question("How many rounds would you like produced?    ")
    roundCount = Number.parseInt(roundCount);
    if(!Number.isInteger(roundCount))
    {
      throw new Error('Error, you did not supply a whole number.')
    }

    //Ask to start over or use previous JSON.
    console.log("1) Would you like to use the current Players with no previous rounds?")
    console.log("2) Or would you like to start from a previous round?")
    let response = rl.question("(1 or 2):  ")
    if(response == 2)
    {
      console.log("What checkpoint round would you like to use?")
      let previousRound = rl.question("Please supply just a number:   ")
      previousRound = Number.parseInt(previousRound);
      if(!Number.isInteger(previousRound))
      {
        throw new Error('Error, you did not supply a whole number.')
      }
      seatBreakPoint = Math.ceil(roundCount/4.0);
      console.log("How many times a player can play a wind: "+ seatBreakPoint)
      roundPreviousSolver(previousRound);
    }
    else if(response ==1)
    {
      seatBreakPoint = Math.ceil(roundCount/4.0);
      console.log("How many times a player can play a wind: "+ seatBreakPoint)
      geneticSolver();
    }
    else
    { 
      throw new Error('Not a proper answer. It is either 1 or 2.')
    }
}

//Like GeneticSolver, but we load previous rounds of data in first.
async function roundPreviousSolver(previousRound)
{
  //Grab the round asked for.
  checkpoint = await data.previousPlayerInfo(previousRound);
  weights = [];
  namesToCut=[];

  for(let i =0; i< Object.keys(checkpoint).length;i++)
  {
    nameExists = false;
    for(let y=0;y< Object.keys(contestants).length;y++)
    {
      if(contestants[y].Name == checkpoint[i].Name)
      {
        nameExists=true;
        break;
      }
    }
    if(nameExists == false)
    {
      namesToCut.push(i);
    }
    weights.push(checkpoint[i].weights);
  }

  //check first if there is a difference in the name count or not.
  if(namesToCut.length>1)
  { 
    //we reverse the namesToCut, otherwise we will remove weights and get out of position
    //Ex: ['one','two','three','four','five'], we should cut name 3 and 4. 
    //if you do not reverse you'll get ['one','two','four']
    namesToCut = namesToCut.reverse();

    //Number of removed people must be 4 or else we can't make the proper amount of players per table
    if(((namesToCut.length/4.0)%1 != 0))
    {    
      throw new Error('The names not present between player.txt and Checkpoint_Round_'+previousRound+'.json is ' + namesToCut.length + ', which is not divisible by 4')
    }
    //We must now remove the weights that do not exist anymore.
    for(let i =0; i< Object.keys(checkpoint).length;i++)
    {
      for(let y=0;y<namesToCut.length;y++)
      {
        weights[i].splice(namesToCut[y],1)
      }
    }
    //now remove the players that no longer exist
    for(let y=0;y<namesToCut.length;y++)
    {
      weights.splice(namesToCut[y],1)
      contestants.splice(namesToCut[y],1)
    }
  }
  
  subNumbers = []
  //we have to reset the contestants because the id field is wacky now
  contestants = [];
  let j = 0
  for(let i =0; i< Object.keys(checkpoint).length;i++)
  {
    if(!namesToCut.includes(i))
    {
      contestants.push(
        {
          Name: checkpoint[i].Name,
          id: j,
          sub: checkpoint[i].sub, 
          seatsPlayed: checkpoint[i].seatsPlayed, //Will be E,W,S,N counts.
        });
      if(checkpoint[i].sub == 'Y')
      {
        subNumbers.push(i)
      }
      j++
    }
  }
  
  //Change the weights for the ones that are subs now.
  if(subNumbers.length > 0)
  {
    for(let i=0;i<subNumbers.length;i++)
    {
      for(let y=0;y<subNumbers.length;y++)
      {
        weights[subNumbers[i]][subNumbers[y]] = weights[subNumbers[y]][subNumbers[i]] = Infinity;
      }
    }
  }


  const rounds = []
  const roundScores = []
  subCount = 0;
  //We must remap the sub list as well. Womp.
  for (let round = 0; round < roundCount; round++) {
    //Change to exact count for the Subcount
    //Remove seat recording for subs, they are made to suffer whatever they get.
    if (subNumbers.length>0) {
      for (let i = 0; i < subNumbers; i++) {
        for (let j = 0; j < 4; j++) {
          contestants[subNumbers[i]].seatsPlayed[j]=0;
        }
      }
    }

    //called topOptions but is just options in reality. Becomes TopOptions in the While loop.
    //view generePermutations to see how this next step works, makes 5 options.
    let topOptions = range(1,5).map(() => score(generatePermutation(), weights))
    let generation = 0
    //we can delete, spits out 5 options.
    //console.log(topOptions);

    while (generation < GENERATIONS && topOptions[0].total > 0) {
      const candidates = generateMutations(topOptions, weights)
      let sorted = _.sortBy(candidates, c => c.total)
      const bestScore = sorted[0].total
      // Reduce to all the options that share the best score
      topOptions = sorted.slice(0, sorted.findIndex(opt => opt.total > bestScore))
      // Shuffle those options and only explore some maximum number of them
      topOptions = _.shuffle(topOptions).slice(0, MAX_DESCENDANTS_TO_EXPLORE)
      generation++;
    }
    const bestOption  = topOptions[0]
    rounds.push(bestOption.groups)
    roundScores.push(bestOption.total)
    updateWeights(bestOption.groups, weights)
    recordSeatings(bestOption.groups)
    date = new Date();
    OutputRound = round + previousRound
    await data.outputRound(contestants,bestOption,OutputRound).catch(err => reject(err))
    await data.outputContestants(contestants,weights,OutputRound)
  }


  //QA Bulllshit
  minNumber = 500
  maxNumber = 0

  //This will spit out infinity if there are actual subs, i am too lazy to fix this
  for (let i = subCount; i < countOfPlayers - 1; i++) {
    for (let j = i + 1; j < countOfPlayers; j++) {
      if(weights[i][j]<minNumber)
      {
        minNumber = weights[i][j]
      }
      if(weights[i][j]>maxNumber)
      {
        maxNumber = weights[i][j]
      }
    }
  }

  console.log("max: " +maxNumber + "   and the min:   " + minNumber)


}


async function geneticSolver()
{
  discouragedGroups= [];
  console.log(countOfPlayers);

  //Makes an array of [0-(count-1)][0-(count-1)], a lil confusing I know.
  const weights = range(0,countOfPlayers-1).map(() => range(0,countOfPlayers-1).fill(0))

  //this was a test
  //weights[0][1] = weights[1][0] = (weights[0][1] + 1)
  
  // Fill some initial restrictions, subs can never play against each other.
  if (subCount>0) {
    // Forbid every pairwise combination of subs.
    for (let i = 0; i < subCount; i++) {
      for (let j = 0; j < subCount; j++) {
        weights[i][j] = weights[j][i] = Infinity;
      }
    }
  }

  const rounds = []
  const roundScores = []

  
  for (let round = 0; round < roundCount; round++) {
    //Remove seat recording for subs, they are made to suffer whatever they get.
    if (subCount>0) {
      for (let i = 0; i < subCount; i++) {
        for (let j = 0; j < 4; j++) {
          contestants[i].seatsPlayed[j]=0;
        }
      }
    }

    //called topOptions but is just options in reality. Becomes TopOptions in the While loop.
    //view generePermutations to see how this next step works, makes 5 options.
    let topOptions = range(1,5).map(() => score(generatePermutation(), weights))
    let generation = 0
    //we can delete, spits out 5 options.
    //console.log(topOptions);

    while (generation < GENERATIONS && topOptions[0].total > 0) {
      const candidates = generateMutations(topOptions, weights)
      let sorted = _.sortBy(candidates, c => c.total)
      const bestScore = sorted[0].total
      // Reduce to all the options that share the best score
      topOptions = sorted.slice(0, sorted.findIndex(opt => opt.total > bestScore))
      // Shuffle those options and only explore some maximum number of them
      topOptions = _.shuffle(topOptions).slice(0, MAX_DESCENDANTS_TO_EXPLORE)
      generation++;
    }
    const bestOption  = topOptions[0]
    rounds.push(bestOption.groups)
    roundScores.push(bestOption.total)
    updateWeights(bestOption.groups, weights)
    recordSeatings(bestOption.groups)
    date = new Date();
    await data.outputRound(contestants,bestOption,round).catch(err => reject(err))
    await data.outputContestants(contestants,weights,round)
    //await data.outputContestants(contestants,weights,round).catch(err => reject(err))
  }


  //QA Bulllshit
  minNumber = 500
  maxNumber = 0

  for (let i = subCount; i < countOfPlayers - 1; i++) {
    for (let j = i + 1; j < countOfPlayers; j++) {
      if(weights[i][j]<minNumber)
      {
        minNumber = weights[i][j]
      }
      if(weights[i][j]>maxNumber)
      {
        maxNumber = weights[i][j]
      }
    }
  }
  console.log(weights)
  console.log("max: " +maxNumber + "   and the min:   " + minNumber)


  /*onProgress({
    rounds,
    roundScores,
    weights,
    done: (round+1) >= forRounds,
  })*/
}

//Shuffles the list of players into random groups i believe
function generatePermutation() {
  let currentSubNumber = 0
  //range of 0 to the size*groupcount (should be playercount for our purposes)
  //Shuffle the array where the players aren't substitutes, so I don't lose my mind
  //-1 on the group count so we don't go over the array size.

  const shuffledPeople = shuffle(range(subCount, (groupCount * ofSize)-1));


  //Reset Position per permutation
  currentPosition = 0;
  return range(1,groupCount).map(i => {
    const group = []; //new group
    //If subcount exists, we add the sub first then 3 random people
    if(subCount!=currentSubNumber)
    {
      group.push(currentSubNumber);
      group.push(...shuffledPeople.slice(currentPosition,currentPosition+3))
      currentPosition+=3;
      currentSubNumber++;
    }
    //subs are gone, add four random people.
    else
    {
      group.push(...shuffledPeople.slice(currentPosition,currentPosition+4))
      currentPosition+=4;
    }

    return group;
  });
}

//shuffles an array,  
function shuffle(arr) {
    let currentIndex = arr.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [arr[currentIndex], arr[randomIndex]] = [
        arr[randomIndex], arr[currentIndex]];
    }
  
    return arr;
  }

function score(round, weights) {
  const groupScores = round.map(group => {
    let groupCost = 0
    forEachPair(group, (a, b) => groupCost += Math.pow(weights[a][b], 2))
    //groupCost += contestants[group[0]].seatsPlayed[3]; //north seat count
    //groupCost += contestants[group[1]].seatsPlayed[2]; //West seat count
    //groupCost += contestants[group[2]].seatsPlayed[1]; //South seat count
    //groupCost += contestants[group[3]].seatsPlayed[0]; //East seat count

    //Rotate through all four players in the group.
    for(i=0;i<4;i++)
    {
      //If the seat is past our breakpoint I'd like it to be painful for the score
      if(contestants[group[i]].seatsPlayed[(3-i)] >= seatBreakPoint)
      {
        groupCost += seatBreakPoint*5;
      }
      //if they go past the breakpoint once more make it impossible. 
      if(contestants[group[i]].seatsPlayed[(3-i)] >= seatBreakPoint+1)
      {
        groupCost += Infinity;
      }
      //Produce the Min number from the four seat positions. Math.min() I think is slower, I think.
      minNumber = 50;
      for(j=0;j<4;j++)
      {
        if(minNumber>contestants[group[i]].seatsPlayed[j])
        {
          minNumber=contestants[group[i]].seatsPlayed[j];
        }
      }
      //Using min number, we can try to edge the [1,1,0,1] situation into [1,1,1,1].
      //Essentially we don't want to play on a seat we've already played if a 0 exists.
      if(contestants[group[i]].seatsPlayed[(3-i)] > minNumber)
      {
        groupCost+= 1.1;
      }
      groupCost += contestants[group[i]].seatsPlayed[3-i]-minNumber;
    }
    return groupCost
  })
  return {
    groups: round,
    groupsScores: groupScores,
    total: groupScores.reduce((sum, next) => sum + next, 0),
  }
}

//Produces an array starting at the startnumber and ending on the endNumber
function range(startNumber,endNumber){
    var arr = []
    for(let i = startNumber; i<=endNumber;i++)
    {
        arr.push(i);
    }
    return arr;
}

function generateMutations(candidates, weights) {
  const mutations = []
  candidates.forEach(candidate => {
    const scoredGroups = candidate.groups.map((g, i) => ({group: g, score: candidate.groupsScores[i]}))
    const sortedScoredGroups = _.sortBy(scoredGroups, sg => sg.score).reverse()
    const sorted = sortedScoredGroups.map(ssg => ssg.group)

    // Always push the original candidate back onto the list
    mutations.push(candidate)

    // Add every mutation that swaps somebody out of the most expensive group
    // (The first group is the most expensive now that we've sorted them)
    for (let i = 0; i < ofSize; i++) {
      //if (withGroupLeaders && i == 0) continue; //change for sub count.
      for (let j = ofSize; j < countOfPlayers; j++) {
        //if (withGroupLeaders && j % ofSize == 0) continue;
        mutations.push(score(swap(sorted, i, j), weights))
      }
    }

    // Add some random mutations to the search space to help break out of local peaks
    for (let i = 0; i < RANDOM_MUTATIONS; i++) {
      mutations.push(score(generatePermutation(), weights))
    }
  })
  return mutations;
}

function updateWeights(round, weights) {
  for (const group of round) {
    forEachPair(group, (a, b) => {
      weights[a][b] = weights[b][a] = (weights[a][b] + (seatBreakPoint*50))
    })
  }
}

function forEachPair(array, callback) {
    for (let i = 0; i < array.length - 1; i++) {
      for (let j = i + 1; j < array.length; j++) {
        callback(array[i], array[j])
      }
    }
  }

function swap(groups, i, j) {
  const copy = groups.map(group => group.slice())
  copy[Math.floor(i / ofSize)][i % ofSize] = groups[Math.floor(j / ofSize)][j % ofSize]
  copy[Math.floor(j / ofSize)][j % ofSize] = groups[Math.floor(i / ofSize)][i % ofSize]
  return copy
}

function recordSeatings(round) {
  for (const group of round) {
    contestants[group[0]].seatsPlayed[3]++; //north seat increment
    contestants[group[1]].seatsPlayed[2]++; //West seat increment
    contestants[group[2]].seatsPlayed[1]++; //South seat increment
    contestants[group[3]].seatsPlayed[0]++; //East seat increment
  }
}

exports.setup = setup;