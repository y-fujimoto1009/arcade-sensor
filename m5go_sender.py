# M5GO / UIFlow 1 / ToF Unit on Port A
# Run this program, then close UIFlow's USB connection before opening the web page.
from m5stack import *
from m5ui import *
from uiflow import *
import unit
import json

tof = unit.get(unit.TOF, unit.PORTA)
setScreenColor(0x173b50)
label = M5TextBox(20, 40, 'Arcade sensor', lcd.FONT_DejaVu24, 0xFFFFFF)
while True:
    try:
        distance = tof.distance
        print(json.dumps({'distance': distance}))
    except Exception:
        print('{"error":"tof"}')
    wait_ms(50)
