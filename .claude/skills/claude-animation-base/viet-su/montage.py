import sys
from PIL import Image
ids=sys.argv[1:]
ims=[Image.open(f'out/check/s{i}.jpg') for i in ids]
m=Image.new('RGB',(max(i.width for i in ims),sum(i.height for i in ims)),'white'); y=0
for i in ims: m.paste(i,(0,y)); y+=i.height
m.save('out/check/montage.jpg',quality=85); print(m.size)
