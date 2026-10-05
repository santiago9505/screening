import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const compiled=await build({entryPoints:['src/services/deskActivity.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {loadDeskReport,newestDeskReport,deskActivity,deskNavigationIndex}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const report={schemaVersion:1,session:'2026-10-02',nextSession:'2026-10-05',generatedAt:'2026-10-02T22:44:52Z',preview:false,complete:false,candidates:[],days:[],movements:[],alerts:[],prices:{},coverage:{},market:{},email:{},monitorStatus:{checkedAt:'2026-10-05T15:45:34Z',checks:[]}};
const response=value=>new Response(JSON.stringify(value),{status:200});

test('remote publications refresh local installs; newest fallback wins over stale CDN',async()=>{
  const old={...report,session:'2026-09-15',generatedAt:'2026-09-16T16:15:30Z',preview:true};
  const sources=['remote','local'];
  const remote=await loadDeskReport(sources,async url=>response(url==='remote'?report:old));
  assert.equal(remote.report.session,'2026-10-02');
  assert.equal(remote.remoteAvailable,true);
  const fallback=await loadDeskReport(sources,async url=>response(url==='remote'?old:report));
  assert.equal(fallback.report.session,'2026-10-02');
  const offline=await loadDeskReport(sources,async url=>{if(url==='remote')throw new Error('offline');return response(report);});
  assert.equal(offline.remoteAvailable,false);
  assert.equal(offline.report.session,'2026-10-02');
  await assert.rejects(loadDeskReport(sources,async()=>response({schemaVersion:1,candidates:[]})),/No se pudo cargar/);
});

test('refresh cannot roll back a closed session or intraday monitor changes',()=>{
  const olderMonitor={...report,monitorStatus:{checkedAt:'2026-10-05T15:00:00Z',checks:[]}};
  assert.equal(newestDeskReport(report,olderMonitor),report);
  assert.equal(newestDeskReport(report,{...report,preview:true,generatedAt:'2026-10-02T23:00:00Z'}),report);
  assert.equal(newestDeskReport(report,{...report,session:'2026-10-01',monitorStatus:{checkedAt:'2026-10-05T16:00:00Z'}}),report);
  const latest={...report,monitorStatus:{checkedAt:'2026-10-05T16:00:00Z',checks:[]}};
  assert.equal(newestDeskReport(report,latest),latest);
});

test('Friday close is current on weekends and Monday until the nightly job is due',()=>{
  for(const at of ['2026-10-03T16:00:00Z','2026-10-05T16:00:00Z','2026-10-05T23:30:00Z']) {
    assert.equal(deskActivity(report,new Date(at)).outdated,false,at);
  }
  assert.equal(deskActivity(report,new Date('2026-10-05T23:38:00Z')).outdated,true);
  assert.equal(deskActivity(report,new Date('2026-10-06T14:00:00Z')).outdated,true);
  const christmas={...report,session:'2026-12-24',generatedAt:'2026-12-24T22:44:00Z'};
  assert.equal(deskActivity(christmas,new Date('2026-12-28T15:00:00Z')).outdated,false);
  assert.equal(deskActivity(report,new Date('2028-01-03T16:00:00Z')).calendarKnown,false);
});

test('a zero-check monitor heartbeat is distinguished from missing recent activity',()=>{
  const recent=deskActivity(report,new Date('2026-10-05T16:00:00Z'));
  assert.equal(recent.armed,0);
  assert.equal(recent.monitorRecent,true);
  assert.equal(recent.marketOpen,true);
  assert.equal(deskActivity(report,new Date('2026-10-05T17:00:00Z')).monitorRecent,false);
  assert.equal(deskActivity(report,new Date('2026-10-05T22:00:00Z')).marketOpen,false);
  assert.equal(deskActivity({...report,monitorStatus:null},new Date('2026-10-05T16:00:00Z')).monitorRecent,false);
});

test('keyboard navigation respects list bounds, reverse space, empty and filtered lists',()=>{
  assert.equal(deskNavigationIndex(0,3,'Space'),1);
  assert.equal(deskNavigationIndex(1,3,'Space',true),0);
  assert.equal(deskNavigationIndex(2,3,'ArrowDown'),2);
  assert.equal(deskNavigationIndex(0,3,'ArrowUp'),0);
  assert.equal(deskNavigationIndex(-1,3,'Space'),0);
  assert.equal(deskNavigationIndex(0,1,'Space'),0);
  assert.equal(deskNavigationIndex(-1,0,'Space'),-1);
  assert.equal(deskNavigationIndex(0,3,'Enter'),-1);
});
