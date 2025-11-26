/**
 * ruber tranquilo, mas tarde usare terser para obfuscar todo el codigo XDD
 * 
 * TODO: HAYAR UNA MANERA DE BATCHEAR, Y SI NO LO HAY, HACER UNA PR AL ATHENA PARA AGREGARLO PORQUE SI O -1000 FPS EN NIVELES COMPLETOS
 */

export class GeometryPS2 {
  static TILE_TYPE = 0

  // posicion en cordeneadas tiles (mundo)
  static TILE_POSICION_X = 1
  static TILE_POSICION_Y = 2

  // cordenadas en el spritesheet
  static TILE_IND = 3

  static TILE_SIZE = 48

  // tipos de entidades tiles
  static HCube = 0
  static HSpike = 1
  static HShortSpike = 2

  // indices de textura
  static TexSpike = 0
  static TexCube = 1
  static TexShortSpike = 2

  static TexCube0 = 3

  constructor () {
    this.bgTex = new Image('assets/basic.png', VRAM)

    this.bgColor = Color.new(20, 31, 128, 128)
    this.groundColor = Color.new(0, 9, 100, 128)
    this.whiteColor = Color.new(128, 128, 128, 128)

    this.tilesPerRow = this.bgTex.width / 122
    this.rowDiv = 1 / this.tilesPerRow

    this.tilesTex = new Image('assets/tiles.png', VRAM)

    this.tiles = []

    this.buildLevel()

    // cordenadas DEL PIVOTE
    this.x = 100
    this.y = 100
    this.a = 0
    this.r = 0

    this.w = GeometryPS2.TILE_SIZE
    this.h = GeometryPS2.TILE_SIZE

    this.tr = Math.PI / 180

    this.tap = false
    this.holding = false
    this.lastHolding = false

    // componentes del gameplay
    this.gravity = 1
    this.defBlockpSec = 10.3761348898
    this.speed = this.defBlockpSec

    this.jumpQueue = false
    this.jumpQCount = 0
    this.desiredAngle = 0
    this.ySpeed = 0

    this.groundY = 512 - 150

    this.jumped = false
    this.grounded = false
    this.lastGrounded = false
    this.clipAngle = false
    this.death = false

    this.scrollX = 0
    this.factor = this.groundY / 256

    this.canvas = Screen.getMode()
    this.font = new Font('default')

    this.speedMult = 1

    this.renderHitboxes = true

    // cachear hitboxes
    const ancho = GeometryPS2.TILE_SIZE * 0.15
    const alto = GeometryPS2.TILE_SIZE * 0.4

    this.hb_spike = this.aabb_make(
      (GeometryPS2.TILE_SIZE - ancho) * 0.5,
      (GeometryPS2.TILE_SIZE - alto) * 0.5,
      ancho,
      alto,
      true
    )

    const ancho1 = GeometryPS2.TILE_SIZE * 0.25
    const alto1 = GeometryPS2.TILE_SIZE * 0.2

    this.hb_short_spike = this.aabb_make(
      (GeometryPS2.TILE_SIZE - ancho1) * 0.5,
      (GeometryPS2.TILE_SIZE - alto1) * 0.8,
      ancho1,
      alto1,
      true
    )

    this.hb_block = this.aabb_make(
      0,
      0,
      GeometryPS2.TILE_SIZE,
      GeometryPS2.TILE_SIZE,
      true
    )

    const area = GeometryPS2.TILE_SIZE * 0.25
    this.hb_cdmg = this.aabb_make(
      (GeometryPS2.TILE_SIZE - area) * 0.5,
      (GeometryPS2.TILE_SIZE - area) * 0.5,
      area,
      area,
      false
    )

    this.hb_cube = this.aabb_make(
      0,
      0,
      GeometryPS2.TILE_SIZE,
      GeometryPS2.TILE_SIZE,
      false
    )
  }

  buildLevel () {
    this.tiles.push([GeometryPS2.HSpike, 10, 0, GeometryPS2.TexSpike])
    this.tiles.push([GeometryPS2.HShortSpike, 11, 0, GeometryPS2.TexShortSpike])
    this.tiles.push([GeometryPS2.HShortSpike, 12, 0, GeometryPS2.TexShortSpike])
  }

  cubeLogic (elapsed) {
    const wd2 = this.w * 0.5
    const hd2 = this.h * 0.5

    // cuando holdea, haze un timer, para que si sueltas un poco antes de caer a una superficie, salte otra vez
    if (this.holding) {
      this.jumpQueue = true
      this.jumpQCount = 0.1
    }

    if (this.jumpQCount < 0) {
      this.jumpQueue = false
      this.jumpQCount = 0
    } else {
      this.jumpQCount -= elapsed
    }

    // limita la velocidad
    if (this.ySpeed < -24.2) this.ySpeed = -24.2

    if (this.grounded) {
      if (this.clipAngle) {
        // division por 90
        this.desiredAngle = Math.round(this.a * 0.011) * 90
        this.clipAngle = false
      }

      this.a = this.lerp(this.a, this.desiredAngle, 0.4 * 60 * elapsed)

      if (this.jumpQueue) {
        this.ySpeed = -26.6581 * this.gravity * 0.75

        this.jumped = true
        this.grounded = false

        this.clipAngle = true
      }
    } else {
      this.a = this.a + 452.4152186 * elapsed * this.gravity
    }
    this.ySpeed += 9.81 * elapsed * 10 * this.gravity

    this.y += this.ySpeed * 60 * elapsed

    this.grounded = false
    if (this.y > this.groundY - hd2) {
      this.y = this.groundY - hd2
      this.onHitGround()
    }

    this.lastGrounded = this.grounded
  }

  lerp (a, b, t) {
    return b * t + a * (1 - t)
  }

  update (pads) {
    if (!this.death) {
      // const curSpeed = this.speedValues[1 + this.speedMult];
      const curSpeed = 20.7 * this.speedMult

      this.tap = false

      this.holding = pads.pressed(Pads.CIRCLE)

      if (this.holding && this.holding != this.lastHolding) this.tap = true

      this.lastHolding = this.holding

      const delta = 0.0166
      this.scrollX += 2.5 * this.speed * delta * curSpeed

      this.handleCollisions()
      this.cubeLogic(delta)
    }

    this.lastGrounded = this.grounded

    // renderizar bg
    this.bgTex.startx = 0
    this.bgTex.starty = 0
    this.bgTex.endx = 256
    this.bgTex.endy = 256

    this.bgTex.width = 256 * this.factor * 2
    this.bgTex.height = 256 * this.factor * 2
    this.bgTex.color = this.bgColor

    this.drawBackdrop(this.scrollX * 0.2, this.bgTex.width, 256 * -0.6)

    // renderizar piso
    this.bgTex.startx = 256
    this.bgTex.starty = 0
    this.bgTex.endx = 512
    this.bgTex.endy = 256

    this.bgTex.width = 256 * this.factor * 0.5
    this.bgTex.height = 256 * this.factor * 0.5
    this.bgTex.color = this.groundColor

    this.drawBackdrop(this.scrollX, this.bgTex.width, this.groundY)

    this.renderCube()
    this.renderTiles()

    if (this.renderHitboxes) this.renderCollisions()

    this.font.print(0, 0, 'Grounded: ' + this.grounded)
    this.font.print(0, 30, 'Angulo: ' + Math.round(this.a))

    if (this.death) {
      const size = this.font.getTextSize('perdiste pendejo')

      Draw.rect(0, 0, 640, 512, Color.new(0, 0, 0, 64))
      this.font.print(
        320 - size.width * 0.5,
        256 - size.height * 0.5,
        'perdiste pendejo'
      )
    }
  }

  drawBackdrop (cameraX, tileW, y = 0) {
    const screenW = this.canvas.width

    let offsetX = -cameraX % tileW
    if (offsetX < 0) offsetX += tileW

    const tilesNeeded = Math.ceil(screenW / tileW) + 2

    let startX = offsetX - tileW

    // lo siento we
    for (let i = 0; i < tilesNeeded; i++) this.bgTex.draw(startX + i * tileW, y)
  }

  // TODO: encontrar una manera de batchear todo esto
  renderTiles () {
    const tiles = this.tiles
    const tex = this.tilesTex

    for (let idx = 0; idx < tiles.length; idx++) {
      const tile = tiles[idx]

      const gridX = tile[GeometryPS2.TILE_POSICION_X]
      const gridY = tile[GeometryPS2.TILE_POSICION_Y]

      const tp = tile[GeometryPS2.TILE_IND]
      const tx = tp % this.tilesPerRow
      const ty = Math.floor(tp * this.rowDiv)

      const posX = this.getTileScreenX(gridX)

      const posY =
        -GeometryPS2.TILE_SIZE + this.groundY - gridY * GeometryPS2.TILE_SIZE

      // 122 es cuanto mide cada tile en la imagenn
      tex.startx = tx * 122
      tex.starty = ty * 122
      tex.endx = (tx + 1) * 122
      tex.endy = (ty + 1) * 122

      tex.width = GeometryPS2.TILE_SIZE
      tex.height = GeometryPS2.TILE_SIZE

      if (
        posX > -GeometryPS2.TILE_SIZE &&
        posX < this.canvas.width + GeometryPS2.TILE_SIZE
      )
        tex.draw(posX, posY)
    }
  }

  renderCube () {
    this.r = this.a * this.tr
    const wd2 = this.w * 0.5
    const hd2 = this.h * 0.5

    // izquierda arriba
    const lu = this.rotateOrigin(-wd2, -hd2, this.r)
    // derecha arriba
    const ru = this.rotateOrigin(wd2, -hd2, this.r)

    // izquierda abajo
    const lb = this.rotateOrigin(-wd2, hd2, this.r)
    // derecha abajo
    const rb = this.rotateOrigin(wd2, hd2, this.r)

    const color = Color.new(128, 128, 128, 128)

    Draw.quad(
      this.x + lu[0],
      this.y + lu[1],
      this.x + ru[0],
      this.y + ru[1],
      this.x + lb[0],
      this.y + lb[1],
      this.x + rb[0],
      this.y + rb[1],
      color
    )
  }

  getTileScreenX (gridX) {
    return gridX * GeometryPS2.TILE_SIZE - this.scrollX
  }

  getTileScreenY (gridY) {
    return this.groundY - (gridY + 1) * GeometryPS2.TILE_SIZE
  }

  rotateOrigin (x, y, a) {
    return [
      x * this.fCos(a) - y * this.fSin(a),
      x * this.fSin(a) + y * this.fCos(a)
    ]
  }

  fSin (n) {
    n *= 0.3183098862 // divide by pi to normalize

    // bound between -1 and 1
    if (n > 1) {
      n -= (Math.ceil(n) >> 1) << 1
    } else if (n < -1) {
      n += (Math.ceil(-n) >> 1) << 1
    }

    // this approx only works for -pi <= rads <= pi, but it's quite accurate in this region
    if (n > 0) {
      return n * (3.1 + n * (0.5 + n * (-7.2 + n * 3.6)))
    } else {
      return n * (3.1 - n * (0.5 + n * (7.2 + n * 3.6)))
    }
  }
  fCos (n) {
    return this.fSin(n + 1.570796327) // sin and cos are the same, offset by pi/2
  }

  onHitGround () {
    this.ySpeed = 0
    this.grounded = true
    this.clipAngle = true
  }
  onDeath () {
    this.death = true
  }
  handleCollisions () {
    const chw = this.w * 0.5
    const chh = this.h * 0.5

    const tWidth = GeometryPS2.TILE_SIZE

    const hb_spike = this.hb_spike
    const hb_short_spike = this.hb_short_spike
    const hb_block = this.hb_block

    const hb_cube = this.hb_cube
    const hb_cdmg = this.hb_cdmg

    // hitbox regular
    hb_cube.x0 = hb_cube.x
    hb_cube.y0 = hb_cube.y

    hb_cube.x += this.x - chw
    hb_cube.y += this.y - chh

    // hitbox de daño
    hb_cdmg.x0 = hb_cdmg.x
    hb_cdmg.y0 = hb_cdmg.y

    hb_cdmg.x += this.x - chw
    hb_cdmg.y += this.y - chh

    for (let i = 0; i < this.tiles.length; i++) {
      if (this.death) break

      const t = this.tiles[i]

      const tileType = t[GeometryPS2.TILE_TYPE]
      const tileX = this.getTileScreenX(t[GeometryPS2.TILE_POSICION_X])
      const tileY = this.getTileScreenY(t[GeometryPS2.TILE_POSICION_Y])

      if (tileType == GeometryPS2.HSpike) {
        hb_spike.x += tileX
        hb_spike.y += tileY

        // logica de daño
        if (this.aabb_check(hb_cube, hb_spike)) this.onDeath()

        hb_spike.x -= tileX
        hb_spike.y -= tileY
        continue
      } else if (tileType == GeometryPS2.HShortSpike) {
        hb_short_spike.x += tileX
        hb_short_spike.y += tileY

        // logica de daño
        if (this.aabb_check(hb_cube, hb_short_spike)) this.onDeath()

        hb_short_spike.x -= tileX
        hb_short_spike.y -= tileY
        continue
      }

      // todos los que no se mensionan, hacen fallback a colision de cubo
      hb_block.x += tileX
      hb_block.y += tileY

      // logica de daño
      if (this.aabb_check(hb_cdmg, hb_block)) this.onDeath()

      // logica de colision
      if (this.aabb_check(hb_cube, hb_block)) {
        const res = this.aabb_separate(hb_cube, hb_block)

        if (res.fromTop && res.oy > 0) {
          this.y -= res.oy
          this.onHitGround()
        }
      }

      hb_block.x -= tileX
      hb_block.y -= tileY
    }

    // hitbox regular
    hb_cube.x = hb_cube.x0
    hb_cube.y = hb_cube.y0

    // hitbox de dño
    hb_cdmg.x = hb_cdmg.x0
    hb_cdmg.y = hb_cdmg.y0
  }

  renderCollisions () {
    const cx = this.x
    const cy = this.y
    const chw = this.w * 0.5
    const chh = this.h * 0.5

    const tWidth = GeometryPS2.TILE_SIZE

    const hb_spike = this.hb_spike
    const hb_block = this.hb_block
    const hb_short_spike = this.hb_short_spike
    const hb_cube = this.hb_cdmg

    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i]

      const tileType = t[GeometryPS2.TILE_TYPE]
      const tileX = this.getTileScreenX(t[GeometryPS2.TILE_POSICION_X])
      const tileY = this.getTileScreenY(t[GeometryPS2.TILE_POSICION_Y])

      if (tileType == GeometryPS2.HSpike) {
        hb_spike.x += tileX
        hb_spike.y += tileY

        // Draw.rect(hb_spike.x, hb_spike.y, hb_spike.width, hb_spike.height, Color.new(128, 0, 0, 64));
        this.drawOutline(
          hb_spike.x,
          hb_spike.y,
          hb_spike.width,
          hb_spike.height,
          Color.new(128, 0, 0, 128)
        )

        hb_spike.x -= tileX
        hb_spike.y -= tileY
      } else if (tileType == GeometryPS2.HCube) {
        hb_block.x += tileX
        hb_block.y += tileY

        this.drawOutline(
          hb_block.x,
          hb_block.y,
          hb_block.width,
          hb_block.height,
          Color.new(128, 0, 0, 128)
        )

        hb_block.x -= tileX
        hb_block.y -= tileY
      } else if (tileType == GeometryPS2.HShortSpike) {
        hb_short_spike.x += tileX
        hb_short_spike.y += tileY

        this.drawOutline(
          hb_short_spike.x,
          hb_short_spike.y,
          hb_short_spike.width,
          hb_short_spike.height,
          Color.new(128, 0, 0, 128)
        )

        hb_short_spike.x -= tileX
        hb_short_spike.y -= tileY
      }
    }

    if (this.renderHitboxes) {
      hb_cube.x += this.x - chw
      hb_cube.y += this.y - chh

      this.drawOutline(
        hb_cube.x,
        hb_cube.y,
        hb_cube.width,
        hb_cube.height,
        Color.new(128, 0, 128, 128)
      )

      hb_cube.x -= this.x - chw
      hb_cube.y -= this.y - chh
    }
  }

  // collisions
  aabb_make (x, y, w, h, i) {
    return {
      x: x,
      y: y,
      width: w,
      height: h,
      solid: i
    }
  }
  aabb_check (a, b) {
    return !(
      a.x + a.width <= b.x ||
      a.x >= b.x + b.width ||
      a.y + a.height <= b.y ||
      a.y >= b.y + b.height
    )
  }

  aabb_separate (a, b) {
    const ax2 = a.x + a.width
    const ay2 = a.y + a.height
    const bx2 = b.x + b.width
    const by2 = b.y + b.height

    let overlapX = ax2 - b.x < bx2 - a.x ? ax2 - b.x : -(bx2 - a.x)
    let overlapY = ay2 - b.y < by2 - a.y ? ay2 - b.y : -(by2 - a.y)

    const fromLeft = overlapX > 0
    const fromRight = overlapX < 0
    const fromTop = overlapY > 0
    const fromBottom = overlapY < 0

    let ox = 0,
      oy = 0

    if (Math.abs(overlapX) < Math.abs(overlapY)) {
      ox = overlapX
    } else {
      oy = overlapY
    }

    return { ox, oy, fromLeft, fromRight, fromTop, fromBottom }
  }

  drawOutline (x, y, w, h, color) {
    // linea izquierda
    Draw.line(x, y, x, y + h, color)
    // linea derecha
    Draw.line(x + w, y, x + w, y + h, color)

    // linea superior
    Draw.line(x, y, x + w, y, color)
    // linea inferior
    Draw.line(x, y + h, x + w, y + h, color)
  }
}
