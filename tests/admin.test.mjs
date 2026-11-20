import test from 'node:test';
import assert from 'node:assert/strict';
import { createGarageProfile } from '../src/garage-profile.js';
import { createDriveSlot, LINES, testLineBoard } from '../src/drive-slot.js';
import { SYMBOLS, advanceGarage, readGarage } from '../src/garage.js';

test('test profile isolates currency, parts and distance, even with a legacy career',()=>{
  const data=new Map([['suspension-lab.garage.v2','{"coins":90,"best":260}'],['suspension-lab.garage.v1.distance','284']]);
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const career=createGarageProfile(false,()=>storage), lab=createGarageProfile(true,()=>storage);
  assert.equal(career.load().coins,90);
  assert.deepEqual(lab.load(),readGarage(null));assert.equal(lab.peak(),0);
  const g=lab.load();g.coins=300;lab.save(g);lab.savePeak(550);
  assert.equal(lab.load().coins,300);assert.equal(lab.peak(),550);
  lab.save(readGarage(null));lab.clearTestPeak();
  assert.equal(career.load().coins,90);assert.equal(career.peak(),284);
  assert.deepEqual(lab.load(),readGarage(null));assert.equal(lab.peak(),0);
});

test('each admin combination settles once through the slot and pays precisely its line',()=>{
  for(let symbol=0;symbol<SYMBOLS.length;symbol++)for(let line=0;line<LINES.length;line++){
    const slot=createDriveSlot(), board=testLineBoard(symbol,line);
    slot.spin(0);slot.update(2,false);slot.hold(1);
    assert.ok(slot.spin(3,board));assert.equal(slot.locked,-1);
    assert.equal(slot.spin(3.1,board),false);assert.equal(slot.update(3.1,false),undefined);
    const reward=slot.update(5,false);assert.deepEqual(reward.lines,[LINES[line]]);
    const g=readGarage(null);advanceGarage(g,0,reward);
    if(symbol<8)assert.equal(g.points[symbol],2);
    assert.equal(g.coins,symbol===8?30:0);assert.equal(g.gems,symbol===9?3:0);
    assert.equal(slot.update(6,false),undefined);
  }
});
