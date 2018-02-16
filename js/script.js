const canvas = document.querySelector('#particles');
const ctx = canvas.getContext('2d');
const particles = [];
const gravityTargets = [];

const getRandomFromRange = (range) => {
  if(range[0] > range[1])
    throw new Error("Range error: The start of the range cannot exceed the end of the range");
  else 
    return Math.random()*(range[1] - range[0]) + range[0];
};

const getRandomSign = () => Math.sign(getRandomFromRange([-1,1]));

const getDistance = (point1, point2) => Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));

const getVectorLength = (vector) => getDistance(vector, {x:0,y:0});

const getSecondCoordinate = (firstCoord, length) => Math.sqrt(Math.pow(length,2) - Math.pow(firstCoord,2));

const getRandomColor = () => (
  {r: Math.floor(Math.random()*255),
    g: Math.floor(Math.random()*255),
    b: Math.floor(Math.random()*255)}
);

const getRGBA = (obj, opacity) => 'rgba('+obj.r+','+obj.g+','+obj.b+','+opacity+')';

const compareColorObjects = (obj1, obj2) => obj1.r == obj2.r && obj1.g == obj2.g && obj1.b == obj2.b; 

const connect = (startPoint, endPoint, maxLength) => {
  let distance = getDistance(startPoint, endPoint);
  if(distance <= maxLength) {
    let opacity = 1 - distance/maxLength;

    let color;
    if(compareColorObjects(startPoint.color, endPoint.color))
      color = getRGBA(startPoint.color, opacity);
    else {
      color = ctx.createLinearGradient(startPoint.x,startPoint.y,endPoint.x,endPoint.y);
      color.addColorStop(0, getRGBA(startPoint.color, opacity));
      color.addColorStop(1, getRGBA(endPoint.color, opacity));
    }

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
  }
}

class Point {
  constructor(x, y, opt) {
    this.x = x;
    this.y = y;
    this.vel = {x: 0, y: 0};
    this.acc = {x: 0, y: 0};
    this.opacity = opt.opacity || 1;
    
    if('size' in opt) {
      if(Array.isArray(opt.size)) 
        this.size = getRandomFromRange(opt.size);
      else if(opt.size >= 0)
        this.size = opt.size;
      else 
        throw new Error("Size error: Size cannot be negative number");
    }
    else 
      this.size = 1;
    
    if('color' in opt) {
      if(opt.color == 'random')
        this.color = getRandomColor();
      else {
        if('r' in opt.color && 'g' in opt.color && 'b' in opt.color)
          this.color = opt.color;
        else
          throw new Error('Particles color error: There are no values for all RGB channels');
      }
    }
    else
      this.color = {r:255,g:255,b:255};
  }

  setVelocity() {
    if('speed' in options.particles) {
      let startSpeed = Array.isArray(options.particles.speed.start) ?
        getRandomFromRange(options.particles.speed.start) :
        options.particles.speed.start;
      
      this.vel.x = startSpeed*getRandomFromRange([-1,1]);
      this.vel.y = getRandomSign()*getSecondCoordinate(this.vel.x, startSpeed);
    }
  }
  
  setAccelerate(targets) {
    this.acc.x = ('gravity' in options.canvas) ? options.canvas.gravity.x : 0;
    this.acc.y = ('gravity' in options.canvas) ? options.canvas.gravity.y : 0;
    
    targets.forEach((target) => {
      let distance = getDistance(this, target);
      if(distance < target.captureRadius || target.captureRadius == 'all') {
        this.acc.x += target.gravity*(target.x - this.x)/distance;
        this.acc.y += target.gravity*(target.y - this.y)/distance;
      }
    });
  }
  
  getVelocity() {
    return getVectorLength(this.vel);
  }
  
  getAccelerate() {
    return getVectorLength(this.acc);
  }

  render() {
    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    
    let speed = this.getVelocity();
    if('max' in options.particles.speed)
      if(speed > options.particles.speed.max) {
        this.vel.x *= ('spaceDensity' in options.canvas) ? 1 - options.canvas.spaceDensity : .995;
        this.vel.y *= ('spaceDensity' in options.canvas) ? 1 - options.canvas.spaceDensity : .995;
      }
    
    if('min' in options.particles.speed)
      if(speed < options.particles.speed.min) {
        this.vel.x *= ('spaceDensity' in options.canvas) ? 1 + options.canvas.spaceDensity : 1.005;
        this.vel.y *= ('spaceDensity' in options.canvas) ? 1 + options.canvas.spaceDensity : 1.005;
      }
    
    this.x += this.vel.x;
    this.y += this.vel.y;

    if(options.canvas.borders.top && this.y < this.size) {
      this.y = this.size;
      this.vel.y *= -options.particles.elasticity || -1;
    };
    if(options.canvas.borders.bottom && this.y > canvas.height - this.size) {
      this.y = canvas.height - this.size;
      this.vel.y *= -options.particles.elasticity || -1;
    };
    if(options.canvas.borders.left && this.x < this.size) {
      this.x = this.size;
      this.vel.x *= -options.particles.elasticity || -1;
    };
    if(options.canvas.borders.right && this.x > canvas.width - this.size) {
      this.x = canvas.width - this.size;
      this.vel.x *= -options.particles.elasticity || -1;
    };
    
    if(cursor.active) {
      let distanceToCursor = getDistance(this, cursor);
      this.opacity = (options.particles.opacity == 1 || !('opacity' in options.particles)) ? 1 :
        1 - (1 - options.particles.opacity) * distanceToCursor/cursor.captureRadius;
    }
    
    ctx.fillStyle = getRGBA(this.color, this.opacity);
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.size,0,Math.PI*2,false);
    ctx.fill();
  }
}

class GravityPoint extends Point {
  constructor(x, y, opt) {
    super(x, y, opt);
    
    this.captureRadius = opt.captureRadius || 'all';
    this.linesRadius = opt.linesRadius || 0;
    this.gravity = opt.gravity || 0;
  }
}

function update() {
  let BGopacity = 'trailing' in options.canvas ? (1 - options.canvas.trailing) : 1;
  ctx.fillStyle = getRGBA(options.canvas.color, BGopacity);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach((particle, i) => {
    particle.render();      

    let distance = getDistance(cursor, particle);
    let targets = [];

    if(cursor.active) {
      targets.push(cursor);
      connect(cursor, particle, cursor.linesRadius);
    }

    if(options.particles.linesRadius)
      particles.forEach((siblParticle, j) => {
        if(i < j)
          connect(particle, siblParticle, options.particles.linesRadius);
      });

    gravityTargets.forEach((target) => connect(particle, target, target.linesRadius));
  
    particle.setAccelerate(gravityTargets.concat(targets));
  });
  
  if(cursor.active) cursor.render();
  gravityTargets.forEach((target) => target.render());
  
  window.requestAnimationFrame(update);
}

canvas.onmousemove = function(e) {
  cursor.x = e.pageX + canvas.offsetLeft;
  cursor.y = e.pageY + canvas.offsetTop;
  cursor.active = true;
}

canvas.onclick = function(e) {
  let gravityPoint = new GravityPoint(e.pageX + canvas.offsetLeft, e.pageY + canvas.offsetTop, options.gravityPoints);
  gravityTargets.push(gravityPoint);
}

canvas.ontouchstart = function(e) {
  let gravityPoint = new GravityPoint(e.touches[0].clientX + canvas.offsetLeft, e.touches[0].clientY + canvas.offsetTop, options.gravityPoints);
  gravityTargets.push(gravityPoint);
}
 
canvas.ontouchstart = canvas.ontouchmove = function(e) {
  cursor.x = e.touches[0].clientX + canvas.offsetLeft;
  cursor.y = e.touches[0].clientY + canvas.offsetTop;
  cursor.active = true;
}

canvas.onmouseout = canvas.ontouchend = () => cursor.active = false;

//main
canvas.width = options.canvas.width || window.innerWidth;
canvas.height = options.canvas.height || window.innerHeight;

if(options.canvas.color) {
  if('r' in options.canvas.color && 'g' in options.canvas.color && 'b' in options.canvas.color)
    canvas.style.backgroundColor = getRGBA(options.canvas.color, 1);
  else
    throw new Error('Canvas color error: There are no values for all RGB channels');
}
else {
  canvas.style.backgroundColor = '#000';
  options.canvas.color = {r:0,g:0,b:0};
}

const cursor = new GravityPoint(null, null, options.cursor);
cursor.active = false;

if(options.particles.count > 0) {
  for(let i = 0; i < options.particles.count; i++) {
    let point = new Point(Math.floor(Math.random()*canvas.width),Math.floor(Math.random()*canvas.height), options.particles);
    if(options.particles.speed.start) point.setVelocity();
    particles.push(point);
  }
}

window.requestAnimationFrame(update);