# IRL-Mahjong-Seat-Maker
Will make a bare minimum repeat mahjong seating with details on seat position and winds for each round. Ideally no repeats, but that is unavoidable if there is too many rounds and a small player number. It will try to avoid repeat winds too, but prio's no repeat fights.

Setup
0) Unzip the folder and place it somewhere local
1) Obtain Node JS  https://nodejs.org/en
2) Open your Console, I use powershell since I am on Windows
2.5) Navigate to the location of the local folder. For powershell do "cd PATH" to get to spot 
you want, PATH being the literal path, ex: "cd C:\Users\William\Desktop\IRL Mahjong Seat Maker\"

3) Try running "npm install -g npm"
4) try running "node -v" and "npm -v" to test if you have the proper stuff installed
5) Run "npm install fs"
6) run "npm install readline-sync"
7) run "npm install lodash"

Running first time
1) Update players.txt to be the player list, include a tab and a "N" or "Y", this second 
attribute represents if the player is a sub or not.
2) Run "node ." in the powershell. 
3) Answer the questions given in the console.

Running a second time
1) IF more than four people drop pick "2" on the second question in the script.
This will take us down a different path.  The next question asked is asking what checkpoint
you wish to start from.  (Ex: If you pick "3" on this question you'll be loading Checkpoint_3,
this means if asked for 4 rounds, the rounds produced will be 4,5,6,7 because we start at 3)
2) The checkpoint load is what matters most. DO NOT DELETE PEOPLE FROM THIS LIST. The people 
you are dropping should come from "players.txt".  You may change player's names or make them a
sub, but please do this in "players.txt" and "Checkpoint_Round_#.json" where # is your picked 
round.
