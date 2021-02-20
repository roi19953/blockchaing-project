console.log('sdf')
var data = 'GameName,roy:omri:dsf,P1-NEXT,0275b08e530f0e8e7c461f022e22026da795151505b4a4437bf64d2cf9ed4f427b,0278ded6f33b22329605130315ff2e917126f71e53858f025143ab0b7cfbc8ed84'

let gamesIterable = data
.split("|")
.map((x) => x.split(","))
.map((x) => [x[0],{ name: x[0], board: x[1], state: x[2], player1: x[3], player2: x[4] },]);
console.log(gamesIterable)
// .map((x) => [x[0],{ name: x[0], board: x[1], state: x[2], player1: x[3], player2: x[4] },]);