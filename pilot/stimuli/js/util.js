
Array.prototype.contains = function(v, accessor) {
  accessor = accessor|| function(o){return o;};
  for(var i = 0; i < this.length; i++) {
    if(accessor(this[i]) === accessor(v)) return true;
  }
  return false;
};

Array.prototype.unique = function(accessor) {
  var arr = [];
  for(var i = 0; i < this.length; i++) {
    if(!arr.contains(this[i], accessor)) {
      arr.push(this[i]);
    }
  }
  return arr;
}

Array.prototype.sample = function(N){
  tempThis = this.slice();
  sampled = [];
  for (var i = 0; i < N; i++) {
    sampled.push(tempThis.splice([Math.floor(Math.random()*tempThis.length)],1)[0]);
  }
  return sampled;
}

Array.prototype.shuffle = function(){
  for (let i = this.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [this[i - 1], this[j]] = [this[j], this[i - 1]];
  }
  return this;
}
Array.prototype.clone = function(){
  return JSON.parse(JSON.stringify(this));
}