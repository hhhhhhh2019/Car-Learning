"use strict"
let _sigmoid = {
  activate: function(x) {
    return 1 / (1 + Math.exp(-x));
  },

  measure: function(x, y, e) {
    return e * y * (1 - y) * x;
  }
}

let _relu = {
	activate: function(x) {
		if (x > 1) return 1 + 0.01 * (x - 1)
		if (x < 0) return 0.01 * x;
		if (0 <= x && x <= 1) return x;
	},
	
	measure: function(x, y, e) {
		let a = 0;
		if (x > 1 || x < 0) {a = 0.01}
		else {a = 1}
		return x * y * e;
	}
}

let _types = {
  "sigmoid": _sigmoid,
  "relu": _relu
}


class NeuralNetwork {
	constructor(nc, type="sigmoid") {
		this.layouts = [];
		this.weights = [];
		this.type = type;
		
		//заполнение layouts
		for (let i of nc) {
			let lay = [];
			for (let j = 0; j < i; j++) {
				lay.push([0, 0]); // значение, ошибка
			}
			this.layouts.push(lay);
		}
		
		//заполнение weights
		for (let i = 1; i < nc.length; i++) {
			let a = []; // название не предумал
			for (let j = 0; j < nc[i]; j++) {
				let w = []; // тоже не предумал
				for (let k = 0; k < nc[i-1]; k++) {
					w.push(Math.random() * 2 - 1);
				}
				a.push(w);
			}
			this.weights.push(a);
		}
	}
	
	learn(data, params) {
		let iter = 1000;
		let rate = 0.2;
		let log = false;
		let log_time = 100;
		
		if (params) {
			if (params.hasOwnProperty("iterations")) {
				iter = params["iterations"];
			}
			
			if (params.hasOwnProperty("learn_rate")) {
				rate = params["learn_rate"];
			}
			
			if (params.hasOwnProperty("log")) {
				log = params["log"];
			}
			
			if (params.hasOwnProperty("log_interval")) {
				log_time = params["log_interval"];
			}
		}
		
		for (let r = 0; r < iter; r++) {
			let e = 0;
			
			for (let d of data) {
				this.run(d["input"]);
				
				e += this.count_error(d["output"]);
				
				for (let i = 0; i < this.layouts.length-1; i++) {
					for (let j = 0; j < this.weights[i].length; j++) {
						for (let k = 0; k < this.weights[i][j].length; k++) {
							this.weights[i][j][k] += rate * _types[this.type].measure(
								this.layouts[i][k][0],
								this.layouts[i+1][j][0],
								this.layouts[i+1][j][1]);
						}
					}
				}
			}
			
			if (log && r % log_time == 0) {
				console.log("iteration: " + r + ", error: " + e);
			}
			
			e = 0;
		}
	}
	
	get_error() {
		let error = 0;
		
		for (let i of this.layouts) {
			for (let j of i) {
				error += Math.abs(j[1]);
			}
		}
		
		return error;
	}
	
	count_error(data) {
		let all_error = 0;
		
		for (let i = 0; i < this.layouts[this.layouts.length-1].length; i++) {
			this.layouts[this.layouts.length-1][i][1] = data[i] - this.layouts[this.layouts.length-1][i][0];
			all_error += Math.abs(this.layouts[this.layouts.length-1][i][1]);
		}
		
		for (let i = this.layouts.length-2; i > 0; i--) {
			for (let j = 0; j < this.layouts[i].length; j++) {
				this.layouts[i][j][1] = 0;
				for (let k = 0; k < this.layouts[i+1].length; k++) {
					this.layouts[i][j][1] += this.layouts[i+1][k][1] * this.weights[i][k][j];
				}
				all_error += Math.abs(this.layouts[i][j][1]);
			}
		}
		
		return all_error;
	}
  
	run(data) {
		for (let i = 0; i < data.length; i++) {
			this.layouts[0][i][0] = data[0];
		}
		
		for (let i = 1; i < this.layouts.length; i++) {
			for (let j = 0; j < this.layouts[i].length; j++) {
				this.layouts[i][j][0] = 0;
				for (let k = 0; k < this.layouts[i-1].length; k++) {
					this.layouts[i][j][0] += this.layouts[i-1][k][0] * this.weights[i-1][j][k];
				}
				this.layouts[i][j][0] = _types[this.type].activate(this.layouts[i][j][0]);
			}
		}
		
		let result = [];
		
		for (let i of this.layouts[this.layouts.length-1]) {
			result.push(i[0]);
		}
		
		return result;
	}
	
	pay(val) {
		let fixed = [];
		
		let reward = 2 ** -val;
		if (reward > 1) reward /= reward ** 0.9;
		
		for (let i = 1; i < this.layouts.length; i++) {
			for (let j = 0; j < this.layouts[i].length; j++) {
				for (let k = 0; k < this.layouts[i-1].length; k++) {
					this.weights[i-1][j][k] += (Math.random() * 2 - 1) * reward;
				}
			}
		}
	}
}