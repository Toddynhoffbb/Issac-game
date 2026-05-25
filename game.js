// Minimal mobile-friendly roguelike prototype (Phaser 3 + rex virtual joystick)
// Responsive, supports touch joystick (left) and fire button / pointer (right)

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update },
  plugins: {
    global: [{
      key: 'rexVirtualJoystick',
      plugin: rexvirtualjoystickplugin,
      start: true
    }]
  }
};
const game = new Phaser.Game(config);

function preload() {
  // placeholder sprites via CDN (small PNGs)
  this.load.image('player','https://i.imgur.com/4AiXzf8.png');
  this.load.image('bullet','https://i.imgur.com/WP2Qe0K.png');
  this.load.image('enemy','https://i.imgur.com/0rVeh4D.png');
  this.load.image('joystick_base','https://i.imgur.com/8wKQZQk.png');
  this.load.image('joystick_thumb','https://i.imgur.com/0KX2YkB.png');
  this.load.image('btn_fire','https://i.imgur.com/6XQw4.png');
}

let player, joystick, fireButton, bullets, lastShot = 0, enemies;

function create() {
  // player
  player = this.physics.add.sprite(400,300,'player').setScale(0.5).setCollideWorldBounds(true);

  // joystick (bottom-left)
  joystick = this.plugins.get('rexVirtualJoystick').add(this, {
    x: 100, y: this.scale.height - 100,
    radius: 60,
    base: this.add.image(0,0,'joystick_base').setAlpha(0.6),
    thumb: this.add.image(0,0,'joystick_thumb').setAlpha(0.9),
    dir: '8dir',
    forceMin: 8
  });
  joystick.setScrollFactor(0);

  // fire button (bottom-right)
  fireButton = this.add.image(this.scale.width - 90, this.scale.height - 90, 'btn_fire').setInteractive().setAlpha(0.95);
  fireButton.setScrollFactor(0);
  fireButton.on('pointerdown', (p)=> doFire.call(this, p));

  this.scale.on('resize', (gameSize) => {
    const { width, height } = gameSize;
    joystick.x = 100; joystick.y = height - 100;
    fireButton.x = width - 90; fireButton.y = height - 90;
  });

  // groups
  bullets = this.physics.add.group({ classType: Phaser.GameObjects.Image });
  enemies = this.physics.add.group();

  // spawn enemies
  for (let i=0;i<5;i++){
    let e = enemies.create(100 + i*120,100,'enemy').setScale(0.6).setCollideWorldBounds(true);
    e.hp = 2;
  }

  // collisions
  this.physics.add.overlap(bullets, enemies, (b,e) => {
    if (b && b.destroy) b.destroy();
    e.hp--;
    if (e.hp<=0) e.destroy();
  });
  this.physics.add.overlap(player, enemies, () => {
    // simple hit reaction: knockback and reset position
    player.setTint(0xff0000);
    this.time.delayedCall(200, ()=> player.clearTint());
    player.setPosition(this.scale.width/2, this.scale.height/2);
  });

  // keyboard
  this.keys = this.input.keyboard.addKeys('W,A,S,D,LEFT,RIGHT,UP,DOWN');

  // pointer to fire when tapping right side
  this.input.on('pointerdown', (p) => {
    if (p.x < this.scale.width/2) return;
    doFire.call(this, p);
  });
}

function update(time) {
  const speed = 220;

  // movement: joystick priority, else keyboard
  if (joystick.force > 0) {
    // rex joystick angle is degrees, 0 = right, clockwise
    const angleDeg = joystick.angle;
    this.physics.velocityFromAngle(angleDeg, joystick.force * 3, player.body.velocity);
  } else {
    let vx = 0, vy = 0;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) vx = -speed;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx = speed;
    if (this.keys.W.isDown || this.keys.UP.isDown) vy = -speed;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) vy = speed;
    player.setVelocity(vx, vy);
  }

  // enemies follow player
  enemies.getChildren().forEach(e => {
    if (e.active) this.physics.moveToObject(e, player, 80);
  });
}

function doFire(pointer) {
  const now = Date.now();
  if (now - lastShot < 180) return;
  lastShot = now;

  const targetX = pointer.worldX !== undefined ? pointer.worldX : pointer.x;
  const targetY = pointer.worldY !== undefined ? pointer.worldY : pointer.y;
  const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
  const b = bullets.create(player.x, player.y, 'bullet').setScale(0.28);
  this.physics.velocityFromRotation(angle, 520, b.body.velocity);
  this.time.delayedCall(1400, ()=> { if (b && b.destroy) b.destroy(); });
}
