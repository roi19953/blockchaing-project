var MyArgs = process.argv.slice(2).toString(); 
const [gameName, action, space] = MyArgs.split(",");
console.log("my args: "+ MyArgs.split(","))
console.log(action)