s=open('src_v2_l4.html').read()
# CSS
css=open('l59.css').read()
assert s.count('</style>')==1
s=s.replace('</style>', css+'</style>')
# nav
nav={5:('USB 与电池自动切换','Q1 + D1'),6:('3.3V 稳压与去耦','LDO、两颗电容'),7:('ESP32 最小系统','复位、BOOT、ADC'),8:('H 桥电机驱动','DRV8833、PWM、限流'),9:('串起来','从摇杆到螺旋桨')}
for n,(a,b) in nav.items():
    old=f'<div class="lsn todo"><b>{n}</b><span>{a}<small>{b}</small></span></div>'
    assert s.count(old)==1, old
    s=s.replace(old,f'<a class="lsn ready" href="#l{n}"><b>{n}</b><span>{a}<small>{b}</small></span></a>')
# lessons html + replace NEXT section
i=s.find('<section class="sec" aria-label="后面的课">'); j=s.find('</section>',i)+len('</section>')
assert i>0
foot=open('l56.html').read()+open('l7.html').read()+open('l8.html').read()+open('l9.html').read()
foot+='''
<section class="sec done-foot" aria-label="课程结束">
  <p class="foot">全部十课到此结束。原理图版本 Rev A（2026-10-13）。课里提到的位号、网络名都和下单用的 BOM、PCB 一致。</p>
</section>
'''
s=s[:i]+foot+s[j:]
# JS
k=s.rfind('</script>')
tail=s[:k].rstrip()
assert tail.endswith('})();'), tail[-40:]
tail=tail[:-len('})();')]+'window.C = { el, flow, tickers, pressOne, RM };\nwindow.RM = RM;\n})();\n'
js=''.join(open(f).read() for f in ['l56.js','l7.js','l8.js','l9.js'])
s=tail+js+'\n'+s[k:]
open('src.html','w').write(s)
t=s.replace('<!--__SCHEMATIC__-->', open('../../hardware/pcb/schematic.svg').read()).replace('/*__DATA__*/', open('data.json').read())
open('qb12-circuit-course.html','w').write(t)
print(len(t))
