
class Poll{
  constructor(db){
    this._db = db
  }
  
  deletePoll(id){

    return new Promise((resolve, reject)=>{
      this._db.collection("Polls").removeOne({_id : id}, function(err, data){
        if(err) reject(err)
        if(data.result.n == 1) resolve()
        reject("Unknown Reason!")
      })
    })
  }
}


module.exports = Poll