// INITIAL_NODES positions from the file
const NODES = [
{i:0,f:'U',x:50,y:45.34},{i:1,f:'U',x:54.91,y:42.4},{i:2,f:'U',x:60.8,y:40.61},{i:3,f:'U',x:45.09,y:42.4},{i:4,f:'U',x:50,y:38.85},{i:5,f:'U',x:55.89,y:36.26},{i:6,f:'U',x:39.2,y:40.61},{i:7,f:'U',x:44.11,y:36.26},{i:8,f:'U',x:50,y:32.77},
{i:9,f:'R',x:59.23,y:61.33},{i:10,f:'R',x:59.32,y:67.05},{i:11,f:'R',x:57.93,y:73.05},{i:12,f:'R',x:64.23,y:58.55},{i:13,f:'R',x:64.85,y:64.57},{i:14,f:'R',x:64.15,y:70.97},{i:15,f:'R',x:68.73,y:54.34},{i:16,f:'R',x:70.04,y:60.77},{i:17,f:'R',x:70.12,y:67.62},
{i:18,f:'F',x:40.77,y:61.33},{i:19,f:'F',x:35.77,y:58.55},{i:20,f:'F',x:31.27,y:54.34},{i:21,f:'F',x:40.68,y:67.05},{i:22,f:'F',x:35.15,y:64.57},{i:23,f:'F',x:29.96,y:60.77},{i:24,f:'F',x:42.07,y:73.05},{i:25,f:'F',x:35.85,y:70.97},{i:26,f:'F',x:29.88,y:67.62},
{i:27,f:'D',x:50,y:83.81},{i:28,f:'D',x:45.09,y:86.75},{i:29,f:'D',x:39.2,y:88.53},{i:30,f:'D',x:54.91,y:86.75},{i:31,f:'D',x:50,y:90.29},{i:32,f:'D',x:44.11,y:92.89},{i:33,f:'D',x:60.8,y:88.53},{i:34,f:'D',x:55.89,y:92.89},{i:35,f:'D',x:50,y:96.38},
{i:36,f:'L',x:25.92,y:42.1},{i:37,f:'L',x:25.83,y:36.37},{i:38,f:'L',x:27.22,y:30.38},{i:39,f:'L',x:20.92,y:44.88},{i:40,f:'L',x:20.3,y:38.85},{i:41,f:'L',x:21,y:32.45},{i:42,f:'L',x:16.42,y:49.09},{i:43,f:'L',x:15.11,y:42.66},{i:44,f:'L',x:15.03,y:35.81},
{i:45,f:'B',x:74.08,y:42.1},{i:46,f:'B',x:79.08,y:44.88},{i:47,f:'B',x:83.58,y:49.09},{i:48,f:'B',x:74.17,y:36.37},{i:49,f:'B',x:79.7,y:38.85},{i:50,f:'B',x:84.89,y:42.66},{i:51,f:'B',x:72.78,y:30.38},{i:52,f:'B',x:79,y:32.45},{i:53,f:'B',x:84.97,y:35.81}
]
// group circle centers & the INNER radius (24.3)
const GC = { U:[50,38.85], R:[64.85,64.57], F:[35.15,64.57], D:[50,38.85], L:[64.85,64.57], B:[35.15,64.57] }
const INNER_R = 24.3
const OUTER_R = 35.1
const nm = n => n.f + (n.i - {U:0,R:9,F:18,D:27,L:36,B:45}[n.f])

const ROT_INNER = {
 U:[51,48,45,15,12,9,18,19,20,36,37,38],
 R:[33,30,27,24,21,18,0,1,2,45,46,47],
 F:[42,39,36,6,3,0,9,10,11,27,28,29],
 D:[26,25,24,11,14,17,47,50,53,44,43,42],
 L:[20,23,26,29,32,35,53,52,51,8,7,6],
 B:[2,5,8,38,41,44,35,34,33,17,16,15],
}
// D/L/B use the OUTER circle of the U/R/F group centers respectively.
const RADIUS = { U:INNER_R, R:INNER_R, F:INNER_R, D:OUTER_R, L:OUTER_R, B:OUTER_R }
for(const g of ['U','R','F','D','L','B']){
  const [cx,cy]=GC[g]
  const rr=RADIUS[g]
  const on = NODES.map(n=>({i:n.i,d:Math.hypot(n.x-cx,n.y-cy),ang:(Math.atan2(n.y-cy,n.x-cx)*180/Math.PI+360)%360}))
    .filter(n=>Math.abs(n.d-rr)<1.5).sort((a,b)=>a.ang-b.ang)
  const actualSet = new Set(on.map(n=>n.i))
  const got = ROT_INNER[g]
  const gotSet = new Set(got)
  const sameSet = actualSet.size===gotSet.size && [...actualSet].every(x=>gotSet.has(x))
  console.log('=== '+g+' INNER: set '+(sameSet?'OK':'MISMATCH')+' (radius '+rr+')')
  console.log('   actual (by angle):', on.map(n=>n.i).join(', '))
  console.log('   your array       :', got.join(', '))
}
