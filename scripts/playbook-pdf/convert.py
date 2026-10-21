#!/usr/bin/env python3
"""
Turn the coach's "2x2 - Attack System - Plays.pdf" into playbook data.

Steps (macOS, needs the Swift toolchain that ships with Xcode command line tools):
  1. swiftc -O extract.swift -o extract
  2. ./extract "<path to the PDF>" <vec-folder>       (writes v01.json ... one file per page)
  3. PB_VEC=<vec-folder> PB_OUT=playbook_final.json python3 convert.py
  4. Format playbook_final.json into src/data/playbook.json (one route per line).

The PAGE table below says which page and play number holds each play and what the play is called.
Only the top diagram of each pair is used (the bottom one is its mirror image). Route names are guessed from
the route's shape, with OVERRIDE for the ones that were checked by eye against the PDF.
Run game and play-action pages are left out (they need ball carriers and a moving quarterback).
"""
import json, math, re, sys, os
SCR=os.environ.get('PB_VEC','vec')   # folder holding v01.json ... (from extract.swift)
PT=14.54  # points per yard (5-yard gridlines are 72.7 pt apart)
def col(c): return tuple(round(x,2) for x in c)
ROUTE_COLORS={(0,0.45,0.42):'teal',(0.98,0.27,0.09):'orange',(0.3,0.3,0.3):'dark',(0.01,0.45,0.81):'blue',(0.88,0.77,0.0):'yellow',(0.9,0.0,0.0):'red'}
QB=(0.9,0.0,0.0)
def bbox(sp):
    xs=[p[0] for p in sp]; ys=[p[1] for p in sp]; return min(xs),max(xs),min(ys),max(ys)
def dist(a,b): return math.hypot(a[0]-b[0],a[1]-b[1])
def dp(pts,tol):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]; dmax,idx=0,0
    for i in range(1,len(pts)-1):
        p=pts[i]; l=dist(a,b)
        d=abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/l if l else dist(a,p)
        if d>dmax: dmax,idx=d,i
    if dmax>tol: return dp(pts[:idx+1],tol)[:-1]+dp(pts[idx:],tol)
    return [a,b]

def analyze_panel(recs, ymin, ymax):
    players=[]; segs=[]; arrows=[]
    for r in recs:
        if r['op'] not in ('S','B'): continue
        c=col(r['stroke'])
        if c not in ROUTE_COLORS: continue
        for sp in r['sub']:
            x0,x1,y0,y1=bbox(sp); cy=(y0+y1)/2
            if not (ymin<=cy<=ymax): continue
            n=len(sp); w=x1-x0; h=y1-y0
            if n>=200 and 24<w<30 and 24<h<30: players.append({'kind':'circle','c':((x0+x1)/2,(y0+y1)/2),'color':ROUTE_COLORS[c]}); continue
            if n==5 and 24<w<30 and 24<h<30: players.append({'kind':'square','c':((x0+x1)/2,(y0+y1)/2),'color':ROUTE_COLORS[c]}); continue
            if n==3 and w<17 and h<17: arrows.append(sp); continue
            segs.append({'pts':sp,'color':ROUTE_COLORS[c]})
    # the quarterback is the red circle well behind the line; receivers sit within ~4 yards of it
    sq=[p for p in players if p['kind']=='square']
    if sq:
        losy=sq[0]['c'][1]
        players=[p for p in players if not (p['color']=='red' and p['kind']=='circle' and abs(p['c'][1]-losy)>4*PT)]
        segs=[s for s in segs if not (s['color']=='red' and min(q[1] for q in s['pts'])<losy-3.5*PT and max(q[1] for q in s['pts'])<losy+PT and any(abs(q[0]-306)<30 and q[1]<losy-3*PT for q in s['pts']) and False)]
    players.sort(key=lambda p:(round(p['c'][0]/3),-p['c'][1]))
    return players,segs,arrows

def chain(player,segs,tol=1.2):
    cur=player['c']; used=set(); pts=[cur]; ncur=0
    while True:
        found=None
        for i,s in enumerate(segs):
            if i in used: continue
            p=s['pts']
            if dist(p[0],cur)<tol: found=(i,p); break
            if dist(p[-1],cur)<tol: found=(i,p[::-1]); break
        if not found: break
        i,p=found; used.add(i); pts.extend(p[1:]); cur=p[-1]
    return pts,used

def to_yards(pts,start,los_y):
    return [((p[0]-start[0])/PT,(p[1]-start[1])/PT) for p in pts]

def zigzag_end(pts):
    """The motion zigzag: a run of short segments that keep turning sharply back and forth. Curves do not."""
    def turn(i):
        a=(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); b=(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1])
        return math.degrees(math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]))
    sharp=[]  # indices of sharp turns between short segments
    for i in range(1,len(pts)-1):
        if dist(pts[i-1],pts[i])<16 and dist(pts[i],pts[i+1])<16 and abs(turn(i))>50: sharp.append(i)
    if len(sharp)<4: return None
    return sharp[-1]+1

def play_from_page(page, top=True, title=None):
    d=json.load(open(f'{SCR}/v{page:02d}.json'))
    H=d['h']; ymin,ymax=(H/2,H) if top else (0,H/2)
    players,segs,arrows=analyze_panel(d['recs'],ymin,ymax)
    out=[]
    # circles and square sorted by x; label 1..5 left to right for the unmirrored top panel
    for k,p in enumerate(players):
        pts,used=chain(p,segs)
        mot=None
        z=zigzag_end(pts)
        if z is not None:
            mot=pts[z]; pts=[pts[z]]+pts[z+1:]
        simp=pts   # keep every sampled point; the converter simplifies in yards
        out.append({'label':k+1,'kind':p['kind'],'color':p['color'],'start':p['c'],'motion_to':mot,'poly':simp,'n_raw':len(pts)})
    return out,players


PLAYS=[
 (4,3,"Smash / Double Slant","Man Coverage Beaters"),(5,5,"Slant / Flood","Man Coverage Beaters"),(6,7,"Slot-Fade / Post Wheel","Man Coverage Beaters"),
 (7,9,"Mesh","Man Coverage Beaters"),(8,11,"Seams / Drive Concept","Man Coverage Beaters"),(9,13,"Post-Corner / Dagger Concept","Man Coverage Beaters"),
 (10,15,"Post-Out / Trail Concept","Man Coverage Beaters"),
 (13,19,"Smash / Scissors","Cover 2 Zone Beaters"),(14,21,"3-Verticals","Cover 2 Zone Beaters"),(15,23,"Flood Concept","Cover 2 Zone Beaters"),
 (16,25,"4 Verticals","Cover 2 Zone Beaters"),(17,27,"Levels Concept","Cover 2 Zone Beaters"),(18,29,"Motion Flood Right","Cover 2 Zone Beaters"),
 (19,31,"Switch V-out / Switch Verticals","Cover 2 Zone Beaters"),
 (22,35,"Slant-Arrow / Flood","Cover 3 Zone Beaters"),(23,37,"4 Verticals","Cover 3 Zone Beaters"),(24,39,"Snag / Flood","Cover 3 Zone Beaters"),
 (25,41,"Smash / Post-Wheel","Cover 3 Zone Beaters"),(26,43,"Dagger Concept","Cover 3 Zone Beaters"),(27,45,"Snag-Dig Concept","Cover 3 Zone Beaters"),
 (28,47,"Slant-Arrow / Double Hitches","Cover 3 Zone Beaters"),
 (30,49,"Post-Wheel / Flood","Split Field Coverage Beaters"),(31,51,"Corner-Out / Drive Concept","Split Field Coverage Beaters"),
 (32,53,"V-Corner / Flood","Split Field Coverage Beaters"),(33,55,"Fade / Trail Concept","Split Field Coverage Beaters"),
 (35,57,"Post-Out & Up / Double Slants","Double Moves Concept"),(36,59,"Post-Corner / Levels Concept","Double Moves Concept"),(37,61,"Slant & Go / Corner-Post","Double Moves Concept"),
 (43,71,"Post-Wheel Right","Run Game & Play-Action"),(44,73,"Stalk & Go Left","Run Game & Play-Action"),(45,75,"Roll Out RPO Right","Run Game & Play-Action"),
]

LETTERS=['A','B','C','Y','Z']  # doc players 1,2,3,4,5 -> A,B,C(center),Y,Z
LOCK={ 'run':'Run Game & Play-Action' }
SECTIONS={'Man Coverage Beaters':('man','Man coverage beaters'),'Cover 2 Zone Beaters':('c2','Cover 2 beaters'),'Cover 3 Zone Beaters':('c3','Cover 3 beaters'),
          'Split Field Coverage Beaters':('split','Split-field beaters (stacked)'),'Double Moves Concept':('double','Double moves')}
def r1(v): return round(v*10)/10
def _dp(pts,tol):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]; dmax,idx=0,0
    for i in range(1,len(pts)-1):
        p=pts[i]; l=math.hypot(b[0]-a[0],b[1]-a[1])
        d=abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/l if l else math.hypot(p[0]-a[0],p[1]-a[1])
        if d>dmax: dmax,idx=d,i
    if dmax>tol: return _dp(pts[:idx+1],tol)[:-1]+_dp(pts[idx:],tol)
    return [a,b]
def simplify(pts_yd, tol=0.3):
    # drop zero-length steps, then Douglas-Peucker so gentle curves keep their shape
    clean=[pts_yd[0]]
    for p in pts_yd[1:]:
        if math.hypot(p[0]-clean[-1][0],p[1]-clean[-1][1])>0.05: clean.append(p)
    return _dp(clean,tol)
def token(dlat,dd):
    """direction of one segment: V vertical, B back, I diag-in, O diag-out, i horizontal in, o horizontal out"""
    L=math.hypot(dlat,dd)
    if abs(dd)<0.28*abs(dlat) : return 'o' if dlat>0 else 'i'
    if dd<0 and abs(dd)>0.28*abs(dlat) : return 'B'
    if abs(dlat)<0.32*abs(dd): return 'V'
    return 'O' if dlat>0 else 'I'
def classify(pts,center,curved):
    """Name a route from its shape. pts = [(lat,depth)] including the start. lat + = toward own sideline (center: + = right)."""
    segs=[(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]) for i in range(len(pts)-1)]
    toks=[token(*s) for s in segs]
    m=[]; dist=[]
    for t,sg in zip(toks,segs):
        if m and m[-1]==t: dist[-1]=(dist[-1][0]+sg[0],dist[-1][1]+sg[1])
        else: m.append(t); dist.append(sg)
    seq=''.join(m); D=max(p[1] for p in pts); stem=dist[0][1] if m[0]=='V' else 0
    total_lat=pts[-1][0]-pts[0][0]; last=dist[-1]
    if center:
        if seq=='VB' or seq=='B': return 'Hitch'
        if curved and abs(total_lat)>=6 and D>=8: return 'Wheel'
        if D>=11 and abs(total_lat)<=4: return 'Go'
        if abs(total_lat)>=2: return 'Flat' if D<=4.2 else 'Drag'
        return 'Hitch'
    if curved and abs(total_lat)>=4 and m[0]!='V' and D>=8 : return 'Wheel'
    if curved and abs(total_lat)>=4 and m[0]=='V' and m[-1] in 'VO' and D>=8: return 'Out & Up'
    # whole-route verticals (a release, then straight up the field)
    if m[-1]=='V' and abs(last[1])>=5 and (D>=10) and not (len(m)>=3 and m[1] in 'oi'):
        if len(m)>=2 and m[0] in 'IO' and abs(dist[0][0])>=2.4 and abs(dist[0][1])<=4.2: return 'Slant & Go' if m[0]=='I' else 'Corner & Go'
        return 'Seam' if total_lat<=-0.8 else 'Go'
    names={'V':'Go','VB':'Hitch' if D<=9 else 'Comeback','VI':'Slant' if stem<=4.8 else 'Post','VO':'Corner' if stem>=6 else ('Arrow' if abs(last[1])<=0.55*abs(last[0]) else 'Fade'),
           'Vo':'Speed Out' if D<=5.5 else 'Out','Vi':'Dig' if D>=6.5 else ('Cross' if D>=4.8 else 'Shallow'),'VIO':'Post-Corner','VOI':'Corner-Post','VIV':'Slant & Go' if stem<=4.8 else 'Post & Go',
           'VoV':'Out & Up','ViV':'In & Up','VOV':'Corner & Go','VIVO':'Post-Corner','VBV':'Hitch & Go','VOB':'Out & Back','VIB':'Snag','OV':'Go','IV':'Go',
           'I':'Slant','O':'Arrow','o':'Flat','i':'Shallow','B':'Hook','IO':'Corner','OI':'Trail','oI':'Trail','Oi':'Trail','OVi':'Dig','IB':'Snag','IOo':'V-Out'}
    if seq in names: return names[seq]
    return 'Route ('+seq+')'
OVERRIDE={(5,'B'):'Flat',(5,'C'):'Hitch',(9,'B'):'Mesh',(9,'Y'):'Mesh',(11,'Z'):'Drive',(15,'Y'):'Trail',(31,'A'):'V-Out',(49,'B'):'Wheel',
          (55,'A'):'Fade',(55,'B'):'Swing',(55,'Z'):'Trail',(57,'B'):'Out & Up',(61,'A'):'Slant & Go',(29,'B'):'Speed Out',(7,'B'):'Slot Fade',(27,'Y'):'Shallow',(31,'Z'):'Go'}
TREE={'Speed Out':1,'Slant':2,'Out':5,'Dig':6,'Corner':7,'Post':8,'Go':9,'Comeback':0}
def kind_of(pts,center):
    f=(pts[-1][0]-pts[-2][0],pts[-1][1]-pts[-2][1])
    if center: return 'in'
    if abs(f[0])<0.5*abs(f[1]): return 'vert'
    return 'out' if f[0]>0 else 'in'

out_plays=[]; report=[]
for page,num,name,section in PLAYS:
    if section.startswith('Run Game'): continue
    pl,players=play_from_page(page,top=True)
    sq=[p for p in players if p['kind']=='square'][0]; losy=sq['c'][1]; cx=sq['c'][0]
    # players sorted: doc 1,2 | 3 center | 4,5 ; players list is sorted left->right with center in the middle
    assert len(pl)==5, (page,len(pl))
    routes={}; motion=None
    stacked = section.startswith('Split')
    for k,o in enumerate(pl):
        letter=LETTERS[k]; center=(letter=='C')
        s=o['start']; mstart=o['motion_to']
        base=mstart or s
        side_left = base[0] < cx-3
        def conv(p):
            dx=(p[0]-base[0])/PT; dy=(p[1]-losy)/PT
            lat = dx if (center) else ((-dx) if side_left else dx)
            return (lat,dy)
        raw=[conv(p) for p in o['poly']]
        # drop the starting point itself (index 0 is `base`)
        pts=[(0.0,(base[1]-losy)/PT)]+raw[1:]
        curved=o['n_raw']>8
        sp=simplify(pts,0.3)
        nm=OVERRIDE.get((num,letter)) or classify(sp,center,curved)
        if nm=='Out' and (num,letter) not in OVERRIDE and False: pass
        key=(o['color'] in ('orange','red')) and not center
        wp=[[r1(a),r1(b)] for a,b in sp[1:]]
        tr=TREE.get(nm) if nm not in ('Seam',) else 9
        routes[letter]={'name':nm,'kind':kind_of(sp,center),'points':wp,'key':key}
        if tr is not None: routes[letter]['tree']=tr
        if center: routes[letter]['abs']=True
        if mstart:
            mx=180+(mstart[0]-cx)/PT*12; mdepth=(losy-mstart[1])/PT
            motion={'who':letter,'to':[round(mx),r1(mdepth)]}
    pid=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
    sec=SECTIONS[section][0]
    out_plays.append({'num':num,'id':f'{sec}-{pid}','name':name,'section':sec,'formation':'stacked' if stacked else 'dubs','motion':motion,'routes':routes})

SEC_INFO={'man':('Man coverage beaters','Plays built to beat man coverage.'),'c2':('Cover 2 beaters','Plays built to beat Cover 2 (two deep, four under).'),
          'c3':('Cover 3 beaters','Plays built to beat Cover 3 (three deep).'),'split':('Split-field beaters','From the stacked 2x2 set, built to beat split-field coverage.'),
          'double':('Double moves','Receivers fake one route, then break into another.')}
def note_for(name):
    if ' / ' in name:
        l,r=name.split(' / ',1); return f"Left side: {l}. Right side: {r}."
    return None
final=[]
for p in out_plays:
    entry={'id':p['id'],'name':p['name'],'section':p['section'],'formation':p['formation'],'motion':p['motion'],'routes':p['routes']}
    n=note_for(p['name'])
    if n: entry['note']=n
    final.append(entry)
doc={'_note':'Generated from the coach\'s 2x2 Attack System playbook PDF (top diagram of each pair; the mirror image is left out). Route points are [lateral yards toward the receiver\'s own sideline, depth yards from the line]. Centre routes have abs:true and measure lateral to the right. key marks the routes highlighted in the PDF.',
     'sections':[{'id':k,'name':v[0],'blurb':v[1]} for k,v in SEC_INFO.items()],'plays':final}
json.dump(doc,open(os.environ.get('PB_OUT','playbook_final.json'),'w'),indent=1)
for p in out_plays:
    print(f"#{p['num']} {p['name']} [{p['section']}] {p['formation']}" + (f" MOTION {p['motion']}" if p['motion'] else ''))
    for L in ['A','B','C','Y','Z']:
        r=p['routes'][L]; print(f"   {L} {'*' if r['key'] else ' '} {r['name']:16} {r['kind']:4} {r['points']}")
