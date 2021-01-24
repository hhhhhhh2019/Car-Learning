let fast_learn = false;


let body = document.createElement("body");
document.body = body;

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");

let width = 700;
let height = 700;

cnv.width = width;
cnv.height = height;

body.appendChild(cnv);


let images = {};

function loadImage(file) {
    if (images.hasOwnProperty(file)) return;

    let img = document.createElement("img");
    img.src = file;

    images[file] = {
        load: false,
        image: img
    }

    img.onload = function() {
        images[file].load = true;
    }
}

function drawImage(file, x, y, w, h) {
    if (images.hasOwnProperty(file)) {
        if (images[file].load) {
            ctx.drawImage(images[file].image, x, y, w, h);
        }
    }
}

function line(x0, y0, x1, y1, c, w=2) {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

loadImage("car_1.png");


function radians(a) {
    return a * Math.PI / 180; 
}

function norm(a) {
    let s = distance([0, 0], a);
    return [a[0] / s, a[1] / s];
}

function cast(o, d, w) {
    let x1 = w[0][0];
    let y1 = w[0][1];
    let x2 = w[1][0];
    let y2 = w[1][1];
    let x3 = o[0];
    let y3 = o[1];
    let x4 = o[0] + d[0];
    let y4 = o[1] + d[1];
    
    let den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (den == 0) return;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    
    if (t > 0 && t < 1 && u > 0) {
        let pt = [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
        
        return pt
    }
    else return;
}

function distance(a, b) {
    let c = [a[0] - b[0], a[1] - b[1]];
    return (c[0] ** 2 + c[1] ** 2) ** 0.5;
}

function inter(ax1,ay1,ax2,ay2,bx1,by1,bx2,by2) {				 
    let v1 = (bx2 - bx1) * (ay1-by1) - (by2-by1) * (ax1 - bx1);
    let v2 = (bx2 - bx1) * (ay2-by1) - (by2-by1) * (ax2 - bx1);
    let v3 = (ax2 - ax1) * (by1-ay1) - (ay2-ay1) * (bx1 - ax1);
    let v4 = (ax2 - ax1) * (by2-ay1) - (ay2-ay1) * (bx2 - ax1);

    return (v1 * v2 <= 0) && (v3 * v4 <= 0) &&
          !((((ax1 == bx1) && (ay1 == by1))
                || ((ax1 == bx1) && (ay1 == by1))
                || ((ax2 == bx1) && (ay2 == by1))
                || ((ax1 == bx2) && (ay1 == by2))
                || ((ax2 == bx2) && (ay2 == by2))
           ));
}

function rot(v, a) {
    let res = [0, 0];
    res[0] = v[0] * Math.cos(a) + v[1] * -Math.sin(a);
    res[1] = v[0] * Math.sin(a) + v[1] * Math.cos(a);
    return res;
}


class Agent {
    constructor(x, y, w, h) {
        this.points = [[-w/2, -h/2], [w/2, -h/2], [w/2, h/2], [-w/2, h/2]];
        this.rc = 20;
        this.n = new NeuralNetwork([this.rc, 10, 2]);
        this.a = 0;
        this.w = w;
        this.h = h;
        this.x = w/2 + x;
        this.y = h/2 + y;
        this.sx = w/2 + x;
        this.sy = h/2 + y;

        this.score = 100;
    }

    think(m) {
        let res = this.n.run(this.trayce(m));
        this.move(Math.max(0.2, res[0]*2));
        if (res[1] > 0.51) this.rotate(res[1] * (1 - res[0]));
        if (res[1] < 0.49) this.rotate((1 - res[1]) * (1 - res[0]));
    }

    trayce(map) {
        let scene = [];

        for (let r = -this.rc/2; r < this.rc/2; r++) {
            let closest = null;
            let record = Infinity;
            
            let d = rot(norm([0, 1]), this.a+r/5);
            
            for (let i = 1; i < map.length; i++) {
              let w = map[i];
                let pt = cast([this.x, this.y], d, w);
                
                if (pt) {
                    let p = [this.x, this.y];
                    let d = distance(pt, p);
                    
                    if (d <= 100) {
                        if (d < record) {
                            record = d;
                            closest = pt;
                        }
                        
                        record = Math.min(d, record);
                    }
                }
            }

            if (!closest) {
                line(this.x, this.y, this.x + d[0]*100, this.y + d[1]*100, "black", 0.5)
            }
            
            else {
                line(this.x, this.y, closest[0], closest[1], "black", 0.5);
            }
            
            scene[r] = record <= 100 ? (100 - record) ** 2 : 0;
        }

        return scene;
    }

    move(s) {
        let dir = rot([0, 1], this.a);
        this.x += dir[0] * s;
        this.y += dir[1] * s;
    }

    rotate(a) {
        this.a += radians(a);
        this.a = this.a % (Math.PI*2);
        let points = [[-this.w/2, -this.h/2], [this.w/2, -this.h/2], [this.w/2, this.h/2], [-this.w/2, this.h/2]];
        for (let i = 0; i < this.points.length; i++) {
            this.points[i] = rot(points[i], this.a);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.a);
        drawImage("car_1.png", -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }

    collide(map) {
        for (let i = 1; i < map.length; i++) {
          let w = map[i];
            let p = this.points;
            if (inter(w[0][0], w[0][1], w[1][0], w[1][1],
                    p[0][0]+this.x, p[0][1]+this.y, p[1][0]+this.x, p[1][1]+this.y))
                return true;
            if (inter(w[0][0], w[0][1], w[1][0], w[1][1],
                    p[1][0]+this.x, p[1][1]+this.y, p[2][0]+this.x, p[2][1]+this.y))
                return true;
            if (inter(w[0][0], w[0][1], w[1][0], w[1][1],
                    p[2][0]+this.x, p[2][1]+this.y, p[3][0]+this.x, p[3][1]+this.y))
                return true;
            if (inter(w[0][0], w[0][1], w[1][0], w[1][1],
                    p[3][0]+this.x, p[3][1]+this.y, p[0][0]+this.x, p[0][1]+this.y))
                return true;
        }

        return false;
    }
}


var cars = [new Agent(600, 200, 20, 40)];
/*var map = [
    [[20, 0], [170, 10]],
    [[20, 0], [0, 70]],
    [[0, 70], [50, 170]],
    [[50, 170], [50, 270]],
    [[50, 270], [50, 280]],
    [[50, 280], [170, 270]],
    [[170, 270], [370, 280]],
    [[370, 280], [390, 120]],
    [[390, 120], [370, 50]],
    [[370, 50], [170, 10]],

    [[350-30, 120-30], [200-30, 90-30]],
    [[200-30, 90-30], [90-30, 80-30]],
    [[90-30, 80-30], [90-30, 110-30]],
    [[90-30, 110-30], [135-30, 180-30]],
    [[135-30, 180-30], [125-30, 260-30]],
    [[125-30, 260-30], [190-30, 255-30]],
    [[190-30, 255-30], [350-30, 260-30]],
    [[350-30, 260-30], [365-30, 140-30]],
    [[365-30, 140-30], [350-30, 120-30]]
]*/

let map = [
    [
      [
        34,
        0
      ],
      [
        289,
        17
      ]
    ],
    [
      [
        34,
        0
      ],
      [
        0,
        119
      ]
    ],
    [
      [
        0,
        119
      ],
      [
        85,
        289
      ]
    ],
    [
      [
        85,
        289
      ],
      [
        85,
        459
      ]
    ],
    [
      [
        85,
        459
      ],
      [
        85,
        476
      ]
    ],
    [
      [
        85,
        476
      ],
      [
        289,
        459
      ]
    ],
    [
      [
        289,
        459
      ],
      [
        629,
        476
      ]
    ],
    [
      [
        629,
        476
      ],
      [
        663,
        204
      ]
    ],
    [
      [
        663,
        204
      ],
      [
        629,
        85
      ]
    ],
    [
      [
        629,
        85
      ],
      [
        289,
        17
      ]
    ],
    [
      [
        544,
        153
      ],
      [
        289,
        102
      ]
    ],
    [
      [
        289,
        102
      ],
      [
        102,
        85
      ]
    ],
    [
      [
        102,
        85
      ],
      [
        102,
        136
      ]
    ],
    [
      [
        102,
        136
      ],
      [
        178.5,
        255
      ]
    ],
    [
      [
        178.5,
        255
      ],
      [
        161.5,
        391
      ]
    ],
    [
      [
        161.5,
        391
      ],
      [
        272,
        382.5
      ]
    ],
    [
      [
        272,
        382.5
      ],
      [
        544,
        391
      ]
    ],
    [
      [
        544,
        391
      ],
      [
        569.5,
        187
      ]
    ],
    [
      [
        569.5,
        187
      ],
      [
        544,
        153
      ]
    ]
  ]

let check_points = [
    [[550, 170], [650, 150]],
    [[540, 350], [660, 350]],
    [[430, 380], [430, 470]],
    [[220, 380], [220, 470]],
    [[60, 250], [180, 250]],
    [[140, 5], [140, 100]],
    [[400, 30], [400, 140]]
]

/*function scale(v, s) {return [v[0] * s, v[1] * s]}

for (let i = 0; i < map.length; i++) {
    map[i][0] = scale(map[i][0], 1.7);
    map[i][1] = scale(map[i][1], 1.7);
}*/

let frames = 0;

function update() {
    ctx.clearRect(0, 0, width, height);

    for (let c of cars) {
        c.think(map);

        if (c.collide(map)) {
            [c.x, c.y] = [c.sx, c.sy];
            c.n.pay(-5);
            c.score = 0
        }
        if (c.collide(check_points)) {
            c.n.pay(3);
            c.score += 3
        }

        c.n.pay(-0.1);
        c.score -= 0.1;
        
        c.draw();

        if (c.score < 0) {
            [c.x, c.y] = [c.sx, c.sy];
            c.score = 100;
        }
    }

    for (let i = 0; i < map.length; i++) {
        line(map[i][0][0], map[i][0][1], map[i][1][0], map[i][1][1], 'black', 0.5);
    }

    for (let i = 0; i < check_points.length; i++) {
        line(check_points[i][0][0], check_points[i][0][1], check_points[i][1][0], check_points[i][1][1], 'green', 1);
    }

    frames++;

    if (fast_learn && frames % 100 > 0) {
        update();
    }
    else {
        requestAnimationFrame(update);
    }
}

update();