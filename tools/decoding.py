# codigo sacado de aca: https://wyliemaster.github.io/gddocs/#/topics/levelstring_encoding_decoding

import base64
import zlib
import os

file = "1.txt";

def decode_level(level_data: str, is_official_level: bool) -> str:
    if is_official_level:
        level_data = 'H4sIAAAAAAAAA' + level_data
    base64_decoded = base64.urlsafe_b64decode(level_data.encode())
    # window_bits = 15 | 32 will autodetect gzip or not
    decompressed = zlib.decompress(base64_decoded, 15 | 32)
    return decompressed.decode()

if __name__ == "__main__":
    with open(os.path.join(os.getcwd(), f'tools\\in\\{file}')) as r:
        with open(os.path.join(os.getcwd(), f'tools\\out\\{file}'), "w") as f:
            # es oficial pero si le pongo que si se va medio a cagar todo
            f.write(decode_level(r.read(), False))