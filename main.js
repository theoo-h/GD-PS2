import {GeometryPS2} from "./src/gd.js"

let pad = Pads.get();
let game = new GeometryPS2();

os.setInterval(() => {
    Screen.clear();
    pad.update();

    game.update(pad);

    Screen.flip();
}, 0)