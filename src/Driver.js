class Driver {
    constructor(name) {
      this.name = name;
    }
    
    setRating(rating) {
        this.rating = rating
    }

    toString() {
      return this.name + ':' + this.rating
    }
}

let driver1 = new Driver("roy");
console.log(driver1.name)
driver1.setRating(4)
console.log(driver1.toString())