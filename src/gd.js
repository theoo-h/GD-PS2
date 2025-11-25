export class GeometryPS2
{
    static TILE_TYPE = 0;

    // posicion en cordeneadas tiles (mundo)
    static TILE_POSICION_X = 1;
    static TILE_POSICION_Y = 2;

    // cordenadas en el spritesheet
    static TILE_TX = 3;
    static TILE_TY = 4;

    static TILE_SIZE = 40;

    static TBlock = 0;
    static TSpike = 0;

    constructor()
    {
        this.pen = { axis: 0, amt: 0.0, sign: 0 }; 

        this.bgTex = new Image("assets/basic.png", VRAM);
        this.bgTex.color = Color.new(10, 37, 123, 128);

        this.tilesTex = new Image("assets/tiles.png", VRAM);

        this.tiles = [];
    
        for (let i = 0; i < 8; i++)
        {
            let x = 20 + i * 3;

            for (let altura = 0; altura < i; altura++)
            {
                this.tiles.push(
                    [
                        GeometryPS2.TBlock,
                        x,
                        altura,
                        1,
                        0
                    ]
                );
            }

            this.tiles.push(
                [
                    GeometryPS2.TSpike,
                    x + 2,
                    0,
                    0,
                    0
                ]
            );  
        }
        
        // cordenadas DEL PIVOTE
        this.x = 100;
        this.y = 100;
        this.a = 0;
        this.r = 0;

        this.w = GeometryPS2.TILE_SIZE;
        this.h = GeometryPS2.TILE_SIZE;

        this.tr = Math.PI / 180;

        this.tap = false;
        this.holding = false;
        this.lastHolding = false;

        // componentes del gameplay
        this.gravity = 1;
        this.defBlockpSec = 10.3761348898;
        this.speed = this.defBlockpSec;

        this.jumpQueue = false;
        this.jumpQCount = 0.;
        this.desiredAngle = 0;
        this.ySpeed = 0.;

        this.groundY = 512 - 150;

        this.jumped = false;
        this.grounded = false;
        this.lastGrounded = false;

        this.scrollX = 0;
        this.factor = this.groundY / 256;

        this.canvas = Screen.getMode();

        this.speedValues = [
            // 0.5
            8.6,
            // 1
            10.4,
            // 2
            12.96,
            // 3
            15.6,
            // 4
            19.27
        ];
        this.speedMult = 1;
    }

    cubeLogic(elapsed)
    {
        const wd2 = this.w * .5;
        const hd2 = this.h * .5;

        if (this.holding)
        {
            this.jumpQueue = true;
            this.jumpQCount = 0.1;
        }

        if (this.jumpQCount < 0)
        {
            this.jumpQueue = false;
            this.jumpQCount = 0;
        } else {
            this.jumpQCount -= elapsed;
        }
        if(this.ySpeed < -24.2)
            this.ySpeed = -24.2;

        if (this.grounded)
        {
            if (this.desiredAngle == -1)
            {
                // division por 90
                this.desiredAngle = Math.round(this.a * 0.011) * 90;
            }

            this.a = this.lerp(this.a, this.desiredAngle, 0.4 * 60 * elapsed);

            if (this.jumpQueue)
            {
                this.ySpeed = -26.6581 * this.gravity * .75;

                this.jumped = true;
                this.grounded = false;

                this.desiredAngle = -1;
            }
        }
        else
        {
            this.a = (this.a + 452.4152186 * elapsed * this.gravity) % 360;
            this.ySpeed += 9.81 * elapsed * 10 * this.gravity;
        }

        this.y += this.ySpeed * 60 * elapsed;

        if (this.y > this.groundY - hd2)
        {
            this.y = this.groundY - hd2;
            this.onHitGround();
        }
    }

    lerp(a,b,t)
    {
        return b * t + a * (1 - t)
    }

    update(pads)
    {
        const curSpeed = this.speedValues[1 + this.speedMult];

        this.tap = false;

        this.holding = pads.pressed(Pads.CIRCLE);

        if (this.holding && this.holding != this.lastHolding)
            this.tap = true;
        
        this.lastHolding = this.holding;

        const delta = 0.0166;
        this.scrollX += 2 * this.speed * delta * curSpeed;

        this.cubeLogic(delta);
        this.handleCollisions();

        this.lastGrounded = this.grounded;

        // renderizar bg
        this.bgTex.startx = 0;
        this.bgTex.starty = 0;
        this.bgTex.endx = 256;
        this.bgTex.endy = 256;

        this.bgTex.width = 256 * this.factor * 2;
        this.bgTex.height = 256 * this.factor * 2;

        this.drawBackdrop(this.scrollX * 0.33, this.bgTex.width, 256 * -0.6);

        // renderizar piso
        this.bgTex.startx = 256;
        this.bgTex.starty = 0;
        this.bgTex.endx = 512;
        this.bgTex.endy = 256;

        this.bgTex.width = 256 * this.factor * 0.5;
        this.bgTex.height = 256 * this.factor * 0.5;

        this.drawBackdrop(this.scrollX, this.bgTex.width, this.groundY);

        this.renderCube();
        this.renderTiles();
    }

    drawBackdrop(cameraX, tileW, y = 0) {
        const screenW = this.canvas.width;

        let offsetX = (-cameraX % tileW);
        if (offsetX < 0) offsetX += tileW;

        const tilesNeeded = Math.ceil(screenW / tileW) + 2;

        let startX = offsetX - tileW;

        // lo siento we
        for (let i = 0; i < tilesNeeded; i++) {
            this.bgTex.draw(startX + i * tileW, y);
        }
    }

    // TODO: encontrar una manera de batchear todo esto
    renderTiles()
    {
        const tiles = this.tiles;
        const tex = this.tilesTex;

        for (let idx = 0; idx < tiles.length; idx++)
        {
            const tile = tiles[idx];

            const gridX = tile[GeometryPS2.TILE_POSICION_X];
            const gridY = tile[GeometryPS2.TILE_POSICION_Y];

            const tx = tile[GeometryPS2.TILE_TX];
            const ty = tile[GeometryPS2.TILE_TY];

            const posX = this.getTileScreenX(gridX);

            const posY = -GeometryPS2.TILE_SIZE + this.groundY - (gridY * GeometryPS2.TILE_SIZE);

            // 122 es cuanto mide cada tile en la imagenn
            tex.startx = tx * 122;
            tex.starty = ty * 122;
            tex.endx = (tx + 1) * 122;
            tex.endy = (ty + 1) * 122;

            tex.width = GeometryPS2.TILE_SIZE;
            tex.height = GeometryPS2.TILE_SIZE;

            if (posX > -GeometryPS2.TILE_SIZE && posX < this.canvas.width + GeometryPS2.TILE_SIZE)
            {
                tex.draw(posX, posY);
            }
        }
    }

    renderCube()
    {
        this.r = this.a * this.tr;
        const wd2 = this.w * .5;
        const hd2 = this.h * .5;

        // izquierda arriba
        const lu = this.rotateOrigin(-wd2, -hd2, this.r);
        // derecha arriba
        const ru = this.rotateOrigin(wd2, -hd2, this.r);

        // izquierda abajo
        const lb = this.rotateOrigin(-wd2, hd2, this.r);
        // derecha abajo
        const rb = this.rotateOrigin(wd2, hd2, this.r);

        const color = Color.new(128, 128, 128, 128);

        Draw.quad(
            this.x + lu[0], this.y + lu[1],
            this.x + ru[0], this.y + ru[1],
            this.x + lb[0], this.y + lb[1],
            this.x + rb[0], this.y + rb[1],
            color
        );
    }

    getTileScreenX(gridX)
    {
        return gridX * GeometryPS2.TILE_SIZE - this.scrollX;
    }

    rotateOrigin(x, y, a)
    {
        return [
            x * this.fCos(a) - y * this.fSin(a),
            x * this.fSin(a) + y * this.fCos(a),
        ];
    }

    fSin(n)
	{
		n *= 0.3183098862; // divide by pi to normalize

		// bound between -1 and 1
		if (n > 1)
		{
			n -= (Math.ceil(n) >> 1) << 1;
		}
		else if (n < -1)
		{
			n += (Math.ceil(-n) >> 1) << 1;
		}

		// this approx only works for -pi <= rads <= pi, but it's quite accurate in this region
		if (n > 0)
		{
			return n * (3.1 + n * (0.5 + n * (-7.2 + n * 3.6)));
		}
		else
		{
			return n * (3.1 - n * (0.5 + n * (7.2 + n * 3.6)));
		}
	}
    fCos(n)
	{
		return this.fSin(n + 1.570796327); // sin and cos are the same, offset by pi/2
	}

    onHitGround()
    {
        this.ySpeed = 0;
        this.grounded = true;
    }
    onDeath()
    {
        os.close(0);
    }
    handleCollisions()
    {
        const cx = this.x;
        const cy = this.y;
        const hw = this.w * 0.5;
        const hh = this.h * 0.5;

        const tileSize = GeometryPS2.TILE_SIZE;
        
        for (let i = 0; i < this.tiles.length; i++)
        {
            const t = this.tiles[i];

            const gx = t[GeometryPS2.TILE_POSICION_X];
            const gy = t[GeometryPS2.TILE_POSICION_Y];
            const tType = t[GeometryPS2.TILE_TYPE];

            const tx = gx * tileSize - this.scrollX + hw;
            const ty = this.groundY - ((gy + 1) * tileSize) + hh; 

            const dx = tx - cx;
            const px = (tileSize - Math.abs(dx));
            if (px <= 0) continue;

            const dy = ty - cy;
            const py = (tileSize - Math.abs(dy));
            if (py <= 0) continue;

            const sideX = (dx < 0) ? -1 : 1;
            const sideY = (dy < 0) ? -1 : 1;

            // 1 = left, 2 = right, 3 = top, 4 = bottom
            let hitSide = 0; 

            if (px < py)
                hitSide = (sideX < 0) ? 1 : 2;
            else
                hitSide = (sideY < 0) ? 4 : 3;

            if (tType == GeometryPS2.TBlock)
            {
                if (hitSide == 3)
                {
                    // separacion y (no necesitamos separar x)
                    this.y -= sideY * py;

                    this.onHitGround();
                }
                else
                    this.onDeath();
            }
            if (tType == GeometryPS2.TSpike)
                this.onDeath();

            console.log(tType.toString() + ', ' + hitSide.toString());
        }
    }

    checkAABB_FAST(cx1, cy1, hx1, hy1, cx2, cy2, hx2, hy2, out)
    {
        // dx,dy between centers
        let dx = cx2 - cx1;
        let adx = dx < 0 ? -dx : dx;

        let px = (hx1 + hx2) - adx;
        if (px <= 0) { out.axis = 0; return; }

        let dy = cy2 - cy1;
        let ady = dy < 0 ? -dy : dy;

        let py = (hy1 + hy2) - ady;
        if (py <= 0) { out.axis = 0; return; }

        // choose smallest penetration
        if (px < py) {
            out.axis = 1;              // X
            out.amt  = px;
            out.sign = dx < 0 ? -1 : 1;
        } 
        else {
            out.axis = 2;              // Y
            out.amt  = py;
            out.sign = dy < 0 ? -1 : 1;
        }
    }
}